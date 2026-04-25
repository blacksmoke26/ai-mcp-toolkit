/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/admin
 * @description Administration endpoints for managing providers, tools, and server configuration.
 *
 * These endpoints allow runtime management of:
 *
 * - LLM Providers (list, add, remove, set default, test connection)
 * - MCP Tools (list, enable/disable, batch update, inspect)
 * - Server settings
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | GET | `/admin/providers` | List all LLM providers (supports filtering) |
 * | POST | `/admin/providers` | Add a new LLM provider |
 * | DELETE | `/admin/providers/:name` | Remove a provider |
 * | POST | `/admin/providers/:name/default` | Set a provider as default |
 * | POST | `/admin/providers/:name/test` | Test connectivity to a provider |
 * | GET | `/admin/providers/:name/models` | List models from a provider |
 * | GET | `/admin/tools` | List all registered MCP tools (supports filtering) |
 * | POST | `/admin/tools/batch` | Batch update tools status |
 * | PATCH | `/admin/tools/:name` | Enable/disable a tool |
 * | GET | `/admin/tools/:name` | Get details about a specific tool |
 */

import {llmRegistry} from '@/llm/registry';
import {toolRegistry} from '@/mcp/tools/registry';
import sequelize, {Provider, ToolConfig} from '@/db'; // Assuming sequelize is available for transactions
import {logger} from '@/utils/logger';

