/**
 * @module utils/logger
 * @description Structured JSON logger using Pino.
 * 
 * Provides fast, low-overhead logging with contextual child loggers.
 * In development, logs are pretty-printed for readability.
 * 
 * ## Usage
 * 
 * ```typescript
 * import { logger } from '@/utils/logger';
 * 
 * logger.info('Server started on port %d', 3100);
 * logger.error({ err }, 'Failed to connect to database');
 * 
 * // Child logger with persistent context
 * const reqLog = logger.child({ requestId: 'abc-123' });
 * reqLog.info('Processing request');
 * ```
 */

import pino from 'pino';

export const logger = pino({
  level: (process.env.MCP_LOG_LEVEL as string) || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l' } }
    : undefined,
});

export default logger;
