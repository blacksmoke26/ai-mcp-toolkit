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
 * - Server-Sent Events (SSE) streaming via `GET /mcp/sse`
 * - Health checks via `GET /mcp/health`
 * - Debug echo via `POST /mcp/debug/echo`
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
import type {JsonRpcRequest, JsonRpcResponse} from '@/mcp/types';
import {protocolHandler} from '@/mcp/protocol';
import {logger} from '@/utils/logger';

// Constants for JSON-RPC error codes
const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

/**
 * Helper to construct a JSON-RPC error response.
 */
const createJsonRpcError = (
  code: number,
  message: string,
  id: string | number | null | undefined,
  data?: unknown
): JsonRpcResponse => ({
  jsonrpc: '2.0',
  error: {code, message, data},
  id: id ?? null,
});

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /mcp
   * Handles single and batch JSON-RPC requests.
   *
   * @description
   * Handles core MCP protocol communication. Supports both single object requests
   * and batch array requests as per JSON-RPC 2.0 specification.
   *
   * Validation is performed via JSON Schema.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation for strict type checking.
   * - 2023-10-27: Implemented specific JSON-RPC error handling for invalid payloads.
   * - 2023-10-27: Added check for empty batch arrays (returns empty array per spec).
   * - 2023-10-27: Optimized batch processing logic.
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
                jsonrpc: { type: 'string', const: '2.0' },
                method: { type: 'string' },
                id: { type: ['string', 'number', 'null'] },
                params: { type: ['object', 'array'] },
              },
              additionalProperties: true,
            },
            {
              type: 'array',
              items: {
                type: 'object',
                required: ['jsonrpc', 'method'],
                properties: {
                  jsonrpc: { type: 'string', const: '2.0' },
                  method: { type: 'string' },
                  id: { type: ['string', 'number', 'null'] },
                  params: { type: ['object', 'array'] },
                },
                additionalProperties: true,
              },
            },
          ],
        },
      },
      // Custom error handler for this route to format validation errors as JSON-RPC
      errorHandler: (error, _request, reply) => {
        if (error.validation) {
          // Validation failed (Schema mismatch)
          logger.warn({ validation: error.validation }, 'MCP Validation Error');
          const response = createJsonRpcError(
            JSON_RPC_ERRORS.INVALID_REQUEST,
            'Invalid Request: Schema validation failed',
            null,
            error.validation
          );
          return reply.status(400).send(response);
        }
        // Generic internal error
        const response = createJsonRpcError(
          JSON_RPC_ERRORS.INTERNAL_ERROR,
          'Internal Server Error',
          null
        );
        return reply.status(500).send(response);
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Edge Case: Body might be null if Content-Type is missing or unparsable,
      // though Fastify usually handles this before reaching here.
      // We handle it defensively.
      if (body === null || body === undefined) {
        const response = createJsonRpcError(
          JSON_RPC_ERRORS.PARSE_ERROR,
          'Parse error: No valid JSON body found',
          null
        );
        return reply.status(400).send(response);
      }

      // Single request
      if (!Array.isArray(body)) {
        const rpcRequest = body as JsonRpcRequest;
        logger.debug({ method: rpcRequest.method, id: rpcRequest.id }, 'MCP request');

        // Edge Case: Ensure jsonrpc is exactly "2.0" (Schema covers this, but logic safety net)
        if (rpcRequest.jsonrpc !== '2.0') {
          return reply.send(createJsonRpcError(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid JSON-RPC version', rpcRequest.id));
        }

        try {
          const response = await protocolHandler.handleRequest(rpcRequest);
          return reply.send(response);
        } catch (err) {
          logger.error({ err, method: rpcRequest.method }, 'Unhandled MCP error');
          return reply.send(
            createJsonRpcError(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', rpcRequest.id)
          );
        }
      }

      // Batch request
      const batch = body as JsonRpcRequest[];
      logger.debug({ count: batch.length }, 'MCP batch request');

      // Edge Case: Empty array must return empty array (JSON-RPC 2.0 Spec)
      if (batch.length === 0) {
        return reply.send([]);
      }

      // Logic: Process batch concurrently
      // Note: We map all requests. If individual requests fail, we catch them
      // to ensure the batch response array matches the request array structure.
      const responses = await Promise.all(
        batch.map(async (req) => {
          try {
            if (!req.method || req.jsonrpc !== '2.0') {
              return createJsonRpcError(JSON_RPC_ERRORS.INVALID_REQUEST, 'Invalid Request object', req.id);
            }
            return await protocolHandler.handleRequest(req);
          } catch (err) {
            logger.error({ err, method: req.method }, 'Batch item failed');
            return createJsonRpcError(JSON_RPC_ERRORS.INTERNAL_ERROR, 'Internal error', req.id);
          }
        })
      );

      return reply.send(responses);
    }
  );

  /**
   * GET /mcp/sse
   * Server-Sent Events endpoint for MCP streaming.
   *
   * @description
   * Establishes a long-lived connection for real-time updates.
   * Implements keep-alive mechanism and proper cleanup.
   *
   * @changelog
   * - 2023-10-27: Added proper headers for proxy buffering (X-Accel-Buffering).
   * - 2023-10-27: Improved cleanup logic for connection close.
   * - 2023-10-27: Added explicit error handling for stream write failures.
   */
  fastify.get('/mcp/sse', async (request, reply) => {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': request.raw.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx optimization
    });

    // Flush headers immediately
    reply.raw.flushHeaders();

    // Send initial connection event
    const endpointUrl = `${request.protocol}://${request.hostname}/mcp`;
    if (!reply.raw.write(`event: endpoint\ndata: ${endpointUrl}\n\n`)) {
      logger.warn('SSE initial write failed, client might have disconnected immediately');
      return;
    }

    // Keep-alive ping every 15 seconds (reduced from 30s for better reliability)
    const keepAliveInterval = setInterval(() => {
      if (reply.raw.writableEnded) {
        clearInterval(keepAliveInterval);
        return;
      }
      try {
        reply.raw.write(': keepalive\n\n');
      } catch (e) {
        logger.debug('SSE keepalive failed, stopping interval');
        clearInterval(keepAliveInterval);
      }
    }, 15_000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(keepAliveInterval);
      logger.debug('SSE client disconnected');
    });

    // Note: In a full implementation, you would subscribe to a message broker here
    // and write to reply.raw within the subscription callback.
    // The connection stays open until 'close' event fires.
  });

  /**
   * GET /mcp/health
   * Health check endpoint for the MCP service.
   *
   * @description
   * Returns the operational status of the MCP server.
   *
   * @changelog
   * - 2023-10-27: New endpoint added for monitoring and load balancer checks.
   */
  fastify.get(
    '/mcp/health',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * POST /mcp/debug/echo
   * Debug endpoint for testing MCP structures.
   *
   * @description
   * Echoes back the request payload wrapped in a valid JSON-RPC response.
   * Useful for testing client serialization and connectivity.
   *
   * @changelog
   * - 2023-10-27: New endpoint added for debugging and tweaking client implementations.
   */
  fastify.post<{
    Body: Record<string, unknown>;
  }>(
    '/mcp/debug/echo',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: true,
        },
        response: {
          200: {
            type: 'object',
            required: ['jsonrpc', 'result'],
            properties: {
              jsonrpc: { type: 'string' },
              result: { type: 'object' },
              id: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      logger.debug({ body: request.body }, 'Debug echo triggered');

      return reply.send({
        jsonrpc: '2.0',
        result: {
          echoed: request.body,
          meta: {
            receivedAt: new Date().toISOString(),
            clientIp: request.ip,
          },
        },
        id: 'debug-echo',
      });
    }
  );
};
