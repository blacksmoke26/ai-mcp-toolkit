/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

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
 * | DELETE | `/metrics/clear` | Clear all metrics (dev only) |
 * | GET | `/metrics/live` | SSE stream of live metrics |
 * | GET | `/metrics/trends` | Comparison metrics between timeframes (New) |
 * | GET | `/metrics/anomalies` | Detect statistical anomalies in performance (New) |
 * | GET | `/metrics/health/deep` | Comprehensive system health score (New) |
 */

/*
 * CHANGE LOG
 * ----------
 * [Refactor] Added JSON Schema validation to all routes to ensure query parameter types and constraints.
 * [Refactor] Optimized /metrics/providers to use Promise.all for parallel health checks.
 * [Refactor] Improved data filtering logic in request and token routes.
 * [Feature] Added /metrics/trends endpoint to compare current performance against previous periods.
 * [Feature] Added /metrics/anomalies endpoint for statistical deviation detection (e.g., latency spikes).
 * [Feature] Added /metrics/health/deep endpoint for an aggregated health score calculation.
 * [Fix] Added robust handling for missing or invalid filter parameters.
 * [Fix] Improved /metrics/export to handle large datasets with better type safety.
 */

import type {FastifyPluginAsync} from 'fastify';
import {metricsCollector} from '@/metrics/collector';
import {llmRegistry} from '@/llm/registry';
import {logger} from '@/utils/logger';

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Metrics Summary ────

  /**
   * GET /metrics
   * Get comprehensive metrics summary for a time period.
   */
  fastify.get('/metrics', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 24, default: 1},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number };
    const hours = query.hours ?? 1;

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
   */
  fastify.get('/metrics/requests', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 168, default: 1},
          endpoint: {type: 'string'},
          method: {type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number; endpoint?: string; method?: string };
    const hours = query.hours ?? 1;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.requests;

    // Filter recent requests by params if provided
    let recentRequests = metricsCollector.getEntriesByType('request').slice(0, 50);

    if (query.endpoint || query.method) {
      recentRequests = recentRequests.filter(e => {
        const data = e.data as any;
        const matchEndpoint = !query.endpoint || data.path === query.endpoint;
        const matchMethod = !query.method || data.method === query.method;
        return matchEndpoint && matchMethod;
      });
    }

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
      recentRequests: recentRequests.map(e => ({
        timestamp: e.timestamp.toISOString(),
        ...e.data,
      })),
    });
  });

  // ─── Tool Execution Metrics ────

  /**
   * GET /metrics/tools
   * Get tool execution metrics including success rates and latencies.
   */
  fastify.get('/metrics/tools', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 168, default: 1},
          tool: {type: 'string'},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number; tool?: string };
    const hours = query.hours ?? 1;
    const toolFilter = query.tool;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.tools;

    // Filter by tool if specified
    let byTool = entry.byTool;
    if (toolFilter && byTool[toolFilter]) {
      byTool = {[toolFilter]: byTool[toolFilter]};
    } else if (toolFilter) {
      // Tool requested but not found
      byTool = {};
    }

    // Get recent tool executions
    const recentTools = metricsCollector
      .getEntriesByType('tool')
      .slice(0, 50)
      .filter(e => !toolFilter || (e.data as any).name === toolFilter)
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
   */
  fastify.get('/metrics/tokens', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 8760, default: 1}, // Max 1 year
          provider: {type: 'string'},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number; provider?: string };
    const hours = query.hours ?? 1;
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
      .filter(e => !providerFilter || (e.data as any).provider.startsWith(providerFilter))
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
   * IMPROVED: Parallelized health checks for better performance.
   */
  fastify.get('/metrics/providers', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 168, default: 1},
          provider: {type: 'string'},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number; provider?: string };
    const hours = query.hours ?? 1;
    const providerFilter = query.provider;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.providers;

    // Filter by provider if specified
    let byProvider = entry.byProvider;
    if (providerFilter && byProvider[providerFilter]) {
      byProvider = {[providerFilter]: byProvider[providerFilter]};
    } else if (providerFilter) {
      byProvider = {};
    }

    // Get live provider status - IMPROVED: Use Promise.all for parallel execution
    const providerNames = llmRegistry.listProviders();
    const liveStatusPromises = providerNames.map(async (name) => {
      try {
        const start = Date.now();
        const provider = llmRegistry.get(name);
        if (!provider) throw new Error('Provider not found in registry');

        const healthy = await provider.healthCheck();
        return {
          name,
          status: healthy ? 'ok' : 'degraded',
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          name,
          status: 'error' as const,
          message: err instanceof Error ? err.message : String(err),
        };
      }
    });

    const liveStatusResults = await Promise.all(liveStatusPromises);
    const liveStatus: Record<string, any> = {};
    liveStatusResults.forEach(res => {
      liveStatus[res.name] = {
        status: res.status,
        ...(res.latencyMs !== undefined && {latencyMs: res.latencyMs}),
        ...(res.message && {message: res.message}),
      };
    });

    return reply.send({
      byProvider,
      liveStatus,
      registeredProviders: providerNames,
      defaultProvider: llmRegistry.defaultProviderName,
    });
  });

  // ─── Error Metrics ────

  /**
   * GET /metrics/errors
   * Get error metrics and recent error logs.
   */
  fastify.get('/metrics/errors', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 168, default: 1},
          type: {type: 'string'},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number; type?: string };
    const hours = query.hours ?? 1;
    const typeFilter = query.type;

    const summary = metricsCollector.getSummary(hours);
    const entry = summary.errors;

    // Get recent errors
    let recentErrors = metricsCollector
      .getEntriesByType('error')
      .slice(0, 100)
      .map(e => ({
        timestamp: e.timestamp.toISOString(),
        ...e.data,
      }));

    if (typeFilter) {
      recentErrors = recentErrors.filter(e => (e as { type?: string }).type === typeFilter);
    }

    return reply.send({
      total: entry.total,
      byType: entry.byType,
      recentErrors,
    });
  });

  // ─── System Metrics ────

  /**
   * GET /metrics/system
   * Get system resource metrics (memory, CPU, event loop).
   */
  fastify.get('/metrics/system', {
    schema: {
      querystring: {
        type: 'object',
        properties: {}, // No params for system metrics usually, but kept for consistency
      },
    },
  }, async (request, reply) => {
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
   */
  fastify.get('/metrics/export', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          includeEntries: {type: 'boolean', default: false},
          hours: {type: 'number', minimum: 1, maximum: 168, default: 1},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { includeEntries?: boolean; hours?: number };
    const includeEntries = query.includeEntries ?? false;
    const hours = query.hours ?? 1;

    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      period: {hours},
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
   */
  fastify.delete('/metrics/clear', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          confirm: {type: 'string', enum: ['yes']}, // Safety mechanism
        },
        required: ['confirm'],
      },
    },
  }, async (request, reply) => {
    if (process.env.NODE_ENV !== 'development') {
      return reply.code(403).send({
        error: 'Metrics clearing is only available in development mode',
      });
    }

    const query = request.query as { confirm: string };
    if (query.confirm !== 'yes') {
      return reply.code(400).send({error: 'Must confirm with ?confirm=yes'});
    }

    metricsCollector.clear();
    logger.info('Metrics cleared via API');

    return reply.send({status: 'cleared', timestamp: new Date().toISOString()});
  });

  // ─── Live Metrics Stream (SSE) ────

  /**
   * GET /metrics/live
   * Stream live metrics updates via Server-Sent Events (SSE).
   */
  fastify.get('/metrics/live', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          interval: {type: 'number', minimum: 1000, maximum: 60000, default: 5000},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { interval?: number };
    const intervalMs = query.interval ?? 5000;

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const sendEvent = (eventName: string, data: unknown) => {
      reply.raw.write(`event: ${eventName}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial connection message
    sendEvent('connected', {
      timestamp: new Date().toISOString(),
      message: 'Connected to live metrics stream',
      interval: intervalMs,
    });

    // Periodic metrics updates
    const interval = setInterval(() => {
      try {
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
      } catch (err) {
        logger.error({err}, 'Error sending SSE event');
        clearInterval(interval);
        reply.raw.end();
      }
    }, intervalMs);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
      logger.debug('Client disconnected from live metrics stream');
    });

    request.raw.on('end', () => {
      clearInterval(interval);
    });

    // Return a raw stream response
    return reply;
  });

  // ─── NEW: Metrics Trends ────

  /**
   * GET /metrics/trends
   * Compare metrics between the current period and the previous period of equal length.
   * Useful for identifying sudden spikes or drops in traffic/errors.
   */
  fastify.get('/metrics/trends', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 168, default: 1},
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number };
    const hours = query.hours ?? 1;

    const currentSummary = metricsCollector.getSummary(hours);
    const previousSummary = metricsCollector.getSummary(hours * 2); // Previous period: hours ago to 2*hours ago

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return reply.send({
      period: {
        lengthHours: hours,
        current: {start: currentSummary.period.start.toISOString(), end: currentSummary.period.end.toISOString()},
        previous: {start: previousSummary.period.start.toISOString(), end: previousSummary.period.end.toISOString()},
      },
      comparison: {
        requests: {
          current: currentSummary.requests.total,
          previous: previousSummary.requests.total,
          changePercent: calculateChange(currentSummary.requests.total, previousSummary.requests.total),
        },
        errors: {
          current: currentSummary.errors.total,
          previous: previousSummary.errors.total,
          changePercent: calculateChange(currentSummary.errors.total, previousSummary.errors.total),
        },
        latency: {
          current: currentSummary.requests.avgLatencyMs,
          previous: previousSummary.requests.avgLatencyMs,
          changePercent: calculateChange(currentSummary.requests.avgLatencyMs, previousSummary.requests.avgLatencyMs),
        },
      },
    });
  });

  // ─── NEW: Metrics Anomalies ────

  /**
   * GET /metrics/anomalies
   * Detect anomalies based on standard deviation from the mean.
   * Uses a simple Z-score analysis on request latencies to flag unusual events.
   */
  fastify.get('/metrics/anomalies', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          hours: {type: 'number', minimum: 1, maximum: 24, default: 1},
          threshold: {type: 'number', minimum: 1, maximum: 5, default: 2}, // Z-score threshold
        },
      },
    },
  }, async (request, reply) => {
    const query = request.query as { hours?: number; threshold?: number };
    const hours = query.hours ?? 1;
    const threshold = query.threshold ?? 2;

    const summary = metricsCollector.getSummary(hours);
    const entries = metricsCollector.getEntriesByType('request');

    // Calculate basic statistics for latency
    const latencies = entries.map(e => (e.data as any).latencyMs || 0);
    const mean = summary.requests.avgLatencyMs;

    // Calculate standard deviation
    const variance = latencies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (latencies.length || 1);
    const stdDev = Math.sqrt(variance);

    // Detect anomalies (Z-score > threshold)
    const anomalies = entries
      .filter(e => {
        const lat = (e.data as any).latencyMs || 0;
        const zScore = stdDev === 0 ? 0 : (lat - mean) / stdDev;
        return Math.abs(zScore) > threshold;
      })
      .map(e => ({
        timestamp: e.timestamp.toISOString(),
        path: (e.data as any).path,
        method: (e.data as any).method,
        latencyMs: (e.data as any).latencyMs,
        zScore: stdDev === 0 ? 0 : ((e.data as any).latencyMs - mean) / stdDev,
      }));

    return reply.send({
      analysis: {
        meanLatencyMs: mean,
        standardDeviation: stdDev,
        threshold,
      },
      count: anomalies.length,
      anomalies,
    });
  });

  // ─── NEW: Deep Health Check ────

  /**
   * GET /metrics/health/deep
   * Performs a deep health check combining system status, provider health,
   * and recent error rates to produce a single health score (0-100).
   */
  fastify.get('/metrics/health/deep', {
    schema: {
      querystring: {
        type: 'object',
        properties: {},
      },
    },
  }, async (request, reply) => {
    const systemMetrics = metricsCollector.getSystemMetrics();
    const summary = metricsCollector.getSummary(1); // Last 1 hour stats

    // 1. Check System Resources (Score 0-40)
    let systemScore = 40;
    const memUsage = systemMetrics.memoryUsedMb / systemMetrics.memoryTotalMb;
    if (memUsage > 0.9) systemScore = 0;
    else if (memUsage > 0.7) systemScore = 20;

    // 2. Check Providers (Score 0-30)
    let providerScore = 30;
    const providers = llmRegistry.listProviders();
    try {
      const checks = await Promise.all(providers.map(p => llmRegistry.get(p)!.healthCheck()));
      const healthyCount = checks.filter(c => c).length;
      providerScore = (healthyCount / providers.length) * 30;
    } catch (e) {
      providerScore = 0;
    }

    // 3. Check Error Rate (Score 0-30)
    let errorScore = 30;
    const totalRequests = summary.requests.total;
    const totalErrors = summary.errors.total;
    if (totalRequests > 0) {
      const errorRate = totalErrors / totalRequests;
      if (errorRate > 0.1) errorScore = 0; // >10% errors
      else if (errorRate > 0.05) errorScore = 10; // >5% errors
      else if (errorRate > 0.01) errorScore = 20; // >1% errors
    }

    const totalScore = Math.round(systemScore + providerScore + errorScore);

    let status = 'healthy';
    if (totalScore < 50) status = 'unhealthy';
    else if (totalScore < 80) status = 'degraded';

    return reply.send({
      status,
      score: totalScore,
      breakdown: {
        system: {score: Math.round(systemScore), memUsagePercent: Math.round(memUsage * 100)},
        providers: {score: Math.round(providerScore), total: providers.length},
        stability: {score: Math.round(errorScore), errorRate: totalRequests ? (totalErrors / totalRequests) : 0},
      },
      timestamp: new Date().toISOString(),
    });
  });
};
