/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `notifications/tools/list_changed` — notify that the tools list has changed.
 *
 * This is a server-to-client notification informing the client that the available tools
 * have been updated and the client should re-fetch the tools list.
 *
 * @changelog
 * - v1.3.0: Initial implementation
 */
export default {
  name: McpMethods.NOTIFICATIONS_TOOLS_LIST_CHANGED,
  description: 'Notify that the tools list has changed and clients should re-fetch it',
  params: 'None (notification)',
  async handler() {
    return {};
  },
} as McpMethodSignature;