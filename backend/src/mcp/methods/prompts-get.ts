/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, type GetPromptParams, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';
import promptRegistry from '@/mcp/prompts/registry';

/**
 * Handle `prompts/get` — render a prompt by name with optional arguments.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 * - v1.1.0: Added params object validation
 * - v1.1.0: Added prompt name type validation
 * - v1.1.0: Added prompt arguments type validation (must be object if provided)
 */
export default {
  name: McpMethods.PROMPTS_GET,
  description: 'Get a specific prompt template with variable substitution',
  params: 'Prompt name and argument values',
  async handler(params) {
    const p = params as unknown as GetPromptParams;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Prompt get params are required and must be an object');
    }

    if (!isNonEmptyString(p.name)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Prompt name is required and must be a non-empty string');
    }

    if (p.arguments !== undefined) {
      if (!isPlainObject(p.arguments)) {
        throw new McpProtocolError(
          ErrorCodes.INVALID_PARAMS,
          `Prompt arguments must be an object for prompt "${p.name}"`,
        );
      }
    }

    return promptRegistry.render(p.name, p.arguments);
  },
} as McpMethodSignature;
