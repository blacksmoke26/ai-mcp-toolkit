/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {type CallToolParams, type CallToolResult, ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import toolRegistry from '@/mcp/tools/registry';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';

/**
 * Handle `tools/call` — invoke a registered tool.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 * - v1.1.0: Added params object validation
 * - v1.1.0: Added tool name type validation
 * - v1.1.0: Added tool arguments type validation (must be object if provided)
 * - v1.1.0: Replaced inline error construction with McpProtocolError
 * - v1.2.0: Added timeout support from `CallToolParams.timeout` with proper timer cleanup
 */
export default {
  name: McpMethods.TOOLS_CALL,
  description: 'Invoke a specific tool with arguments',
  params: 'Tool name and input arguments',
  async handler(params) {
    const p = params as unknown as CallToolParams;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Tool call params are required and must be an object');
    }

    if (!isNonEmptyString(p.name)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Tool name is required and must be a non-empty string');
    }

    const tool = toolRegistry.get(p.name);

    if (!tool) {
      throw new McpProtocolError(ErrorCodes.TOOL_NOT_FOUND, `Tool not found: ${p.name}`);
    }

    if ('enabled' in tool && !((tool as unknown as Record<string, unknown>).enabled)) {
      // NOTE: Using TOOL_NOT_FOUND for disabled tools to preserve backward compatibility.
      throw new McpProtocolError(ErrorCodes.TOOL_NOT_FOUND, `Tool "${p.name}" is currently disabled`);
    }

    if (p.arguments !== undefined) {
      if (!isPlainObject(p.arguments)) {
        throw new McpProtocolError(
          ErrorCodes.INVALID_PARAMS,
          `Tool arguments must be an object for tool "${p.name}"`,
        );
      }
    }

    const args = p.arguments || {};
    const timeout = p.timeout;

    let result: CallToolResult;
    if (typeof timeout === 'number' && timeout > 0) {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new McpProtocolError(ErrorCodes.TIMEOUT, `Tool "${p.name}" timed out after ${timeout}ms`)),
          timeout,
        );
      });

      try {
        result = await Promise.race([tool.handler(args), timeoutPromise]);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    } else {
      result = await tool.handler(args);
    }

    return result;
  },
} as McpMethodSignature;
