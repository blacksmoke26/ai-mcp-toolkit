/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {type ListPromptsResult, McpMethods, McpMethodSignature} from '@/mcp/types';
import promptRegistry from '@/mcp/prompts/registry';

/**
 * Handle `prompts/list` — enumerate available prompt definitions.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 */
export default {
  name: McpMethods.PROMPTS_LIST,
  description: 'List all available prompt templates',
  params: 'Optional cursor for pagination',
  async handler() {
    const result: ListPromptsResult = {prompts: promptRegistry.listDefinitions()};
    return result;
  },
} as McpMethodSignature;
