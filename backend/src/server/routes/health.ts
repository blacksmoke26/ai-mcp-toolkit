/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/health
 * @description Health check, server info, and diagnostics endpoints.
 *
 * Provides endpoints for monitoring the server's health,
 * checking provider connectivity, viewing server capabilities, and runtime diagnostics.
 *
 * ## Routes
 *
 * | Method | Path                  | Description                                             |
 * |--------|-----------------------|---------------------------------------------------------|
 * | GET    | `/health`             | Basic server health check (Liveness)                    |
 * | GET    | `/health/live`        | Kubernetes liveness probe (lightweight)                 |
 * | GET    | `/health/ready`       | Readiness probe (checks DB + LLM providers)             |
 * | POST   | `/health/ready/check` | Detailed readiness check with filtering and timeouts    |
 * | GET    | `/info`               | Server information and capabilities                     |
 * | GET    | `/diagnostics/stats`  | Real-time performance and resource statistics           |
 * | POST   | `/diagnostics/toggle` | Toggle simulation states for testing (Failure injection)|
 */

import {db} from '@/db';
import {llmRegistry} from '@/llm/registry';
import {toolRegistry} from '@/mcp/tools/registry';
import {resourceRegistry} from '@/mcp/resources/registry';
import {promptRegistry} from '@/mcp/prompts/registry';
import type {FastifyPluginAsync} from 'fastify';

/**
 * In-memory state for diagnostic toggles.
 * Used to simulate failure scenarios and latency for testing purposes.
 */
const simulationState = {
  /** Flag to simulate database connectivity failures. */
  failDatabase: false,
  /** Name of the specific LLM provider to simulate a failure for, or `null` if none. */
  failProvider: null as string | null,
  /** Artificial latency in milliseconds to add to health check responses. */
  latencyMs: 0,
};

/**
 * Helper to apply a timeout to promise-based checks.
 * Prevents health checks from hanging indefinitely.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

/**
 * Fastify plugin for health check, server info, and diagnostics endpoints.
 *
 * This plugin registers routes that allow monitoring the server's health,
 * checking provider connectivity, viewing server capabilities, and runtime diagnostics.
 *
 * @param fastify - The Fastify instance to attach routes to.
 * @returns A promise that resolves when the plugin registration is complete.
 */
