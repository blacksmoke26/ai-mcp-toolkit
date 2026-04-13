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
 * | DELETE | `/chat/conversations/:id` | Delete a conversation |
 */
import { nanoid } from 'nanoid';
import { logger } from '@/utils/logger.js';
import { runAgentLoop } from '@/llm/agent.js';
import { llmRegistry } from '@/llm/registry.js';
import { Conversation, Message, Provider } from '@/db/index.js';

// types
import type { FastifyPluginAsync } from 'fastify';

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /chat
   * Send a message to the agent and receive a complete response.
   *
   * The agent will automatically use tools as needed.
   *
   * ## Request Body
   * ```json
   * {
   *   "messages": [{ "role": "user", "content": "What time is it?" }],
   *   "conversationId": "optional-existing-id",
   *   "provider": "optional-provider-name",
   *   "model": "optional-model-name",
   *   "temperature": 0.7,
   *   "maxTokens": 4096,
   *   "maxIterations": 10
   * }
   * ```
   */
  fastify.post('/chat', async (request, reply) => {
    const body = request.body as {
      messages?: Array<{ role: string; content: string }>;
      message?: string;
      conversationId?: string;
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      maxIterations?: number;
    };

    // Get or create provider
    let provider;
    if (body.provider) {
      provider = llmRegistry.get(body.provider);
      if (!provider) {
        return reply.code(404).send({ error: `Provider "${body.provider}" not found` });
      }
    } else {
      provider = llmRegistry.getDefault();
    }

    // Build message history
    let messages = body.messages || [];
    if (body.message) {
      messages = [{ role: 'user', content: body.message }];
    }

    if (messages.length === 0) {
      return reply.code(400).send({ error: 'No messages provided. Send "messages" array or "message" string.' });
    }

    // Get or create conversation
    let conversationId = body.conversationId;
    let conversation: Conversation | null = null;

    if (conversationId) {
      conversation = await Conversation.findOne({ where: { conversationId } });
    }

    if (!conversation) {
      conversationId = nanoid(16);
      const dbProvider = await Provider.findOne({ where: { isDefault: true } });
      conversation = await Conversation.create({
        conversationId,
        providerId: dbProvider?.id ?? 1,
        modelName: body.model || provider.config.defaultModel,
        title: messages[0]?.content?.slice(0, 100) || 'New Conversation',
        status: 'active',
      });
    }

    // Load existing messages if continuing a conversation
    const existingMessages = await Message.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']],
    });

    const chatHistory = [
      ...existingMessages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant' | 'tool', content: m.content })),
      ...messages.map((m) => ({ role: m.role as 'system' | 'user' | 'assistant' | 'tool', content: m.content })),
    ];

    // Run the agent loop
    try {
      const startTime = Date.now();
      const result = await runAgentLoop({
        provider,
        messages: chatHistory,
        maxIterations: body.maxIterations || 10,
        generationParams: {
          temperature: body.temperature,
          maxTokens: body.maxTokens,
        },
      });

      const elapsed = Date.now() - startTime;

      // Save messages to database
      for (const msg of messages) {
        await Message.create({
          conversationId: conversation.id,
          role: msg.role as 'system' | 'user' | 'assistant' | 'tool',
          content: msg.content,
        });
      }
      await Message.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: result.content,
        tokenCount: result.totalTokens.total,
      });

      // Save tool call results
      for (const tc of result.toolCallsMade) {
        await Message.create({
          conversationId: conversation.id,
          role: 'tool',
          content: tc.result,
          toolName: tc.name,
        });
      }

      logger.info({
        conversationId,
        iterations: result.iterations,
        toolCalls: result.toolCallsMade.length,
        tokens: result.totalTokens.total,
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
      logger.error({ err, conversationId }, 'Agent loop failed');
      return reply.code(500).send({
        error: 'Agent loop failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /chat/stream
   * Stream the agent's response via Server-Sent Events.
   *
   * Works identically to POST /chat, but streams partial content
   * as it's generated.
   */
  fastify.post('/chat/stream', async (request, reply) => {
    const body = request.body as {
      messages?: Array<{ role: string; content: string }>;
      message?: string;
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    };

    let provider;

    if (body.provider) {
      provider = llmRegistry.get(body.provider);
    } else {
      provider = llmRegistry.getDefault();
    }

    if (!provider) {
      return reply.code(500).send({ error: 'No LLM provider available' });
    }

    let messages = body.messages || [];
    if (body.message) {
      messages = [{ role: 'user', content: body.message }];
    }

    // Set up SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    try {
      // Run the agent loop with iteration callbacks to stream intermediate results
      const result = await runAgentLoop({
        provider,
        messages: messages.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant' | 'tool',
          content: m.content,
        })),
        maxIterations: 10,
        generationParams: {
          temperature: body.temperature,
          maxTokens: body.maxTokens,
        },
        onIteration: (iteration) => {
          // Stream intermediate results for tool calls
          if (iteration.toolResults.length > 0) {
            reply.raw.write(
              `event: tool_call\ndata: ${JSON.stringify({
                iteration: iteration.index,
                tools: iteration.toolResults.map((t) => ({
                  name: t.name,
                  success: t.success,
                })),
              })}\n\n`
            );
          }
        },
      });

      // Send final result
      reply.raw.write(
        `event: result\ndata: ${JSON.stringify({
          content: result.content,
          iterations: result.iterations,
          toolCalls: result.toolCallsMade.length,
          tokens: result.totalTokens,
        })}\n\n`
      );

      reply.raw.write('event: done\ndata: {}\n\n');
    } catch (err) {
      reply.raw.write(
        `event: error\ndata: ${JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        })}\n\n`
      );
    }

    return reply.hijack();
  });

  /**
   * GET /chat/conversations
   * List all conversations, ordered by most recent.
   */
  fastify.get('/chat/conversations', async (request, reply) => {
    const conversations = await Conversation.findAll({
      where: { status: 'active' },
      order: [['updatedAt', 'DESC']],
      include: [{ model: Message, as: 'messages', limit: 1, order: [['createdAt', 'DESC']] }],
    });

    return reply.send({
      conversations: conversations.map((c: Conversation) => ({
        id: c.conversationId,
        title: c.title,
        model: c.modelName,
        lastMessage: c.messages?.[0]?.content?.slice(0, 200),
        updatedAt: c.updatedAt,
      })),
    });
  });

  /**
   * GET /chat/conversations/:id
   * Get a full conversation with all messages.
   */
  fastify.get('/chat/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await Conversation.findOne({
      where: { conversationId: id },
      include: [{ model: Message, as: 'messages', order: [['createdAt', 'ASC']] }],
    });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    return reply.send({
      id: conversation.conversationId,
      title: conversation.title,
      model: conversation.modelName,
      messages: conversation.messages?.map((m: Message) => ({
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        createdAt: m.createdAt,
      })),
    });
  });

  /**
   * DELETE /chat/conversations/:id
   * Soft-delete a conversation.
   */
  fastify.delete('/chat/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await Conversation.findOne({ where: { conversationId: id } });

    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    await conversation.update({ status: 'deleted' });
    return reply.send({ status: 'deleted', id });
  });
};
