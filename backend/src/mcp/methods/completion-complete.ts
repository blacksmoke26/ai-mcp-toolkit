/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';

/**
 * Handle `completion/complete` — request argument completions.
 *
 * @changelog
 * - v1.2.0: Initial implementation (returns UNSUPPORTED_OPERATION)
 */
export default {
  name: McpMethods.COMPLETIONS_COMPLETE,
  description: 'Request argument completions',
  params: 'Completion context',
  async handler() {
    throw new McpProtocolError(ErrorCodes.UNSUPPORTED_OPERATION, 'Completions are not supported');
  },
} as McpMethodSignature;
