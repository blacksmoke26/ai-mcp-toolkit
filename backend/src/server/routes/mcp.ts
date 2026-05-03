/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/mcp
 * @description MCP protocol endpoint — JSON-RPC 2.0 over HTTP.
 *
 * This route handles all MCP protocol communication:
 *
 * - Single requests via `POST /mcp`
 * - Batch requests via `POST /mcp` (array of requests)
 * - Dedicated batch with options via `POST /mcp/batch`
 * - Server-Sent Events (SSE) streaming via `GET /mcp/sse`
 * - Health checks via `GET /mcp/health`
 * - Detailed health via `GET /mcp/health?detailed=true`
 * - Server capabilities via `GET /mcp/capabilities`
 * - Protocol version via `GET /mcp/version`
 * - Request statistics via `GET /mcp/stats`
 * - Debug echo via `POST /mcp/debug/echo`
 * - Request validation via `POST /mcp/debug/validate`
 *
 * ## MCP Client Configuration
 *
 * To connect an MCP client to this server:
 *
 * ```json
 * {
 *   "mcpServers": {
 *     "my-server": {
 *       "url": "http://localhost:3100/mcp",
 *       "transport": "sse"
 *     }
 *   }
 * }
 * ```
 *
 * ## Example Requests
 *
 * List tools:
 * ```bash
 * curl -X POST http://localhost:3100/mcp \
 *   -H "Content-Type: application/json" \
 *   -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
 * ```
 *
 * Call a tool:
 * ```bash
 * curl -X POST http://localhost:3100/mcp \
 *   -H "Content-Type: application/json" \
 *   -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello!"}}}'
 * ```
 */

import type {FastifyPluginAsync} from 'fastify';
import {JsonRpcRequest, JsonRpcResponse, McpMethods} from '@/mcp/types';
import {protocolHandler} from '@/mcp/protocol';
import {logger} from '@/utils/logger';

// Constants for JSON-RPC error codes
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;

/** Maximum batch size to prevent resource exhaustion */
const MAX_BATCH_SIZE = 100;

/** Default per-item timeout in milliseconds for batch processing */
const DEFAULT_BATCH_TIMEOUT = 30_000;

/** SSE connection timeout in milliseconds (5 minutes) */
const SSE_CONNECTION_TIMEOUT = 5 * 60_000;

/** SSE keep-alive interval in milliseconds */
const SSE_KEEPALIVE_INTERVAL = 15_000;

/** Server start time for uptime calculation */
const serverStartTime = Date.now();

/** In-memory request statistics */
const stats = {
  totalRequests: 0,
  totalBatchRequests: 0,
  totalSseConnections: 0,
  activeSseConnections: 0,
  errorCount: 0,
  lastRequestAt: null as string | null,
};

/**
 * Helper to construct a JSON-RPC error response.
 *
 * @changelog
 * - 2023-10-27: Initial implementation.
 */
const createJsonRpcError = (
  code: number,
  message: string,
  id: string | number | null | undefined,
  data?: unknown,
): JsonRpcResponse => ({
  jsonrpc: '2.0',
  error: {code, message, data},
  id: id ?? null,
});

/**
 * Helper to construct a JSON-RPC success response.
 *
 * @changelog
 * - 2023-10-27: Initial implementation.
 */
const createJsonRpcResult = (
  result: unknown,
  id: string | number | null | undefined,
): JsonRpcResponse => ({
  jsonrpc: '2.0',
  result,
  id: id ?? null,
});

/**
 * Checks if a request is a notification (no id field or id is null).
 * Per JSON-RPC 2.0 spec, notifications must not receive a response.
 *
 * @changelog
 * - 2023-10-27: Initial implementation.
 */
const isNotification = (req: Partial<JsonRpcRequest>): boolean =>
  req.id === undefined || req.id === null;

/**
 * Performs logic-level validation on a single JSON-RPC request object.
 * Returns a JSON-RPC error response if invalid, or null if valid.
 *
 * @changelog
 * - 2023-10-27: Initial implementation.
 * - 2023-10-27: Added reserved method prefix check (rpc.* per JSON-RPC 2.0 spec).
 * - 2023-10-27: Added empty method string check.
 * - 2023-10-27: Added params type validation (must be object or array if present).
 * - 2023-10-27: Added numeric ID integer check.
 */