export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /health
   * Basic liveness check. Returns 200 if the server process is running.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation for response.
   * - 2023-10-27: Added memory usage stats.
   */
  fastify.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: {type: 'string', enum: ['ok']},
            timestamp: {type: 'string', format: 'date-time'},
            uptime: {type: 'number'},
            memory: {
              type: 'object',
              properties: {
                heapUsed: {type: 'number'},
                heapTotal: {type: 'number'},
              },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const mem = process.memoryUsage();
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
      },
    });
  });

  /**
   * GET /health/live
   * Lightweight liveness probe specifically for container orchestrators.
   * Does not perform IO operations.
   *
   * @changelog
   * - 2023-10-27: New endpoint added for K8s liveness separation.
   */
  fastify.get('/health/live', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            alive: {type: 'boolean'},
          },
          required: ['alive'],
        },
      },
    },
  }, async (_request, reply) => {
    return reply.send({alive: true});
  });

  /**
   * GET /health/ready
   * Readiness check. Verifies database connectivity and LLM providers.
   * Returns 503 if any critical dependency is unhealthy.
   *
   * @changelog
   * - 2023-10-27: Refactored to use Promise.all for parallel execution.
   * - 2023-10-27: Added timeout wrappers for dependency checks.
   * - 2023-10-27: Added simulation state handling for testing.
   * - 2023-10-27: Added response schema validation.
   */
   fastify.get('/health/ready', {
     schema: {
       response: {
         200: {
           type: 'object',
           properties: {
             status: {type: 'string', enum: ['ready', 'degraded']},
             timestamp: {type: 'string'},
             checks: {
               type: 'object',
               additionalProperties: {
                 type: 'object',
                 properties: {
                   status: {type: 'string'},
                   latencyMs: {type: 'number'},
                   error: {type: 'string'},
                 },
               },
             },
           },
           required: ['status', 'timestamp', 'checks'],
         },
         503: {
           type: 'object',
           properties: {
             status: {type: 'string', enum: ['ready', 'degraded']},
             timestamp: {type: 'string'},
             checks: {
               type: 'object',
               additionalProperties: {
                 type: 'object',
                 properties: {
                   status: {type: 'string'},
                   latencyMs: {type: 'number'},
                   error: {type: 'string'},
                 },
               },
             },
           },
           required: ['status', 'timestamp', 'checks'],
         },
       },
     },
   }, async (_request, reply) => {
     const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
     const DEFAULT_TIMEOUT = 2000; // 2 seconds

     // Check database (Parallel logic preparation)
     const dbCheck = async () => {
       if (simulationState.failDatabase) {
         throw new Error('Simulated database failure');
       }
       const start = Date.now();
       await db.authenticate();
       return {status: 'ok', latencyMs: Date.now() - start};
     };

     // Check LLM providers (Parallel logic preparation)
     const providerChecks = async () => {
       const results: Record<string, object> = {};
       const providers = llmRegistry.listProviders();

       // Run all provider checks in parallel using Promise.allSettled
       const settled = await Promise.allSettled(
         providers.map(async (name) => {
           const provider = llmRegistry.get(name);
           if (!provider) return {name, result: {status: 'error', error: 'Provider not found in registry'}};

           if (simulationState.failProvider === name) {
             return {name, result: {status: 'error', error: 'Simulated provider failure'}};
           }

           const start = Date.now();
           try {
             // Apply timeout to external calls
             const isHealthy = await withTimeout(provider.healthCheck(), DEFAULT_TIMEOUT);
             return {
               name,
               result: {
                 status: isHealthy ? 'ok' : 'error',
                 latencyMs: Date.now() - start + simulationState.latencyMs,
                 ...(isHealthy ? {} : {error: 'Health check returned false'}),
               },
             };
           } catch (err) {
             return {
               name,
               result: {
                 status: 'error',
                 latencyMs: Date.now() - start,
                 error: err instanceof Error ? err.message : String(err),
               },
             };
           }
         }),
       );

       settled.forEach((result) => {
         if (result.status === 'fulfilled' && result.value) {
           results[`provider:${result.value.name}`] = result.value.result;
         } else if (result.status === 'rejected') {
           // Should not happen given the inner try/catch, but handling edge case
           results['provider:unknown'] = {status: 'error', error: result.reason};
         }
       });

       return results;
     };

     // Execute DB and Provider checks in parallel
     try {
       const [dbResult, providerResults] = await Promise.allSettled([
         withTimeout(dbCheck(), DEFAULT_TIMEOUT),
         providerChecks(),
       ]);

       // Process DB Result
       if (dbResult.status === 'fulfilled') {
         checks.database = dbResult.value;
       } else {
         checks.database = {
           status: 'error',
           error: dbResult.reason instanceof Error ? dbResult.reason.message : 'DB Check Failed',
         };
       }

       // Process Provider Results
       if (providerResults.status === 'fulfilled') {
         Object.assign(checks, providerResults.value);
       } else {
         checks['provider:system'] = {status: 'error', error: 'Provider check loop failed'};
       }

     } catch (err) {
       // Catch-all for unexpected errors in the logic
       checks.system = {status: 'error', error: err instanceof Error ? err.message : 'Unknown error'};
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
   * POST /health/ready/check
   * Advanced readiness check with request body parameters.
   * Allows filtering specific components and setting custom timeouts.
   *
   * @changelog
   * - 2023-10-27: New endpoint for granular control.
   * - 2023-10-27: Added body validation schema.
   */
  fastify.post<{
    Body: {
      timeout?: number;
      checks?: string[];
      providers?: string[];
    }
  }>('/health/ready/check', {
    schema: {
      body: {
        type: 'object',
        properties: {
          timeout: {type: 'number', minimum: 100, maximum: 10000, default: 2000},
          checks: {
            type: 'array',
            items: {type: 'string'},
            default: ['database', 'providers'],
          },
          providers: {
            type: 'array',
            items: {type: 'string'},
            description: 'Specific providers to check. Checks all if omitted.',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            filtered: {type: 'boolean'},
            checks: {type: 'object'},
          },
        },
      },
    },
  }, async (request, reply) => {
    const {
      timeout = 2000,
      checks: requestedChecks = ['database', 'providers'],
      providers: requestedProviders,
    } = request.body;
    const results: Record<string, object> = {};

    // Logic: Conditional execution based on request
    if (requestedChecks.includes('database')) {
      try {
        const start = Date.now();
        await withTimeout(db.authenticate(), timeout);
        results.database = {status: 'ok', latencyMs: Date.now() - start};
      } catch (err) {
        results.database = {status: 'error', error: err instanceof Error ? err.message : String(err)};
      }
    }

    if (requestedChecks.includes('providers')) {
      const allProviders = llmRegistry.listProviders();
      const targetProviders = requestedProviders
        ? allProviders.filter(p => requestedProviders.includes(p))
        : allProviders;

      const providerChecks = targetProviders.map(async (name) => {
        const provider = llmRegistry.get(name);
        if (!provider) return {key: `provider:${name}`, val: {status: 'error', error: 'Not found'}};

        const start = Date.now();
        try {
          const healthy = await withTimeout(provider.healthCheck(), timeout);
          return {
            key: `provider:${name}`,
            val: {
              status: healthy ? 'ok' : 'error',
              latencyMs: Date.now() - start,
            },
          };
        } catch (err) {
          return {
            key: `provider:${name}`,
            val: {status: 'error', latencyMs: Date.now() - start, error: (err as Error).message},
          };
        }
      });

      const settled = await Promise.allSettled(providerChecks);
      settled.forEach(s => {
        if (s.status === 'fulfilled') {
          results[s.value.key] = s.value.val;
        }
      });
    }

    const allHealthy = Object.values(results).every((c: any) => c.status === 'ok');
    return reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? 'ready' : 'degraded',
      filtered: true,
      checks: results,
    });
  });

  /**
   * GET /info
   * Returns detailed server information including capabilities and available tools.
   *
   * @changelog
   * - 2023-10-27: Added CPU usage and environment info.
   * - 2023-10-27: Added response schema.
   */
  fastify.get('/info', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            server: {type: 'object', additionalProperties: true},
            providers: {type: 'object', additionalProperties: true},
            tools: {type: 'object', additionalProperties: true},
            resources: {type: 'number'},
            prompts: {type: 'number'},
            env: {type: 'string'},
            uptime: {type: 'number'},
          },
        },
      },
    },
  }, async (_request, reply) => {
    const tools = toolRegistry.listAll();
    const categories = toolRegistry.getByCategory();

    return reply.send({
      server: {
        name: '@mcp/server',
        version: '1.0.0',
        protocol: 'MCP 2024-11-05',
        node: process.version,
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
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
    });
  });

  /**
   * GET /diagnostics/stats
   * Real-time server statistics.
   *
   * @changelog
   * - 2023-10-27: New endpoint for monitoring.
   */
  fastify.get('/diagnostics/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            uptime: {type: 'number'},
            cpu: {type: 'object', additionalProperties: true},
            memory: {type: 'object', additionalProperties: true},
            activeHandles: {type: 'number'},
          },
        },
      },
    },
  }, async (_request, reply) => {
    const usage = process.cpuUsage();
    const mem = process.memoryUsage();

    return reply.send({
      uptime: process.uptime(),
      cpu: {
        user: usage.user,
        system: usage.system,
      },
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
      },
      activeHandles: (process as any)._getActiveHandles().length, // Note: _getActiveHandles is internal Node API but useful for diagnostics
    });
  });

  /**
   * POST /diagnostics/toggle
   * Toggles simulation states for testing failure scenarios.
   * Allows testing of 503 responses without actually breaking dependencies.
   *
   * @changelog
   * - 2023-10-27: New endpoint for failure injection logic.
   */
  fastify.post<{
    Body: {
      failDatabase?: boolean;
      failProvider?: string | null;
      addLatency?: number
    };
  }>('/diagnostics/toggle', {
    schema: {
      body: {
        type: 'object',
        properties: {
          failDatabase: {type: 'boolean'},
          failProvider: {type: ['string', 'null']}, // null to reset
          addLatency: {type: 'number'}, // ms to add
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: {type: 'string'},
            currentState: {type: 'object'},
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    if (body.failDatabase !== undefined) {
      simulationState.failDatabase = body.failDatabase;
    }

    if (body.failProvider !== undefined) {
      simulationState.failProvider = body.failProvider;
    }

    if (body.addLatency !== undefined) {
      simulationState.latencyMs = body.addLatency;
    }

    return reply.send({
      message: 'Simulation state updated',
      currentState: simulationState,
    });
  });
};
