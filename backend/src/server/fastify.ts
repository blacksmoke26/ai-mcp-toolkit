/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/fastify
 * @description Fastify server initialization and configuration.
 *
 * Sets up the Fastify HTTP server with:
 *
 * - CORS support
 * - JSON body parsing
 * - Route registration
 * - Graceful shutdown handling
 * - Request logging
 *
 * ## Usage
 *
 * ```typescript
 * import { createServer } from '@/server/fastify';
 *
 * const server = await createServer();
 * await server.listen({ port: 3100, host: '0.0.0.0' });
 * ```
 */

import Fastify, {type FastifyError} from 'fastify';
import cors from '@fastify/cors';
import {config} from '@/config';
import {healthRoutes} from './routes/health';
import {mcpRoutes} from './routes/mcp';
import {chatRoutes} from './routes/chat';
import {adminRoutes} from './routes/admin';
import {metricsRoutes} from './routes/metrics';
import {simulationRoutes} from './routes/simulation';
import customToolsRoutes from './routes/custom-tools';
import mcpServersRoutes from './routes/mcp-servers';
import promptTemplatesRoutes from './routes/prompt-templates';
import {createWebSocketPlugin} from '@/websocket';
import logger from '@/utils/logger';

/**
 * Create and configure the Fastify server instance.
 *
 * @returns Configured Fastify server ready to listen
 */
export async function createServer() {
  const server = Fastify({
    logger: false, // We use our own Pino logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    // Increase the default body size limit for tool responses
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  });

  /**
   * Handles HEAD requests for all routes.
   * @route HEAD *
   * @returns {204} No Content
   * @developer-note Useful for health checks and CORS preflight requests.
   */
  server.head('*', (_req, reply) => reply.send(204));

  // ─── Plugins ──────────────────────────────────────────────────────────────

  // CORS — allow configurable origins
  await server.register(cors, {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
    strictPreflight: false,
    preflightContinue: true,
    optionsSuccessStatus: 20
  });

  // ─── Routes ───────────────────────────────────────────────────────────────

  await server.register(healthRoutes);
  await server.register(mcpRoutes);
  await server.register(chatRoutes);
  await server.register(adminRoutes);
  await server.register(metricsRoutes);
  await server.register(simulationRoutes);
  await server.register(customToolsRoutes);
  await server.register(mcpServersRoutes);
  await server.register(promptTemplatesRoutes);

  // ─── WebSocket Integration ───────────────────────────────

  await server.register(createWebSocketPlugin());

  // ─── Request Logging Hook ─────────────────────────────────────────────────

  server.addHook('onRequest', async (request) => {
    request.log = logger.child({
      req: {
        method: request.method,
        url: request.url,
        id: request.id,
      },
    }) as never;
  });

  server.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;
    logger.debug(
      {method: request.method, url: request.url, statusCode: reply.statusCode, duration: Math.round(duration)},
      'Request completed',
    );
  });

  // ─── Error Handling ───────────────────────────────────────────────────────

  server.setErrorHandler((error: FastifyError, request, reply) => {
    logger.error({err: error, req: request}, 'Request error');

    if (error.statusCode === 413) {
      return reply.code(413).send({error: 'Request body too large', maxSize: '10MB'});
    }

    return reply.code(error.statusCode || 500).send({
      error: 'Internal Server Error',
      message: config.logLevel === 'debug' ? error.message : undefined,
      requestId: request.id,
    });
  });

  // ─── Not Found Handler ────────────────────────────────────────────────────

  server.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      path: request.url,
      message: `The route ${request.method} ${request.url} does not exist.`,
      hint: 'Visit GET /info for available endpoints.',
    });
  });

  return server;
}
