/**
 * @module server/routes/metrics
 * @description Metrics, monitoring, and performance analysis endpoints.
 * 
 * These endpoints provide access to:
 * 
 * - Real-time performance metrics
 * - Historical metrics data
 * - Metrics summaries and aggregations
 * - System resource monitoring
 * - Export capabilities
 * 
 * ## Routes
 * 
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | GET | `/metrics` | Current metrics summary |
 * | GET | `/metrics/requests` | Request metrics |
 * | GET | `/metrics/tools` | Tool execution metrics |
 * | GET | `/metrics/tokens` | Token usage metrics |
 * | GET | `/metrics/providers` | Provider performance metrics |
 * | GET | `/metrics/errors` | Error metrics |
 * | GET | `/metrics/system` | System resource metrics |
 * | GET | `/metrics/export` | Export all metrics as JSON |
 * | GET | `/metrics/clear` | Clear all metrics (dev only) |
 * | GET | `/metrics/live` | SSE stream of live metrics |
 */

import type { FastifyPluginAsync } from 'fastify';
import { metricsCollector } from '@/metrics/collector.js';
import { toolRegistry } from '@/mcp/tools/registry.js';
import { llmRegistry } from '@/llm/registry.js';
import { logger } from '@/utils/logger.js';

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Metrics Summary ────

  /**
   * GET /metrics
   * Get comprehensive metrics summary for a time period.
   * 
   * Query Parameters:
   * - hours: Number of hours to include (default: 1, max: 24)
   */
  fastify.get('/metrics', async (request, reply) => {
    const query = request.query as { hours?: string | number };
    const hours = Math.min(
      Math.max(1, query.hours ? Number(query.hours) : 1),
      24
    );

    const summary = metricsCollector.getSummary(hours);

    return reply.send({
      period: {
        hours,
        start: summary.period.start.toISOString(),
        end: summary.period.end.toISOString(),
      },
      summary,
    });
  });

  // ─── Request Metrics ────

  /**
   * GET /metrics/requests
   * Get detailed request metrics with latency breakdowns.
   * 
   * Query Parameters:
   * - endpoint: Filter by endpoint
   * - method: Filter by HTTP method
   * - hours: Time range in hours (default: 1)
   */
  fastify.get('/metrics/requests', async (request, reply) => {
    const query = request.query as { hours?: string | number; endpoint?: string; method?: string };
    const hours = Number(query.hours) || 1;
    const endpointFilter = query.endpoint;
    const methodFilter = query.method;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.requests;

    return reply.send({
      total: entry.total,
      avgLatencyMs: entry.avgLatencyMs,
      percentiles: {
        p50: entry.p50LatencyMs,
        p95: entry.p95LatencyMs,
        p99: entry.p99LatencyMs,
      },
      byEndpoint: entry.byEndpoint,
      byStatusCode: entry.byStatusCode,
      recentRequests: metricsCollector
        .getEntriesByType('request')
        .slice(0, 50)
        .map(e => ({
          timestamp: e.timestamp.toISOString(),
          ...e.data,
        })),
    });
  });

  // ─── Tool Execution Metrics ────

  /**
   * GET /metrics/tools
   * Get tool execution metrics including success rates and latencies.
   * 
   * Query Parameters:
   * - tool: Filter by tool name
   * - hours: Time range in hours (default: 1)
   */
  fastify.get('/metrics/tools', async (request, reply) => {
    const query = request.query as { hours?: string | number; tool?: string };
    const hours = Number(query.hours) || 1;
    const toolFilter = query.tool;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.tools;

    // Filter by tool if specified
    let byTool = entry.byTool;
    if (toolFilter) {
      byTool = { [toolFilter]: entry.byTool[toolFilter] };
    }

    // Get recent tool executions
    const recentTools = metricsCollector
      .getEntriesByType('tool')
      .slice(0, 50)
      .map(e => ({
        timestamp: e.timestamp.toISOString(),
        ...e.data,
      }));

    return reply.send({
      totalCalls: entry.totalCalls,
      successRate: entry.successRate,
      avgDurationMs: entry.avgDurationMs,
      byTool,
      recentExecutions: recentTools,
    });
  });

  // ─── Token Usage Metrics ────

  /**
   * GET /metrics/tokens
   * Get token usage statistics by provider and model.
   * 
   * Query Parameters:
   * - provider: Filter by provider name
   * - hours: Time range in hours (default: 1)
   */
  fastify.get('/metrics/tokens', async (request, reply) => {
    const query = request.query as { hours?: string | number; provider?: string };
    const hours = Number(query.hours) || 1;
    const providerFilter = query.provider;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.tokens;

    // Filter by provider if specified
    let byProvider = entry.byProvider;
    if (providerFilter) {
      const filtered: Record<string, typeof byProvider[keyof typeof byProvider]> = {};
      for (const [key, value] of Object.entries(byProvider)) {
        if (key.startsWith(providerFilter)) {
          filtered[key] = value;
        }
      }
      byProvider = filtered;
    }

    // Get recent token usage
    const recentTokens = metricsCollector
      .getEntriesByType('token')
      .slice(0, 50)
      .map(e => ({
        timestamp: e.timestamp.toISOString(),
        ...e.data,
      }));

    return reply.send({
      totalInput: entry.totalInput,
      totalOutput: entry.totalOutput,
      totalTokens: entry.totalInput + entry.totalOutput,
      estimatedCost: entry.totalCostEstimate,
      byProvider,
      recentUsage: recentTokens,
    });
  });

  // ─── Provider Performance Metrics ────

  /**
   * GET /metrics/providers
   * Get provider performance metrics including latency and success rates.
   * 
   * Query Parameters:
   * - provider: Filter by provider name
   * - hours: Time range in hours (default: 1)
   */
  fastify.get('/metrics/providers', async (request, reply) => {
    const query = request.query as { hours?: string | number; provider?: string };
    const hours = Number(query.hours) || 1;
    const providerFilter = query.provider;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.providers;

    // Filter by provider if specified
    let byProvider = entry.byProvider;
    if (providerFilter) {
      byProvider = { [providerFilter]: entry.byProvider[providerFilter] };
    }

    // Get live provider status
    const liveStatus: Record<string, { status: string; latencyMs?: number; message?: string }> = {};
    for (const name of llmRegistry.listProviders()) {
      try {
        const start = Date.now();
        const healthy = await llmRegistry.get(name)!.healthCheck();
        liveStatus[name] = {
          status: healthy ? 'ok' : 'degraded',
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        liveStatus[name] = {
          status: 'error' as const,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    }

    return reply.send({
      byProvider,
      liveStatus,
      registeredProviders: llmRegistry.listProviders(),
      defaultProvider: llmRegistry.defaultProviderName,
    });
  });

  // ─── Error Metrics ────

  /**
   * GET /metrics/errors
   * Get error metrics and recent error logs.
   * 
   * Query Parameters:
   * - type: Filter by error type
   * - hours: Time range in hours (default: 1)
   */
  fastify.get('/metrics/errors', async (request, reply) => {
    const query = request.query as { hours?: string | number; type?: string };
    const hours = Number(query.hours) || 1;
    const typeFilter = query.type;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.errors;

    // Get recent errors
    const recentErrors = metricsCollector
      .getEntriesByType('error')
      .slice(0, 100)
      .map(e => ({
        timestamp: e.timestamp.toISOString(),
        ...e.data,
      }));

    return reply.send({
      total: entry.total,
      byType: entry.byType,
      recentErrors: typeFilter
        ? recentErrors.filter(e => (e as { type?: string }).type === typeFilter)
        : recentErrors,
    });
  });

  // ─── System Metrics ────

  /**
   * GET /metrics/system
   * Get system resource metrics (memory, CPU, event loop).
   */
  fastify.get('/metrics/system', async (request, reply) => {
    const systemMetrics = metricsCollector.getSystemMetrics();
    const platformInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
    };

    return reply.send({
      system: systemMetrics,
      platform: platformInfo,
      // Also get a history of recent system metrics
      recentHistory: metricsCollector
        .getEntriesByType('system')
        .slice(0, 20)
        .map(e => ({
          timestamp: e.timestamp.toISOString(),
          ...e.data,
        })),
    });
  });

  // ─── Metrics Export ────

  /**
   * GET /metrics/export
   * Export all metrics as JSON (useful for external monitoring).
   * 
   * Query Parameters:
   * - includeEntries: Include raw entries (default: false)
   * - hours: Time range in hours (default: 1)
   */
  fastify.get('/metrics/export', async (request, reply) => {
    const query = request.query as { includeEntries?: string; hours?: string | number };
    const includeEntries = query.includeEntries === 'true';
    const hours = Number(query.hours) || 1;

    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      period: { hours },
      summary: metricsCollector.getSummary(hours),
    };

    if (includeEntries) {
      data.entries = metricsCollector.getAllEntries();
    }

    return reply
      .header('Content-Type', 'application/json')
      .header('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`)
      .send(data);
  });

  // ─── Metrics Clear (Dev Only) ────

  /**
   * DELETE /metrics/clear
   * Clear all metrics (development only).
   * 
   * This endpoint is protected and should only be used in development.
   */
  fastify.delete('/metrics/clear', async (request, reply) => {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return reply.code(403).send({
        error: 'Metrics clearing is only available in development mode',
      });
    }

    metricsCollector.clear();

    logger.info('Metrics cleared');
    return reply.send({ status: 'cleared' });
  });

  // ─── Live Metrics Stream (SSE) ────

  /**
   * GET /metrics/live
   * Stream live metrics updates via Server-Sent Events (SSE).
   * 
   * This endpoint provides real-time updates of metrics including:
   * - Request count and latency
   * - Active connections
   * - System resource usage
   * 
   * Events:
   * - metrics: Periodic metrics snapshot
   * - request: Individual request metrics
   * - tool: Individual tool execution metrics
   * - error: New error recorded
   */
  fastify.get('/metrics/live', async (request, reply) => {
    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (eventName: string, data: unknown) => {
      reply.raw.write(`event: ${eventName}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial connection message
    sendEvent('connected', {
      timestamp: new Date().toISOString(),
      message: 'Connected to live metrics stream',
    });

    // Periodic metrics updates every 5 seconds
    const interval = setInterval(() => {
      const systemMetrics = metricsCollector.getSystemMetrics();
      const summary = metricsCollector.getSummary(1); // Last hour

      sendEvent('metrics', {
        timestamp: new Date().toISOString(),
        summary: {
          requests: summary.requests.total,
          tools: summary.tools.totalCalls,
          errors: summary.errors.total,
          tokens: {
            input: summary.tokens.totalInput,
            output: summary.tokens.totalOutput,
          },
        },
        system: {
          memoryUsedMb: systemMetrics.memoryUsedMb,
          memoryTotalMb: systemMetrics.memoryTotalMb,
          uptime: process.uptime(),
        },
      });
    }, 5000);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
      logger.debug('Client disconnected from live metrics stream');
    });

    // Keep connection alive
    return new Promise(() => {
      // This promise never resolves, keeping the connection open
    });
  });
};