const validateJsonRpcRequest = (
  req: Partial<JsonRpcRequest>,
): JsonRpcResponse | null => {
  if (typeof req !== 'object' || req === null || Array.isArray(req)) {
    return createJsonRpcError(
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Request must be an object',
      null,
    );
  }

  if (req.jsonrpc !== '2.0') {
    return createJsonRpcError(
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Invalid JSON-RPC version',
      req.id,
    );
  }

  if (typeof req.method !== 'string' || req.method.trim() === '') {
    return createJsonRpcError(
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Method must be a non-empty string',
      req.id,
    );
  }

  // Reserved method prefix (JSON-RPC 2.0 spec: rpc.* is reserved for system use)
  if (req.method.startsWith('rpc.')) {
    return createJsonRpcError(
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Method names starting with "rpc." are reserved',
      req.id,
    );
  }

  // Params, if present, must be a structured value (object or array), not a primitive
  if (
    req.params !== undefined &&
    req.params !== null &&
    (typeof req.params !== 'object' || req.params === null)
  ) {
    return createJsonRpcError(
      JSON_RPC_ERRORS.INVALID_PARAMS,
      'Params must be an object or array',
      req.id,
    );
  }

  // Numeric IDs must be integers per best practice
  if (
    req.id !== undefined &&
    req.id !== null &&
    typeof req.id === 'number' &&
    !Number.isInteger(req.id)
  ) {
    return createJsonRpcError(
      JSON_RPC_ERRORS.INVALID_REQUEST,
      'Numeric ID must be an integer',
      req.id,
    );
  }

  return null;
};

/**
 * Processes a single JSON-RPC request.
 * Returns null for notifications (no response expected per spec).
 *
 * @changelog
 * - 2023-10-27: Initial implementation.
 * - 2023-10-27: Added notification handling — returns null for id-less requests.
 * - 2023-10-27: Added validation before protocol dispatch.
 */
