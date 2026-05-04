/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `notifications/cancelled` — request cancellation notification.
 *
 * @changelog
 * - v1.2.0: Initial implementation
 */
export default {
  name: McpMethods.NOTIFICATION_CANCELLED,
  description: 'Notification that a request was cancelled',
  params: 'None',
  async handler() {
    // Future improvement: integrate with AbortController for actual cancellation
    return {};
  },
} as McpMethodSignature;
