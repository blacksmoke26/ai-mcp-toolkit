/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `tools/cancel` — tool execution cancellation.
 *
 * @changelog
 * - v1.2.0: Initial implementation
 */
export default {
  name: McpMethods.TOOLS_CANCEL,
  description: 'Request cancellation of a running tool',
  params: 'Request ID to cancel',
  async handler() {
    // Future improvement: integrate with AbortController for actual cancellation
    return {};
  },
} as McpMethodSignature;
