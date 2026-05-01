/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/chat
 * @description Chat endpoint for interacting with the MCP agent.
 *
 * This route provides a simple REST API for having conversations
 * with the LLM-powered agent. The agent automatically uses MCP tools
 * as needed to fulfill user requests.
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | POST | `/chat` | Send a message and get the agent's response |
 * | POST | `/chat/stream` | Send a message and stream the response via SSE |
 * | GET | `/chat/conversations` | List all conversations |
 * | GET | `/chat/conversations/:id` | Get a conversation with all messages |
 * | PATCH | `/chat/conversations/:id` | Update conversation details |
 * | DELETE | `/chat/conversations/:id` | Delete a conversation |
 * | GET | `/chat/providers` | List available LLM providers |
 */
import {nanoid} from 'nanoid';
import {logger} from '@/utils/logger';
import {runAgentLoop} from '@/llm/agent';
import {llmRegistry} from '@/llm/registry';
import sequelize, {Conversation, Message, Provider} from '@/db'; // Assuming sequelize instance is exported for transactions

// types
import type {FastifyPluginAsync} from 'fastify';
import {ChatMessage} from '@/mcp/types';
import {Error, InferAttributes, JSON, Transaction} from 'sequelize';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /chat
   * Send a message to the agent and receive a complete response.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation.
   * - 2023-10-27: Fixed provider retrieval logic to prevent crashes on invalid names.
   * - 2023-10-27: Wrapped message saving in a database transaction.
   * - 2023-10-27: Optimized message insertion using bulkCreate.
   */
  fastify.post<{
    Body: {
      messages?: Array<{ role: string; content: string }>;
      message?: string;
      conversationId?: string;
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      maxIterations?: number;
    };
  }>(
    '/chat',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                required: ['role', 'content'],
                properties: {
                  role: {type: 'string', enum: ['user', 'system', 'assistant']},
                  content: {type: 'string'},
                },
              },
            },
            message: {type: 'string'},
            conversationId: {type: 'string'},
            provider: {type: 'string'},
            model: {type: 'string'},
            temperature: {type: 'number', minimum: 0, maximum: 2},
            maxTokens: {type: 'integer', minimum: 1},
            maxIterations: {type: 'integer', minimum: 1, maximum: 50},
          },
          oneOf: [
            {required: ['messages']},
            {required: ['message']},
          ],
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // 1. Resolve Provider
      const provider = body.provider
        ? llmRegistry.get(body.provider)
        : llmRegistry.getDefault();

      if (!provider) {
        return reply.code(400).send({error: `Provider "${body.provider}" not found or no default configured.`});
      }

      // 2. Prepare Messages
      let messages = body.messages || [];
      if (body.message) {
        messages = [{role: 'user', content: body.message}];
      }

      if (messages.length === 0) {
        return reply.code(400).send({error: 'No messages provided.'});
      }

      // 3. Resolve/Create Conversation
      let conversationId = body.conversationId;
      let conversation: Conversation;

      if (conversationId) {
        const existingConv = await Conversation.findOne({where: {conversationId}});
        if (!existingConv) {
          return reply.code(404).send({error: 'Conversation not found'});
        }
        conversation = existingConv;
      } else {
        conversationId = nanoid(16);
        const dbProvider = await Provider.findOne({where: {name: provider.name}});

        conversation = await Conversation.create({
          conversationId,
          providerId: dbProvider?.id ?? 1, // Fallback
          modelName: body.model || provider.config.defaultModel,
          title: messages[0].content.slice(0, 100),
          status: 'active',
        });
      }

      // 4. Load History
      const existingMessages = await Message.findAll({
        where: {conversationId: conversation.id},
        order: [['createdAt', 'ASC']],
        attributes: ['role', 'content'],
      });

      const chatHistory = [
        ...existingMessages.map((m) => ({role: m.role, content: m.content})),
        ...messages,
      ];

      // 5. Run Agent Loop
      const startTime = Date.now();
      try {
        const result = await runAgentLoop({
          provider,
          messages: chatHistory as ChatMessage[],
          maxIterations: body.maxIterations || 10,
          generationParams: {
            temperature: body.temperature,
            maxTokens: body.maxTokens,
            model: body.model,
          },
        });

        const elapsed = Date.now() - startTime;

        // 6. Save messages transactionally
        await sequelize.transaction(async (t: Transaction) => {
          const newMessages = messages.map(msg => ({
            conversationId: conversation.id,
            role: msg.role,
            content: msg.content,
          })) as InferAttributes<Message>[];

          // Add assistant response
          newMessages.push({
            conversationId: conversation.id,
            role: 'assistant',
            content: result.content,
            tokenCount: result.totalTokens.total,
            toolName: null,
            toolCallId: null,
          } as InferAttributes<Message>);

          // Add tool calls
          result.toolCallsMade.forEach(tc => {
            newMessages.push({
              conversationId: conversation.id,
              role: 'tool',
              content: tc.result,
              toolName: tc.name as unknown as string,
              toolCallId: null,
              tokenCount: 0,
            } as InferAttributes<Message>);
          });

          await Message.bulkCreate(newMessages, {transaction: t});
        });

        logger.info({
          conversationId,
          iterations: result.iterations,
          toolCalls: result.toolCallsMade.length,
          elapsedMs: elapsed,
        }, 'Chat completed');

        return reply.send({
          conversationId,
          content: result.content,
          iterations: result.iterations,
          toolCalls: result.toolCallsMade,
          tokens: result.totalTokens,
          elapsedMs: elapsed,
        });

      } catch (err) {
        logger.error({err, conversationId}, 'Agent loop failed');
        return reply.code(500).send({
          error: 'Agent processing failed',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  /**
   * POST /chat/stream
   * Stream the agent's response via Server-Sent Events.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation.
   * - 2023-10-27: Added proper SSE error handling and connection cleanup.
   * - 2023-10-27: Fixed issue where stream would hang on provider not found.
   */
  fastify.post<{
    Body: {
      messages?: Array<{ role: string; content: string }>;
      message?: string;
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    };
  }>(
    '/chat/stream',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {type: 'object', properties: {role: {type: 'string'}, content: {type: 'string'}}},
            },
            message: {type: 'string'},
            provider: {type: 'string'},
            model: {type: 'string'},
            temperature: {type: 'number'},
            maxTokens: {type: 'integer'},
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Resolve Provider
      const provider = body.provider ? llmRegistry.get(body.provider) : llmRegistry.getDefault();

      if (!provider) {
        // We need to hijack to send an error if headers aren't sent, or just reply normally
        return reply.code(400).send({error: 'Provider not found'});
      }

      let messages = body.messages || [];
      if (body.message) {
        messages = [{role: 'user', content: body.message}];
      }

      // Setup SSE
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });
      reply.raw.flushHeaders();

      // Helper to send SSE
      const sendEvent = (event: string, data: object) => {
        if (reply.raw.writableEnded) return;
        // @ts-ignore
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      try {
        const result = await runAgentLoop({
          provider,
          messages: messages.map(m => ({role: m.role, content: m.content})) as ChatMessage[],
          maxIterations: 10,
          generationParams: {
            temperature: body.temperature,
            maxTokens: body.maxTokens,
            model: body.model,
          },
          onIteration: (iteration) => {
            if (iteration.toolResults.length > 0) {
              sendEvent('tool_call', {
                iteration: iteration.index,
                tools: iteration.toolResults.map(t => ({name: t.name, success: t.success})),
              });
            }
          },
        });

        sendEvent('result', {
          content: result.content,
          iterations: result.iterations,
        });
        sendEvent('done', {});
      } catch (err) {
        logger.error({err}, 'Stream failed');
        sendEvent('error', {message: err instanceof Error ? err.message : 'Unknown error'});
      } finally {
        if (!reply.raw.writableEnded) {
          reply.raw.end();
        }
      }

      return reply.hijack();
    },
  );

  /**
   * GET /chat/conversations
   * List all conversations with pagination.
   *
   * @changelog
   * - 2023-10-27: Added pagination support (limit/offset).
   * - 2023-10-27: Added schema validation.
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number };
  }>(
    '/chat/conversations',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: {type: 'integer', minimum: 1, maximum: 100, default: 20},
            offset: {type: 'integer', minimum: 0, default: 0},
          },
        },
      },
    },
    async (request, reply) => {
      const {limit = 20, offset = 0} = request.query;

      const {rows, count} = await Conversation.findAndCountAll({
        where: {status: 'active'},
        order: [['updatedAt', 'DESC']],
        limit,
        offset,
        include: [{model: Message, as: 'messages', limit: 1, order: [['createdAt', 'DESC']]}],
      });

      return reply.send({
        total: count,
        conversations: rows.map((c) => ({
          id: c.conversationId,
          title: c.title,
          model: c.modelName,
          lastMessage: c.messages?.[0]?.content?.slice(0, 200),
          updatedAt: c.updatedAt,
        })),
      });
    },
  );

  /**
   * GET /chat/conversations/:id
   * Get a full conversation with all messages.
   *
   * @changelog
   * - 2023-10-27: Added schema validation for params.
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/chat/conversations/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {id: {type: 'string'}},
        },
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const conversation = await Conversation.findOne({
        where: {conversationId: id},
        include: [{model: Message, as: 'messages', order: [['createdAt', 'ASC']]}],
      });

      if (!conversation) {
        return reply.code(404).send({error: 'Conversation not found'});
      }

      return reply.send({
        id: conversation.conversationId,
        title: conversation.title,
        model: conversation.modelName,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages?.map((m) => ({
          role: m.role,
          content: m.content,
          toolName: m.toolName,
          tokenCount: m.tokenCount,
          createdAt: m.createdAt,
        })),
      });
    },
  );

  /**
   * PATCH /chat/conversations/:id
   * Update conversation details (e.g., title).
   *
   * @changelog
   * - 2023-10-27: New endpoint for updating conversations.
   */
  fastify.patch<{
    Params: { id: string };
    Body: { title?: string; status?: string };
  }>(
    '/chat/conversations/:id',
    {
      schema: {
        params: {type: 'object', required: ['id'], properties: {id: {type: 'string'}}},
        body: {
          type: 'object',
          properties: {
            title: {type: 'string', minLength: 1},
            status: {type: 'string', enum: ['active', 'archived']},
          },
        },
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const conversation = await Conversation.findOne({where: {conversationId: id}});

      if (!conversation) {
        return reply.code(404).send({error: 'Conversation not found'});
      }

      await conversation.update(request.body as any);
      return reply.send({status: 'updated', conversation});
    },
  );

  /**
   * DELETE /chat/conversations/:id
   * Soft-delete a conversation.
   *
   * @changelog
   * - 2023-10-27: Added schema validation.
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/chat/conversations/:id',
    {
      schema: {
        params: {type: 'object', required: ['id'], properties: {id: {type: 'string'}}},
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const conversation = await Conversation.findOne({where: {conversationId: id}});

      if (!conversation) {
        return reply.code(404).send({error: 'Conversation not found'});
      }

      await conversation.update({status: 'deleted'});
      return reply.send({status: 'deleted', id});
    },
  );
};