const processSingleRequest = async (
  req: Partial<JsonRpcRequest>,
): Promise<JsonRpcResponse | null> => {
  const validationError = validateJsonRpcRequest(req);
  if (validationError) {
    return isNotification(req) ? null : validationError;
  }

  try {
    const response = await protocolHandler.handleRequest(req as JsonRpcRequest);
    return isNotification(req) ? null : response;
  } catch (err) {
    logger.error({err, method: req.method}, 'Unhandled MCP error');
    stats.errorCount++;
    return isNotification(req)
      ? null
      : createJsonRpcError(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', req.id);
  }
};

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /mcp
   * Handles single and batch JSON-RPC requests.
   *
   * @description
   * Handles core MCP protocol communication. Supports both single object requests
   * and batch array requests as per JSON-RPC 2.0 specification.
   * Notifications (requests without an id) are processed but produce no response.
   * Batch responses filter out notification nulls; if all are notifications, 204 is returned.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation for strict type checking.
   * - 2023-10-27: Implemented specific JSON-RPC error handling for invalid payloads.
   * - 2023-10-27: Added check for empty batch arrays (returns empty array per spec).
   * - 2023-10-27: Optimized batch processing logic.
   * - 2023-10-27: Added batch size limit (MAX_BATCH_SIZE=100) to prevent DoS.
   * - 2023-10-27: Added notification handling per JSON-RPC 2.0 spec (no response for id-less requests).
   * - 2023-10-27: Added reserved method prefix check (rpc.*).
   * - 2023-10-27: Added request statistics tracking.
   * - 2023-10-27: Per-item validation in batch — invalid items produce individual errors, not batch rejection.
   * - 2023-10-27: Return 204 when all batch items are notifications.
   * - 2023-10-27: Added minLength on method schema, integer check on numeric IDs.
   * - 2023-10-27: Relaxed batch item schema so per-item handler validation can produce per-item errors.
   */
  fastify.post<{
    Body: JsonRpcRequest | JsonRpcRequest[] | null;
  }>(
    '/mcp',
    {
      schema: {
        body: {
          oneOf: [
            {
              type: 'object',
              required: ['jsonrpc', 'method'],
              properties: {
                jsonrpc: {type: 'string', const: '2.0'},
                method: {type: 'string', minLength: 1},
                id: {type: ['string', 'number', 'null']},
                params: {
                  oneOf: [{type: 'object'}, {type: 'array'}],
                },
              },
              additionalProperties: true,
            },
            {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  jsonrpc: {type: 'string'},
                  method: {type: 'string'},
                  id: {},
                  params: {},
                },
              },
            },
          ],
        },
      },
      errorHandler: (error, _request, reply) => {
        if (error.validation) {
          logger.warn({validation: error.validation}, 'MCP Validation Error');
          const response = createJsonRpcError(
            JSON_RPC_ERRORS.INVALID_REQUEST,
            'Invalid Request: Schema validation failed',
            null,
            error.validation,
          );
          return reply.status(400).send(response);
        }
        const response = createJsonRpcError(
          JSON_RPC_ERRORS.INTERNAL_ERROR,
          'Internal Server Error',
          null,
        );
        return reply.status(500).send(response);
      },
    },
    async (request, reply) => {
      const body = request.body;

      if (body === null || body === undefined) {
        const response = createJsonRpcError(
          JSON_RPC_ERRORS.PARSE_ERROR,
          'Parse error: No valid JSON body found',
          null,
        );
        return reply.status(400).send(response);
      }

      // --- Single request ---
      if (!Array.isArray(body)) {
        const rpcRequest = body as JsonRpcRequest;
        logger.debug({method: rpcRequest.method, id: rpcRequest.id}, 'MCP request');

        stats.totalRequests++;
        stats.lastRequestAt = new Date().toISOString();

        const result = await processSingleRequest(rpcRequest);

        // Notification: no response per JSON-RPC 2.0 spec
        if (result === null) {
          return reply.status(204).send();
        }

        return reply.send(result);
      }

      // --- Batch request ---
      const batch = body as JsonRpcRequest[];
      logger.debug({count: batch.length}, 'MCP batch request');

      stats.totalBatchRequests++;
      stats.totalRequests += batch.length;
      stats.lastRequestAt = new Date().toISOString();

      // Empty array per JSON-RPC 2.0 spec
      if (batch.length === 0) {
        return reply.send([]);
      }

      // Batch size limit
      if (batch.length > MAX_BATCH_SIZE) {
        return reply.send(
          createJsonRpcError(
            JSON_RPC_ERRORS.SERVER_ERROR,
            `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE}`,
            null,
          ),
        );
      }

      const responses = await Promise.all(
        batch.map(async (req) => {
          try {
            return await processSingleRequest(req);
          } catch (err) {
            logger.error({err, method: req.method}, 'Batch item failed');
            stats.errorCount++;
            return isNotification(req)
              ? null
              : createJsonRpcError(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', req.id);
          }
        }),
      );

      // Filter out nulls (notifications)
      const nonNullResponses = responses.filter(
        (r): r is JsonRpcResponse => r !== null,
      );

      if (nonNullResponses.length === 0) {
        return reply.status(204).send();
      }

      return reply.send(nonNullResponses);
    },
  );

  /**
   * POST /mcp/batch
   * Dedicated batch endpoint with concurrency and execution options.
   *
   * @description
   * Provides advanced batch processing with configurable concurrency,
   * per-item timeout, and fail-fast behavior. Accepts query parameters
   * for tweaking execution strategy.
   *
   * @changelog
   * - 2023-10-27: New endpoint for advanced batch processing with concurrency control.
   * - 2023-10-27: Added fail-fast mode that stops processing on first error.
   * - 2023-10-27: Added per-item timeout support.
   * - 2023-10-27: Added sequential execution mode via concurrency=1.
   * - 2023-10-27: Chunk-based concurrency implementation for predictable resource usage.
   */
  fastify.post<{
    Body: JsonRpcRequest[];
    Querystring: {
      concurrency?: number;
      timeout?: number;
      failFast?: boolean;
    };
  }>(
    '/mcp/batch',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            concurrency: {type: 'number', minimum: 1, maximum: MAX_BATCH_SIZE, default: MAX_BATCH_SIZE},
            timeout: {type: 'number', minimum: 100, maximum: 60_000, default: DEFAULT_BATCH_TIMEOUT},
            failFast: {type: 'boolean', default: false},
          },
          additionalProperties: false,
        },
        body: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              jsonrpc: {type: 'string'},
              method: {type: 'string'},
              id: {},
              params: {},
            },
          },
        },
        response: {
          200: {
            oneOf: [
              {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['jsonrpc'],
                  properties: {
                    jsonrpc: {type: 'string'},
                    result: {},
                    error: {
                      type: 'object',
                      properties: {
                        code: {type: 'number'},
                        message: {type: 'string'},
                        data: {},
                      },
                    },
                    id: {type: ['string', 'number', 'null']},
                  },
                },
              },
              {
                type: 'object',
                required: ['jsonrpc'],
                properties: {
                  jsonrpc: {type: 'string'},
                  error: {
                    type: 'object',
                    properties: {
                      code: {type: 'number'},
                      message: {type: 'string'},
                    },
                  },
                  id: {type: ['string', 'number', 'null']},
                },
              },
            ],
          },
        },
      },
      errorHandler: (error, _request, reply) => {
        if (error.validation) {
          logger.warn({validation: error.validation}, 'MCP Batch Validation Error');
          return reply.status(400).send(
            createJsonRpcError(
              JSON_RPC_ERRORS.INVALID_REQUEST,
              'Invalid Batch Request: Schema validation failed',
              null,
              error.validation,
            ),
          );
        }
        return reply.status(500).send(
          createJsonRpcError(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal Server Error', null),
        );
      },
    },
    async (request, reply) => {
      const batch = request.body as JsonRpcRequest[];
      const concurrency = Math.min(
        request.query.concurrency ?? MAX_BATCH_SIZE,
        MAX_BATCH_SIZE,
      );
      const timeout = request.query.timeout ?? DEFAULT_BATCH_TIMEOUT;
      const failFast = request.query.failFast ?? false;

      stats.totalBatchRequests++;
      stats.totalRequests += batch.length;
      stats.lastRequestAt = new Date().toISOString();

      if (batch.length === 0) {
        return reply.send([]);
      }

      if (batch.length > MAX_BATCH_SIZE) {
        return reply.send(
          createJsonRpcError(
            JSON_RPC_ERRORS.SERVER_ERROR,
            `Batch size exceeds maximum limit of ${MAX_BATCH_SIZE}`,
            null,
          ),
        );
      }

      let aborted = false;
      const results: (JsonRpcResponse | null)[] = new Array(batch.length).fill(null);

      // Process in chunks for controlled concurrency
      for (let offset = 0; offset < batch.length && !aborted; offset += concurrency) {
        const chunkEnd = Math.min(offset + concurrency, batch.length);
        const chunk = batch.slice(offset, chunkEnd);

        const chunkResults = await Promise.all(
          chunk.map(async (req, chunkIndex) => {
            if (aborted) {
              return {index: offset + chunkIndex, result: null as JsonRpcResponse | null};
            }

            const globalIndex = offset + chunkIndex;

            try {
              const result = await Promise.race([
                processSingleRequest(req),
                new Promise<JsonRpcResponse>((_, reject) =>
                  setTimeout(
                    () => reject(new Error(`Request timeout after ${timeout}ms`)),
                    timeout,
                  ),
                ),
              ]);

              if (failFast && result && 'error' in result) {
                aborted = true;
              }

              return {index: globalIndex, result};
            } catch (err) {
              stats.errorCount++;

              if (failFast) {
                aborted = true;
              }

              const errorResult = isNotification(req)
                ? null
                : createJsonRpcError(
                  err instanceof Error && err.message.includes('timeout')
                    ? JSON_RPC_ERRORS.SERVER_ERROR
                    : JSON_RPC_ERRORS.INTERNAL_ERROR,
                  err instanceof Error ? err.message : 'Internal error',
                  req.id,
                );

              return {index: globalIndex, result: errorResult};
            }
          }),
        );

        for (const {index, result} of chunkResults) {
          results[index] = result;
        }
      }

      // If aborted due to fail-fast, fill remaining slots with cancellation errors
      if (aborted) {
        for (let i = 0; i < results.length; i++) {
          if (results[i] === null && !isNotification(batch[i])) {
            results[i] = createJsonRpcError(
              JSON_RPC_ERRORS.SERVER_ERROR,
              'Request cancelled due to fail-fast',
              batch[i].id,
            );
          }
        }
      }

      const nonNullResponses = results.filter(
        (r): r is JsonRpcResponse => r !== null,
      );

      if (nonNullResponses.length === 0) {
        return reply.status(204).send();
      }

      return reply.send(nonNullResponses);
    },
  );

  /**
   * GET /mcp/sse
   * Server-Sent Events endpoint for MCP streaming.
   *
   * @description
   * Establishes a long-lived connection for real-time updates.
   * Implements keep-alive mechanism, Last-Event-ID support for reconnection,
   * event IDs for replay capability, connection timeout, and proper cleanup.
   *
   * @changelog
   * - 2023-10-27: Added proper headers for proxy buffering (X-Accel-Buffering).
   * - 2023-10-27: Improved cleanup logic for connection close.
   * - 2023-10-27: Added explicit error handling for stream write failures.
   * - 2023-10-27: Added Last-Event-ID header support for SSE reconnection.
   * - 2023-10-27: Added event IDs on every event for replay capability.
   * - 2023-10-27: Added SSE connection statistics tracking.
   * - 2023-10-27: Added connection timeout (5 minutes) to prevent stale connections.
   * - 2023-10-27: Added writableEnded/writableDestroyed guards on keepalive and close.
   */
  fastify.get('/mcp/sse', async (request, reply) => {
    stats.totalSseConnections++;
    stats.activeSseConnections++;

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': request.raw.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.flushHeaders();

    let eventCounter = 0;
    const nextEventId = (): string => {
      eventCounter++;
      return `evt-${Date.now()}-${eventCounter}`;
    };

    // Send initial connection event
    const endpointUrl = `${request.protocol}://${request.hostname}/mcp`;
    const initialId = nextEventId();

    if (!reply.raw.write(`id: ${initialId}\nevent: endpoint\ndata: ${endpointUrl}\n\n`)) {
      logger.warn('SSE initial write failed, client might have disconnected immediately');
      stats.activeSseConnections--;
      return;
    }

    // Handle Last-Event-ID for reconnection
    const lastEventId = request.headers['last-event-id'];
    if (lastEventId) {
      logger.debug({lastEventId}, 'SSE client reconnecting with Last-Event-ID');
      const reconnectId = nextEventId();
      reply.raw.write(
        `id: ${reconnectId}\nevent: reconnect\ndata: {"lastEventId":"${lastEventId}"}\n\n`,
      );
    }

    // Keep-alive ping
    const keepAliveInterval = setInterval(() => {
      if (reply.raw.writableEnded || reply.raw.destroyed) {
        clearInterval(keepAliveInterval);
        return;
      }
      try {
        const kaId = nextEventId();
        reply.raw.write(`id: ${kaId}\n: keepalive\n\n`);
      } catch (e) {
        logger.debug('SSE keepalive failed, stopping interval');
        clearInterval(keepAliveInterval);
      }
    }, SSE_KEEPALIVE_INTERVAL);

    // Connection timeout to prevent stale connections
    const connectionTimeout = setTimeout(() => {
      if (!reply.raw.writableEnded && !reply.raw.destroyed) {
        try {
          const closeId = nextEventId();
          reply.raw.write(
            `id: ${closeId}\nevent: close\ndata: {"reason":"timeout","message":"Connection timed out after ${SSE_CONNECTION_TIMEOUT / 1000}s"}\n\n`,
          );
          reply.raw.end();
        } catch (e) {
          logger.debug('SSE timeout close failed');
        }
      }
      clearInterval(keepAliveInterval);
    }, SSE_CONNECTION_TIMEOUT);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(keepAliveInterval);
      clearTimeout(connectionTimeout);
      stats.activeSseConnections--;
      logger.debug('SSE client disconnected');
    });
  });

  /**
   * GET /mcp/health
   * Health check endpoint for the MCP service.
   *
   * @description
   * Returns the operational status of the MCP server.
   * Supports ?detailed=true for extended health information including
   * uptime, memory usage, and request statistics.
   *
   * @changelog
   * - 2023-10-27: New endpoint added for monitoring and load balancer checks.
   * - 2023-10-27: Added ?detailed=true query parameter for extended diagnostics.
   * - 2023-10-27: Added uptime, memory, and request statistics in detailed mode.
   * - 2023-10-27: Added JSON Schema for querystring and response validation.
   */
  fastify.get<{
    Querystring: {detailed?: boolean};
  }>(
    '/mcp/health',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            detailed: {type: 'boolean', default: false},
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: ['status', 'timestamp'],
            properties: {
              status: {type: 'string'},
              timestamp: {type: 'string'},
              uptime: {type: 'number'},
              memory: {
                type: 'object',
                properties: {
                  rss: {type: 'number'},
                  heapTotal: {type: 'number'},
                  heapUsed: {type: 'number'},
                  external: {type: 'number'},
                },
              },
              stats: {
                type: 'object',
                properties: {
                  totalRequests: {type: 'number'},
                  totalBatchRequests: {type: 'number'},
                  totalSseConnections: {type: 'number'},
                  activeSseConnections: {type: 'number'},
                  errorCount: {type: 'number'},
                  lastRequestAt: {type: ['string', 'null']},
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const base = {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      };

      if (!request.query.detailed) {
        return reply.send(base);
      }

      const memUsage = process.memoryUsage();

      return reply.send({
        ...base,
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
        },
        stats: {
          totalRequests: stats.totalRequests,
          totalBatchRequests: stats.totalBatchRequests,
          totalSseConnections: stats.totalSseConnections,
          activeSseConnections: stats.activeSseConnections,
          errorCount: stats.errorCount,
          lastRequestAt: stats.lastRequestAt,
        },
      });
    },
  );

  /**
   * GET /mcp/capabilities
   * Server capabilities discovery endpoint.
   *
   * @description
   * Returns the MCP server capabilities, supported methods, and
   * protocol version. Useful for clients to discover what the server supports
   * before issuing JSON-RPC requests.
   *
   * @changelog
   * - 2023-10-27: New endpoint for server capability discovery.
   * - 2023-10-27: Added supported methods list and transport options.
   * - 2023-10-27: Added JSON Schema response validation.
   */
  fastify.get(
    '/mcp/capabilities',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['protocolVersion', 'capabilities', 'serverInfo'],
            properties: {
              protocolVersion: {type: 'string'},
              capabilities: {
                type: 'object',
                properties: {
                  tools: {
                    type: 'object',
                    properties: {
                      supported: {type: 'boolean'},
                    },
                  },
                  resources: {
                    type: 'object',
                    properties: {
                      supported: {type: 'boolean'},
                      subscribe: {type: 'boolean'},
                    },
                  },
                  prompts: {
                    type: 'object',
                    properties: {
                      supported: {type: 'boolean'},
                    },
                  },
                  logging: {
                    type: 'object',
                    properties: {
                      supported: {type: 'boolean'},
                    },
                  },
                },
              },
              serverInfo: {
                type: 'object',
                properties: {
                  name: {type: 'string'},
                  version: {type: 'string'},
                },
              },
              transports: {
                type: 'array',
                items: {type: 'string'},
              },
              methods: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {supported: true},
          resources: {supported: true, subscribe: true},
          prompts: {supported: true},
          logging: {supported: true},
        },
        serverInfo: {
          name: 'mcp-server',
          version: '1.0.0',
        },
        transports: ['http', 'sse'],
        methods: Object.values(McpMethods),
      });
    },
  );

  /**
   * GET /mcp/version
   * Protocol version endpoint.
   *
   * @description
   * Returns the MCP protocol version, JSON-RPC version, and server version.
   * Lightweight alternative to /capabilities for version checks.
   *
   * @changelog
   * - 2023-10-27: New endpoint for version information.
   * - 2023-10-27: Added JSON Schema response validation.
   */
  fastify.get(
    '/mcp/version',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['protocolVersion', 'jsonRpcVersion', 'serverVersion'],
            properties: {
              protocolVersion: {type: 'string'},
              jsonRpcVersion: {type: 'string'},
              serverVersion: {type: 'string'},
              buildDate: {type: 'string'},
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        protocolVersion: '2024-11-05',
        jsonRpcVersion: '2.0',
        serverVersion: '1.0.0',
        buildDate: new Date(serverStartTime).toISOString(),
      });
    },
  );

  /**
   * GET /mcp/stats
   * Server statistics endpoint.
   *
   * @description
   * Returns runtime statistics about the MCP server including
   * request counts, error rates, and connection information.
   * Supports ?reset=true to reset counters (useful for testing/debugging).
   *
   * @changelog
   * - 2023-10-27: New endpoint for server statistics.
   * - 2023-10-27: Added ?reset=true query parameter to reset counters.
   * - 2023-10-27: Added errorRate computed field.
   * - 2023-10-27: Added JSON Schema for querystring and response validation.
   */
  fastify.get<{
    Querystring: {reset?: boolean};
  }>(
    '/mcp/stats',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            reset: {type: 'boolean', default: false},
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            required: [
              'totalRequests',
              'totalBatchRequests',
              'totalSseConnections',
              'activeSseConnections',
              'errorCount',
              'uptime',
              'errorRate',
            ],
            properties: {
              totalRequests: {type: 'number'},
              totalBatchRequests: {type: 'number'},
              totalSseConnections: {type: 'number'},
              activeSseConnections: {type: 'number'},
              errorCount: {type: 'number'},
              lastRequestAt: {type: ['string', 'null']},
              uptime: {type: 'number'},
              errorRate: {type: 'number'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const snapshot = {
        totalRequests: stats.totalRequests,
        totalBatchRequests: stats.totalBatchRequests,
        totalSseConnections: stats.totalSseConnections,
        activeSseConnections: stats.activeSseConnections,
        errorCount: stats.errorCount,
        lastRequestAt: stats.lastRequestAt,
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        errorRate:
          stats.totalRequests > 0
            ? Number(((stats.errorCount / stats.totalRequests) * 100).toFixed(2))
            : 0,
      };

      if (request.query.reset) {
        stats.totalRequests = 0;
        stats.totalBatchRequests = 0;
        stats.totalSseConnections = 0;
        stats.errorCount = 0;
        stats.lastRequestAt = null;
        logger.info('Stats counters reset via /mcp/stats?reset=true');
      }

      return reply.send(snapshot);
    },
  );

  /**
   * POST /mcp/debug/echo
   * Debug endpoint for testing MCP structures.
   *
   * @description
   * Echoes back the request payload wrapped in a valid JSON-RPC response.
   * Useful for testing client serialization, connectivity, and latency.
   * Supports query parameters for simulating delays and error responses.
   *
   * @changelog
   * - 2023-10-27: New endpoint added for debugging and tweaking client implementations.
   * - 2023-10-27: Added ?delay=ms query parameter for latency simulation.
   * - 2023-10-27: Added ?simulateError=true to test error response handling.
   * - 2023-10-27: Added ?statusCode=N to test different HTTP status codes.
   * - 2023-10-27: Added request body size tracking in response metadata.
   * - 2023-10-27: Added JSON Schema for querystring, body, and response validation.
   */
  fastify.post<{
    Body: Record<string, unknown>;
    Querystring: {
      delay?: number;
      simulateError?: boolean;
      statusCode?: number;
    };
  }>(
    '/mcp/debug/echo',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            delay: {type: 'number', minimum: 0, maximum: 10_000, default: 0},
            simulateError: {type: 'boolean', default: false},
            statusCode: {type: 'number', minimum: 200, maximum: 599, default: 200},
          },
          additionalProperties: false,
        },
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            required: ['jsonrpc', 'result'],
            properties: {
              jsonrpc: {type: 'string'},
              result: {type: 'object'},
              id: {type: 'string'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {delay = 0, simulateError = false, statusCode = 200} = request.query;

      logger.debug({body: request.body}, 'Debug echo triggered');

      // Simulate delay if requested
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Simulate error response
      if (simulateError) {
        const code = statusCode >= 400 ? statusCode : 500;
        return reply.code(code).send(
          createJsonRpcError(
            JSON_RPC_ERRORS.SERVER_ERROR,
            'Simulated error response',
            'debug-echo',
            {requestedStatusCode: statusCode},
          ),
        );
      }

      const bodySize = Buffer.byteLength(JSON.stringify(request.body), 'utf-8');

      return reply.code(statusCode).send({
        jsonrpc: '2.0',
        result: {
          echoed: request.body,
          meta: {
            receivedAt: new Date().toISOString(),
            clientIp: request.ip,
            bodySizeBytes: bodySize,
            delayApplied: delay,
          },
        },
        id: 'debug-echo',
      });
    },
  );

  /**
   * POST /mcp/debug/validate
   * Debug endpoint for validating JSON-RPC request structures.
   *
   * @description
   * Validates a JSON-RPC request structure without executing it.
   * Returns detailed validation results including field-level checks,
   * errors, and warnings. Useful for client developers to test their
   * request formatting against the JSON-RPC 2.0 specification.
   *
   * @changelog
   * - 2023-10-27: New endpoint for request structure validation.
   * - 2023-10-27: Added detailed validation diagnostics with field-level feedback.
   * - 2023-10-27: Added warning detection for non-spec-recommended patterns.
   * - 2023-10-27: Added JSON Schema response validation.
   */
  fastify.post<{
    Body: unknown;
  }>(
    '/mcp/debug/validate',
    {
      schema: {
        body: {},
        response: {
          200: {
            type: 'object',
            required: ['valid', 'checks'],
            properties: {
              valid: {type: 'boolean'},
              checks: {
                type: 'object',
                properties: {
                  isObject: {type: 'boolean'},
                  hasJsonrpc: {type: 'boolean'},
                  jsonrpcVersion: {type: 'boolean'},
                  hasMethod: {type: 'boolean'},
                  methodType: {type: 'boolean'},
                  methodNotEmpty: {type: 'boolean'},
                  methodNotReserved: {type: 'boolean'},
                  idValid: {type: 'boolean'},
                  paramsValid: {type: 'boolean'},
                  isNotification: {type: 'boolean'},
                },
              },
              errors: {
                type: 'array',
                items: {type: 'string'},
              },
              warnings: {
                type: 'array',
                items: {type: 'string'},
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
      const checks: Record<string, boolean> = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check: is object
      checks.isObject = typeof body === 'object' && body !== null && !Array.isArray(body);
      if (!checks.isObject) {
        errors.push('Request must be a JSON object');
        // Early return: remaining checks are meaningless
        return reply.send({valid: false, checks, errors, warnings});
      }

      const obj = body as Record<string, unknown>;

      // Check: has jsonrpc field
      checks.hasJsonrpc = 'jsonrpc' in obj;
      if (!checks.hasJsonrpc) {
        errors.push('Missing "jsonrpc" field');
      }

      // Check: jsonrpc version is "2.0"
      checks.jsonrpcVersion = obj.jsonrpc === '2.0';
      if (checks.hasJsonrpc && !checks.jsonrpcVersion) {
        errors.push(`Invalid jsonrpc version: expected "2.0", got "${String(obj.jsonrpc)}"`);
      }

      // Check: has method field
      checks.hasMethod = 'method' in obj;
      if (!checks.hasMethod) {
        errors.push('Missing "method" field');
      }

      // Check: method type is string
      checks.methodType = typeof obj.method === 'string';
      if (checks.hasMethod && !checks.methodType) {
        errors.push(`Method must be a string, got "${typeof obj.method}"`);
      }

      // Check: method is non-empty
      checks.methodNotEmpty =
        typeof obj.method === 'string' && (obj.method as string).trim() !== '';
      if (checks.methodType && !checks.methodNotEmpty) {
        errors.push('Method must be a non-empty string');
      }

      // Check: method not reserved (rpc.*)
      checks.methodNotReserved =
        typeof obj.method === 'string' && !(obj.method as string).startsWith('rpc.');
      if (checks.methodType && !checks.methodNotReserved) {
        errors.push('Method names starting with "rpc." are reserved per JSON-RPC 2.0 spec');
      }

      // Check: id validity
      if ('id' in obj) {
        const id = obj.id;
        if (typeof id === 'string' || typeof id === 'number' || id === null) {
          checks.idValid = true;
          // Warning: fractional numeric IDs
          if (typeof id === 'number' && !Number.isInteger(id)) {
            warnings.push('Numeric ID should be an integer (fractional IDs are discouraged per spec)');
            checks.idValid = false;
          }
        } else {
          checks.idValid = false;
          errors.push(`ID must be a string, number, or null, got "${typeof id}"`);
        }
      } else {
        checks.idValid = true; // No id = notification, which is valid
      }

      // Check: is notification
      checks.isNotification = !('id' in obj);

      // Check: params validity
      if ('params' in obj) {
        const params = obj.params;
        checks.paramsValid =
          (typeof params === 'object' && params !== null && !Array.isArray(params)) ||
          Array.isArray(params);
        if (!checks.paramsValid) {
          errors.push('Params must be an object or array if present');
        }
      } else {
        checks.paramsValid = true;
      }

      // Additional warnings
      if ('id' in obj && obj.id === null) {
        warnings.push('ID is null — valid but treated as a notification by some implementations');
      }

      if (typeof obj.method === 'string' && (obj.method as string).length > 64) {
        warnings.push('Method name exceeds 64 characters — some implementations may truncate');
      }

      if (typeof obj.id === 'string' && (obj.id as string).length > 256) {
        warnings.push('String ID exceeds 256 characters — some implementations may not preserve long IDs');
      }

      return reply.send({
        valid: errors.length === 0,
        checks,
        errors,
        warnings,
      });
    },
  );
};
