/**
 * @module server/routes/health
 * @description Health check and server info endpoints.
 *
 * Provides endpoints for monitoring the server's health,
 * checking provider connectivity, and viewing server capabilities.
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | GET | `/health` | Basic server health check |
 * | GET | `/health/ready` | Readiness probe (checks DB + LLM providers) |
 * | GET | `/info` | Server information and capabilities |
 */

import type { FastifyPluginAsync } from 'fastify';
import { db } from '@/db/index.js';
import { llmRegistry } from '@/llm/registry.js';
import { toolRegistry } from '@/mcp/tools/registry.js';
import { resourceRegistry } from '@/mcp/resources/registry.js';
import { promptRegistry } from '@/mcp/prompts/registry.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /health
   * Basic liveness check. Returns 200 if the server process is running.
   */
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * GET /health/ready
   * Readiness check. Verifies database connectivity and LLM provider health.
   * Returns 503 if any critical dependency is unhealthy.
   */
  fastify.get('/health/ready', async (_request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Check database
    try {
      const start = Date.now();
      await db.authenticate();
      checks.database = { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      checks.database = { status: 'error', error: err instanceof Error ? err.message : String(err) };
    }

    // Check LLM providers
    for (const name of llmRegistry.listProviders()) {
      const provider = llmRegistry.get(name);
      if (!provider) continue;
      try {
        const start = Date.now();
        const healthy = await provider.healthCheck();
        checks[`provider:${name}`] = {
          status: healthy ? 'ok' : 'error',
          latencyMs: Date.now() - start,
          ...(healthy ? {} : { error: 'Health check failed' }),
        };
      } catch (err) {
        checks[`provider:${name}`] = {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
    const statusCode = allHealthy ? 200 : 503;

    return reply.code(statusCode).send({
      status: allHealthy ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    });
  });

  /**
   * GET /info
   * Returns detailed server information including capabilities and available tools.
   */
  fastify.get('/info', async (_request, reply) => {
    const tools = toolRegistry.listAll();
    const categories = toolRegistry.getByCategory();

    return reply.send({
      server: {
        name: '@mcp/server',
        version: '1.0.0',
        protocol: 'MCP 2024-11-05',
      },
      providers: {
        available: llmRegistry.listProviders(),
        default: llmRegistry.defaultProviderName,
      },
      tools: {
        total: toolRegistry.size,
        enabled: tools.filter((t) => t.enabled).length,
        categories,
      },
      resources: resourceRegistry.size,
      prompts: promptRegistry.size,
      uptime: process.uptime(),
    });
  });
};
