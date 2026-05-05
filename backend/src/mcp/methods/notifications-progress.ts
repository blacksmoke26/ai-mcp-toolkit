/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

/**
 * Handle `notifications/progress` — out-of-band progress update for long-running operations.
 *
 * @changelog
 * - v1.3.0: Initial implementation
 */
export default {
  name: McpMethods.NOTIFICATION_PROGRESS,
  description: 'Progress update for long-running operations',
  params: 'Progress token, current progress, total (optional)',
  async handler() {
    // Progress notifications are sent from server to client and don't require a response.
    // In a full implementation, this would update an internal progress tracking system.
    return {};
  },
} as McpMethodSignature;