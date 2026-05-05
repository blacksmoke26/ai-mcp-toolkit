/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import { ErrorCodes, McpMethods, McpMethodSignature, type NotificationParams } from '@/mcp/types';
import { McpProtocolError } from '@/mcp/protocol';
import { isNonEmptyString, isPlainObject } from '@/helpers/validator';

/**
 * Handle `logging/message` — server-to-client logging notification.
 *
 * This notification allows the server to send log messages to the client.
 * The client may display these messages, store them, or forward them to
 * a logging system.
 *
 * @changelog
 * - v1.3.0: Initial implementation
 */
export default {
  name: 'logging/message',
  description:
    'Server-to-client notification for log messages. The client may display, store, or forward these messages based on the provided level.',
  params:
    '{ level: LoggingLevel, logger?: string, data?: unknown, timestamp?: string }',
  async handler(params) {
    const p = params as unknown as NotificationParams;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(
        ErrorCodes.INVALID_PARAMS,
        'Logging message params are required and must be an object',
      );
    }

    if (!isNonEmptyString(p.level as string)) {
      throw new McpProtocolError(
        ErrorCodes.INVALID_PARAMS,
        'level is required and must be a non-empty string',
      );
    }

    // Validate level enum values
    const validLevels = [
      'debug',
      'info',
      'notice',
      'warning',
      'error',
      'critical',
      'alert',
      'emergency',
    ];
    if (!validLevels.includes(p.level)) {
      throw new McpProtocolError(
        ErrorCodes.INVALID_PARAMS,
        `Invalid logging level: "${p.level}". Must be one of: ${validLevels.join(', ')}`,
      );
    }

    // In a full implementation, this would route the log message to the client
    // For now, we just acknowledge it
    return {};
  },
} as McpMethodSignature;