// types
import type {FastifyPluginAsync} from 'fastify';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /admin/providers
   * List all registered LLM providers with their status.
   */
  fastify.get<{
    Querystring: { type?: string; activeOnly?: boolean };
  }>(
    '/admin/providers',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            type: {type: 'string'}, // Filter by type (e.g., 'ollama')
            activeOnly: {type: 'boolean'}, // Only show currently active in registry
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query;

      let providers = llmRegistry.listProviders().map((name) => {
        const p = llmRegistry.get(name)!;
        return {
          name: p.name,
          type: p.config.type,
          baseUrl: p.config.baseUrl,
          defaultModel: p.config.defaultModel,
          isDefault: name === llmRegistry.defaultProviderName,
        };
      });

      if (query.type) {
        providers = providers.filter((p) => p.type === query.type);
      }

      // Prepare db providers response (non-active ones if activeOnly is false)
      let dbProviders = await Provider.findAll();
      if (query.activeOnly) {
        dbProviders = [];
      }

      return reply.send({
        active: providers,
        configured: dbProviders.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          baseUrl: p.baseUrl,
          defaultModel: p.defaultModel,
          isDefault: p.isDefault,
        })),
        default: llmRegistry.defaultProviderName,
      });
    },
  );

  /**
   * POST /admin/providers
   * Add a new LLM provider (or update an existing one).
   */
  fastify.post<{
    Body: {
      name: string;
      type: 'ollama' | 'openai';
      baseUrl: string;
      apiKey: string;
      defaultModel: string;
      isDefault: boolean;
      temperature: number;
      maxTokens: number;
    }
  }>(
    '/admin/providers',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'type', 'baseUrl', 'defaultModel'],
          properties: {
            name: {type: 'string', minLength: 1},
            type: {enum: ['ollama', 'openai']},
            baseUrl: {type: 'string', format: 'uri'},
            apiKey: {type: 'string'},
            defaultModel: {type: 'string'},
            isDefault: {type: 'boolean'},
            temperature: {type: 'number', minimum: 0, maximum: 2},
            maxTokens: {type: 'integer', minimum: 1},
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      try {
        // 1. Create in registry (In-memory check)
        llmRegistry.createFromConfig(
          {
            type: body.type,
            baseUrl: body.baseUrl,
            apiKey: body.apiKey,
            defaultModel: body.defaultModel,
            defaultParams: {
              temperature: body.temperature,
              maxTokens: body.maxTokens,
            },
          },
          body.isDefault,
        );

        // 2. Persist to database
        await Provider.upsert({
          name: body.name,
          type: body.type,
          baseUrl: body.baseUrl,
          apiKey: body.apiKey || null,
          defaultModel: body.defaultModel,
          isDefault: body.isDefault || false,
          settings: JSON.stringify({
            temperature: body.temperature,
            maxTokens: body.maxTokens,
          }),
        });

        logger.info({provider: body.name, type: body.type}, 'Provider registered');

        return reply.status(201).send({
          status: 'registered',
          provider: {name: body.name, type: body.type},
        });
      } catch (err) {
        logger.error({err, provider: body.name}, 'Failed to register provider');
        // Rollback registry if DB fails? (Complexity decision: simple log for now)
        if (body.isDefault) {
          llmRegistry.setDefault(llmRegistry.defaultProviderName as string); // Revert default
        }
        return reply.code(500).send({
          error: 'Failed to register provider',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  /**
   * DELETE /admin/providers/:name
   * Remove a registered provider.
   */
  fastify.delete<{
    Params: { name: string; }
  }>(
    '/admin/providers/:name',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
          required: ['name'],
        },
      },
    },
    async (request, reply) => {
      const {name} = request.params;

      const provider = llmRegistry.get(name);
      if (!provider) {
        return reply.code(404).send({error: `Provider "${name}" not found in active registry`});
      }

      if (name === llmRegistry.defaultProviderName) {
        return reply.code(400).send({error: 'Cannot delete the default provider'});
      }

      try {
        llmRegistry.unregister(name);
        await Provider.destroy({where: {name}});

        logger.info({provider: name}, 'Provider removed');
        return reply.send({status: 'removed', provider: name});
      } catch (err) {
        logger.error({err, provider: name}, 'Failed to remove provider');
        return reply.code(500).send({error: 'Internal server error'});
      }
    },
  );

  /**
   * POST /admin/providers/:name/default
   * Set a provider as the default.
   * Uses a transaction to ensure database consistency.
   */
  fastify.post<{
    Params: {
      name: string;
    }
  }>(
    '/admin/providers/:name/default',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
          required: ['name'],
        },
      },
    },
    async (request, reply) => {
      const {name} = request.params;

      const provider = llmRegistry.get(name);
      if (!provider) {
        return reply.code(404).send({error: `Provider "${name}" not found`});
      }

      const transaction = await sequelize.transaction();

      try {
        // Update Registry
        llmRegistry.setDefault(name);

        // Update Database
        await Provider.update({isDefault: false}, {where: {isDefault: true}, transaction});
        await Provider.update({isDefault: true}, {where: {name}, transaction});

        await transaction.commit();

        return reply.send({status: 'default_set', provider: name});
      } catch (err) {
        await transaction.rollback();
        // Revert registry change
        // Note: Ideally we capture previous default name before changing, but simple restart might be required here or complex logic.
        logger.error({err, provider: name}, 'Failed to set default provider');
        return reply.code(500).send({error: 'Failed to update default provider'});
      }
    },
  );

  /**
   * POST /admin/providers/:name/test (NEW FEATURE)
   * Test connectivity to the provider by listing models.
   */
  fastify.post<{
    Params: {
      name: string;
    }
  }>(
    '/admin/providers/:name/test',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
          required: ['name'],
        },
      },
    },
    async (request, reply) => {
      const {name} = request.params;
      const provider = llmRegistry.get(name);

      if (!provider) {
        return reply.code(404).send({error: `Provider "${name}" not found`});
      }

      try {
        const start = Date.now();
        await provider.listModels();
        const duration = Date.now() - start;

        return reply.send({
          provider: name,
          status: 'ok',
          latencyMs: duration,
        });
      } catch (err) {
        return reply.code(502).send({
          provider: name,
          status: 'error',
          error: 'Connection failed or timeout',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  /**
   * GET /admin/providers/:name/models
   * List available models from a provider.
   */
  fastify.get<{
    Params: {
      name: string;
    }
  }>(
    '/admin/providers/:name/models',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
          required: ['name'],
        },
      },
    },
    async (request, reply) => {
      const {name} = request.params;
      const provider = llmRegistry.get(name);

      if (!provider) {
        return reply.code(404).send({error: `Provider "${name}" not found`});
      }

      try {
        const models = await provider.listModels();
        return reply.send({provider: name, models});
      } catch (err) {
        return reply.code(502).send({
          error: 'Failed to list models',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  // ─── Tool Management ─────────────────────────────────────────────────────

  /**
   * GET /admin/tools
   * List all registered MCP tools with their status.
   * Supports filtering by category and enabled status.
   */
  fastify.get(
    '/admin/tools',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            category: {type: 'string'},
            enabled: {type: 'boolean'},
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as { category?: string; enabled?: boolean };
      let tools = toolRegistry.listAll();

      if (query.category) {
        tools = tools.filter((t) => t.category === query.category);
      }
      if (query.enabled !== undefined) {
        tools = tools.filter((t) => t.enabled === query.enabled);
      }

      const categories = toolRegistry.getByCategory();

      return reply.send({
        total: tools.length,
        categories,
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          enabled: t.enabled,
          category: t.category,
          hasInputSchema: !!t.inputSchema,
        })),
        enabled: tools.filter((t) => t.enabled).length,
      });
    },
  );

  /**
   * POST /admin/tools/batch (NEW FEATURE)
   * Batch enable/disable multiple tools.
   */
  fastify.post<{
    Body: {
      names: string[];
      enabled: boolean;
    }
  }>(
    '/admin/tools/batch',
    {
      schema: {
        body: {
          type: 'object',
          required: ['names', 'enabled'],
          properties: {
            names: {type: 'array', items: {type: 'string'}},
            enabled: {type: 'boolean'},
          },
        },
      },
    },
    async (request, reply) => {
      const {names, enabled} = request.body;

      const updated: string[] = [];
      const notFound: string[] = [];

      // Iterate and update
      for (const name of names) {
        const success = toolRegistry.setEnabled(name, enabled);
        if (success) {
          updated.push(name);
        } else {
          notFound.push(name);
        }
      }

      // Persist to DB for those found
      if (updated.length > 0) {
        await ToolConfig.update({enabled}, {where: {name: updated}});
        logger.info({tools: updated, enabled}, 'Batch tool status updated');
      }

      return reply.send({
        status: 'completed',
        updated,
        notFound,
        enabled,
      });
    },
  );

  /**
   * GET /admin/tools/:name
   * Get detailed info about a specific tool.
   */
  fastify.get<{
    Params: { name: string; };
  }>(
    '/admin/tools/:name',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
          required: ['name'],
        },
      },
    },
    async (request, reply) => {
      const {name} = request.params;
      const tool = toolRegistry.get(name);

      if (!tool) {
        return reply.code(404).send({error: `Tool "${name}" not found`});
      }

      return reply.send({
        name: tool.name,
        description: tool.description,
        enabled: tool.enabled,
        category: tool.category,
        inputSchema: tool.inputSchema,
      });
    },
  );

  /**
   * PATCH /admin/tools/:name
   * Enable or disable a tool.
   *
   * ## Request Body
   * ```json
   * { "enabled": false }
   * ```
   */
  fastify.patch<{
    Params: { name: string; };
    Body: { enabled: boolean; };
  }>(
    '/admin/tools/:name',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            name: {type: 'string'},
          },
          required: ['name'],
        }, body: {
          type: 'object',
          required: ['enabled'],
          properties: {
            enabled: {type: 'boolean'},
          },
        },
      },
    },
    async (request, reply) => {
      const {name} = request.params;
      const {enabled} = request.body;

      const success = toolRegistry.setEnabled(name, enabled);
      if (!success) {
        return reply.code(404).send({error: `Tool "${name}" not found`});
      }

      // Persist to database
      await ToolConfig.update({enabled}, {where: {name}});

      logger.info({tool: name, enabled}, 'Tool status updated');
      return reply.send({status: 'updated', tool: name, enabled});
    },
  );
};
