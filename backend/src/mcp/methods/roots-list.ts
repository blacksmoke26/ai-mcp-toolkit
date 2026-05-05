/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature, type ListRootsResult} from '@/mcp/types';

/**
 * Handle `roots/list` — list root directories from the client.
 *
 * Per the MCP spec, the client provides a list of filesystem roots that the server may use
 * for file operations. This method is typically used when the server needs to know the
 * available workspace directories.
 *
 * @changelog
 * - v1.2.0: Initial implementation (returns UNSUPPORTED_OPERATION)
 * - v1.3.0: Removed error stub — returns empty array since this server does not require roots
 */
export default {
  name: McpMethods.ROOTS_LIST,
  description: 'List root directories provided by the client',
  params: 'None',
  async handler() {
    // The server doesn't depend on roots, so return an empty list.
    // In a full implementation, this would parse the roots from client capabilities.
    return {roots: []} as ListRootsResult;
  },
} as McpMethodSignature;
