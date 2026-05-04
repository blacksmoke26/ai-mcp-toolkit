/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';

/**
 * Handle `sampling/createMessage` — request LLM sampling.
 *
 * @changelog
 * - v1.2.0: Initial implementation (returns UNSUPPORTED_OPERATION)
 */
export default {
  name: McpMethods.SAMPLING_CREATE_MESSAGE,
  description: 'Request LLM sampling',
  params: 'Sampling request parameters',
  async handler() {
    throw new McpProtocolError(ErrorCodes.UNSUPPORTED_OPERATION, 'Sampling is not supported');
  },
} as McpMethodSignature;
