/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `ping` — lightweight liveness check.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 */
export default {
  name: McpMethods.PING,
  description: 'Keep-alive / heartbeat check',
  params: 'None',
  async handler() {
    return {};
  },
} as McpMethodSignature;
