/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import { McpMethods, McpMethodSignature } from '@/mcp/types';

/**
 * Handle `notifications/prompts/list_changed` — notify that the prompt list has changed.
 *
 * This is a notification (not a request), so no response is expected.
 * Servers that declare the `listChanged` capability should send this notification
 * when the list of available prompts changes.
 *
 * @changelog
 * - v1.3.0: Initial implementation
 */
export default {
  name: McpMethods.NOTIFICATION_PROMPTS_LIST_CHANGED,
  description: 'Notify that the available prompts list has changed',
  params: 'None',
  async handler() {
    // This is a notification handler — clients acknowledge automatically.
    return {};
  },
} as McpMethodSignature;