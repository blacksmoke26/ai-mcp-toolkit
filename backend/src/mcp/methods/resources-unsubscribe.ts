/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';

/**
 * Handle `resources/unsubscribe` — unsubscribe from resource updates.
 *
 * @changelog
 * - v1.2.0: Initial implementation (returns UNSUPPORTED_OPERATION)
 */
export default {
  name: McpMethods.RESOURCES_UNSUBSCRIBE,
  description: 'Unsubscribe from resource updates',
  params: 'Resource URI',
  async handler() {
    throw new McpProtocolError(ErrorCodes.UNSUPPORTED_OPERATION, 'Resource unsubscription is not supported');
  },
} as McpMethodSignature;
