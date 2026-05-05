/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';

/**
 * Handle `resources/unsubscribe` — unsubscribe from resource updates.
 *
 * @changelog
 * - v1.2.0: Initial implementation (returns UNSUPPORTED_OPERATION)
 */
export default {
  name: McpMethods.RESOURCES_UNSUBSCRIBE,
  description: 'Unsubscribe from resource updates',
  params: '{ uri: string } — URI of the resource to unsubscribe from',
  async handler(params) {
    const p = params as Record<string, unknown>;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Unsubscribe params are required and must be an object');
    }

    if (!isNonEmptyString(p.uri as string)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'uri is required and must be a non-empty string');
    }

    // Validate URI format
    try {
      new URL(p.uri as string);
    } catch {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, `Invalid resource URI format: ${p.uri}`);
    }

    // In a full implementation, this would remove the client's subscription
    return {};
  },
} as McpMethodSignature;
