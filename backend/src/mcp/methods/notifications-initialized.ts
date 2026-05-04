/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `notifications/initialized` — acknowledgment from the client.
 *
 * @changelog
 * - v1.2.0: Initial implementation
 */
export default {
  name: McpMethods.NOTIFICATION_INITIALIZED,
  description: 'Acknowledgment from the client that initialization is complete',
  params: 'None',
  async handler() {
    return {};
  },
} as McpMethodSignature;
