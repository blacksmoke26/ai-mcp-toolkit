/**
 * @module server/routes/admin
 * @description Administration endpoints for managing providers, tools, and server configuration.
 *
 * These endpoints allow runtime management of:
 *
 * - LLM Providers (list, add, remove, set default)
 * - MCP Tools (list, enable/disable, inspect)
 * - Server settings
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | GET | `/admin/providers` | List all LLM providers |
 * | POST | `/admin/providers` | Add a new LLM provider |
 * | DELETE | `/admin/providers/:name` | Remove a provider |
 * | POST | `/admin/providers/:name/default` | Set a provider as default |
 * | GET | `/admin/providers/:name/models` | List models from a provider |
 * | GET | `/admin/tools` | List all registered MCP tools |
 * | PATCH | `/admin/tools/:name` | Enable/disable a tool |
 * | GET | `/admin/tools/:name` | Get details about a specific tool |
 */

import { llmRegistry } from '@/llm/registry.js';
import { toolRegistry } from '@/mcp/tools/registry.js';
import { Provider, ToolConfig } from '@/db/index.js';
import { logger } from '@/utils/logger.js';

// types
import type { FastifyPluginAsync } from 'fastify';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Provider Management ─────────────────────────────────────────────────

  /**
   * GET /admin/providers
   * List all registered LLM providers with their status.
   */
  fastify.get('/admin/providers', async (_request, reply) => {
    const providers = llmRegistry.listProviders().map((name) => {
      const p = llmRegistry.get(name)!;
      return {
        name: p.name,
        type: p.config.type,
        baseUrl: p.config.baseUrl,
        defaultModel: p.config.defaultModel,
        isDefault: name === llmRegistry.defaultProviderName,
      };
    });

    // Also check database providers
    const dbProviders = await Provider.findAll();

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
  });

  /**
   * POST /admin/providers
   * Add a new LLM provider (or update an existing one).
   *
   * ## Request Body
   * ```json
   * {
   *   "name": "my-provider",
   *   "type": "ollama",
   *   "baseUrl": "http://localhost:11434",
   *   "apiKey": "optional-api-key",
   *   "defaultModel": "llama3.1",
   *   "isDefault": false
   * }
   * ```
   */
  fastify.post('/admin/providers', async (request, reply) => {
    const body = request.body as {
      name?: string;
      type?: 'ollama' | 'openai';
      baseUrl?: string;
      apiKey?: string;
      defaultModel?: string;
      isDefault?: boolean;
      temperature?: number;
      maxTokens?: number;
    };

    if (!body.name || !body.type || !body.baseUrl || !body.defaultModel) {
      return reply.code(400).send({
        error: 'Missing required fields: name, type, baseUrl, defaultModel',
      });
    }

    try {
      // Create in registry
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

      // Persist to database
      const [provider] = await Provider.upsert({
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

      logger.info({ provider: body.name, type: body.type }, 'Provider registered');

      return reply.status(201).send({
        status: 'registered',
        provider: { id: provider.id, name: provider.name, type: provider.type },
      });
    } catch (err) {
      logger.error({ err, provider: body.name }, 'Failed to register provider');
      return reply.code(500).send({
        error: 'Failed to register provider',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * DELETE /admin/providers/:name
   * Remove a registered provider.
   */
  fastify.delete('/admin/providers/:name', async (request, reply) => {
    const { name } = request.params as { name: string };

    const removed = llmRegistry.unregister(name);
    if (!removed) {
      return reply.code(404).send({ error: `Provider "${name}" not found` });
    }

    // Also remove from database
    await Provider.destroy({ where: { name } });

    logger.info({ provider: name }, 'Provider removed');
    return reply.send({ status: 'removed', provider: name });
  });

  /**
   * POST /admin/providers/:name/default
   * Set a provider as the default.
   */
  fastify.post('/admin/providers/:name/default', async (request, reply) => {
    const { name } = request.params as { name: string };

    const success = llmRegistry.setDefault(name);
    if (!success) {
      return reply.code(404).send({ error: `Provider "${name}" not found` });
    }

    // Update database
    await Provider.update({ isDefault: false }, { where: { isDefault: true } });
    await Provider.update({ isDefault: true }, { where: { name } });

    return reply.send({ status: 'default_set', provider: name });
  });

  /**
   * GET /admin/providers/:name/models
   * List available models from a provider.
   */
  fastify.get('/admin/providers/:name/models', async (request, reply) => {
    const { name } = request.params as { name: string };
    const provider = llmRegistry.get(name);

    if (!provider) {
      return reply.code(404).send({ error: `Provider "${name}" not found` });
    }

    try {
      const models = await provider.listModels();
      return reply.send({ provider: name, models });
    } catch (err) {
      return reply.code(502).send({
        error: 'Failed to list models',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // ─── Tool Management ─────────────────────────────────────────────────────

  /**
   * GET /admin/tools
   * List all registered MCP tools with their status.
   */
  fastify.get('/admin/tools', async (request, reply) => {
    const tools = toolRegistry.listAll();
    const categories = toolRegistry.getByCategory();

    return reply.send({
      total: tools.length,
      enabled: tools.filter((t) => t.enabled).length,
      categories,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        enabled: t.enabled,
        category: t.category,
        hasInputSchema: !!t.inputSchema,
      })),
    });
  });

  /**
   * GET /admin/tools/:name
   * Get detailed info about a specific tool.
   */
  fastify.get('/admin/tools/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const tool = toolRegistry.get(name);

    if (!tool) {
      return reply.code(404).send({ error: `Tool "${name}" not found` });
    }

    return reply.send({
      name: tool.name,
      description: tool.description,
      enabled: tool.enabled,
      category: tool.category,
      inputSchema: tool.inputSchema,
    });
  });

  /**
   * PATCH /admin/tools/:name
   * Enable or disable a tool.
   *
   * ## Request Body
   * ```json
   * { "enabled": false }
   * ```
   */
  fastify.patch('/admin/tools/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const body = request.body as { enabled?: boolean };

    if (body.enabled === undefined) {
      return reply.code(400).send({ error: 'Must provide "enabled" boolean' });
    }

    const success = toolRegistry.setEnabled(name, body.enabled);
    if (!success) {
      return reply.code(404).send({ error: `Tool "${name}" not found` });
    }

    // Persist to database
    await ToolConfig.update({ enabled: body.enabled }, { where: { name } });

    logger.info({ tool: name, enabled: body.enabled }, 'Tool status updated');
    return reply.send({ status: 'updated', tool: name, enabled: body.enabled });
  });
};
