/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import { ErrorCodes, McpMethods, McpMethodSignature } from '@/mcp/types';
import { McpProtocolError } from '@/mcp/protocol';
import { isNonEmptyString, isPlainObject } from '@/helpers/validator';

/**
 * Handle `notifications/resources/updated` — server notifies client that a resource has changed.
 *
 * Per MCP spec, this notification carries a `uri` parameter identifying the updated resource.
 *
 * @changelog
 * - v1.3.0: Initial implementation
 */
export default {
  name: McpMethods.RESOURCES_UPDATED,
  description: 'Notify client that a specific resource has been updated',
  params: '{ uri: string } — URI of the updated resource',
  async handler(params) {
    const p = params as Record<string, unknown>;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Resource updated notification params must be an object');
    }

    if (!isNonEmptyString(p.uri as string)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'uri is required and must be a non-empty string');
    }

    // In a full implementation, the server would broadcast this notification to clients
    // subscribed to the resource via resources/subscribe. For now we just acknowledge receipt.
    return {};
  },
} as McpMethodSignature;