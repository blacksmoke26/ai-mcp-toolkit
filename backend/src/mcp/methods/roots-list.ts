/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';

/**
 * Handle `roots/list` — list root directories.
 *
 * @changelog
 * - v1.2.0: Initial implementation (returns UNSUPPORTED_OPERATION)
 */
export default {
  name: McpMethods.ROOTS_LIST,
  description: 'List root directories',
  params: 'None',
  async handler() {
    throw new McpProtocolError(ErrorCodes.UNSUPPORTED_OPERATION, 'Roots listing is not supported');
  },
} as McpMethodSignature;
