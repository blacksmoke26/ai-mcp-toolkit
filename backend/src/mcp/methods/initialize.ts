/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {McpMethods, McpMethodSignature} from '@/mcp/types';

export default {
  name: McpMethods.INITIALIZE,
  description: 'Initialize the MCP session and exchange capabilities',
  params: 'Protocol version, client capabilities, client info',
} as McpMethodSignature;
