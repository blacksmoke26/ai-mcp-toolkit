/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {type ListToolsResult, McpMethods, type McpMethodSignature} from '@/mcp/types';
import toolRegistry from '@/mcp/tools/registry';

/**
 * Handle `tools/list` — enumerate available tool definitions.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 */
export default {
  name: McpMethods.TOOLS_LIST,
  description: 'List all available tools that can be called',
  params: 'Optional cursor for pagination',
  async handler() {
    const result: ListToolsResult = {tools: toolRegistry.listDefinitions()};
    return result;
  },
} as McpMethodSignature;
