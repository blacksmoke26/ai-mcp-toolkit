/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';

/**
 * Handle `logging/setLevel` — set the minimum logging level.
 *
 * @changelog
 * - v1.2.0: Initial implementation
 */
export default {
  name: McpMethods.LOGGING_SET_LEVEL,
  description: 'Set the minimum logging level',
  params: 'Log level (e.g., debug, info, error)',
  async handler(params) {
    const p = params as Record<string, unknown>;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Params are required and must be an object');
    }

    if (!isNonEmptyString(p.level as string)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'level is required and must be a non-empty string');
    }

    // In a full implementation, this would update the server's log level
    return {};
  },
} as McpMethodSignature;
