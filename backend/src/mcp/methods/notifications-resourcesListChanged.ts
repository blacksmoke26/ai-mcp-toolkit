/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `notifications/resources/list_changed` — indicates the resource list has changed.
 *
 * @changelog
 * - v1.3.0: Initial implementation
 */
export default {
  name: McpMethods.NOTIFICATIONS_RESOURCES_LIST_CHANGED,
  description: 'Notification that the list of available resources has changed',
  params: 'None',
  async handler() {
    return {};
  },
} as McpMethodSignature;