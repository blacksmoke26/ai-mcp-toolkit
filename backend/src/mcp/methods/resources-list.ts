/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * Handle `resources/list` — enumerate available resource definitions.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 */
import {type ListResourcesResult, McpMethods, McpMethodSignature} from '@/mcp/types';
import resourceRegistry from '@/mcp/resources/registry';

export default {
  name: McpMethods.RESOURCES_LIST,
  description: 'List all available resources (read-only data sources)',
  params: 'Optional cursor for pagination',
  async handler() {
    const result: ListResourcesResult = {resources: resourceRegistry.listDefinitions()};
    return result;
  },
} as McpMethodSignature;
