/**
 * @module server/routes/mcp
 * @description MCP protocol endpoint — JSON-RPC 2.0 over HTTP.
 *
 * This route handles all MCP protocol communication:
 *
 * - Single requests via `POST /mcp`
 * - Batch requests via `POST /mcp` (array of requests)
 * - Server-Sent Events (SSE) streaming via `GET /mcp/sse`
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

import type { FastifyPluginAsync } from 'fastify';
import type { JsonRpcRequest } from '@/mcp/types.js';
import { protocolHandler } from '@/mcp/protocol.js';
import { logger } from '@/utils/logger.js';

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /mcp
   * Handles single and batch JSON-RPC requests.
   *
   * - If the body is an object, it's treated as a single request.
   * - If the body is an array, it's treated as a batch request.
   */
  fastify.post('/mcp', async (request, reply) => {
    const body = request.body;

    // Single request
    if (!Array.isArray(body)) {
      const rpcRequest = body as JsonRpcRequest;
      logger.debug({ method: rpcRequest.method, id: rpcRequest.id }, 'MCP request');

      const response = await protocolHandler.handleRequest(rpcRequest);
      return reply.send(response);
    }

    // Batch request
    const batch = body as JsonRpcRequest[];
    logger.debug({ count: batch.length }, 'MCP batch request');

    const responses = await protocolHandler.handleBatch(batch);
    return reply.send(responses);
  });

  /**
   * GET /mcp/sse
   * Server-Sent Events endpoint for MCP streaming.
   *
   * This provides a long-lived connection for receiving
   * real-time updates from the server (tool results, progress, etc.).
   *
   * SSE is the recommended transport for MCP clients that need
   * streaming responses or server-initiated notifications.
   */
  fastify.get('/mcp/sse', async (request, reply) => {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Access-Control-Allow-Origin': request.raw.headers.origin,
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection event
    reply.raw.write(`event: endpoint\ndata: /mcp/sse\n\n`);

    // Keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
      reply.raw.write(': keepalive\n\n');
    }, 30_000);

    // Clean up on disconnect
    request.raw.on('close', () => {
      clearInterval(keepAlive);
      logger.debug('SSE client disconnected');
    });

    // Handle POST messages to this SSE connection
    // In a full implementation, you'd use a message broker here
    // For now, we keep the connection alive for notifications
  });
};
