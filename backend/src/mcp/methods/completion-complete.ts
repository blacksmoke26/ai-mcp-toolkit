/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';

/**
 * Handle `completion/complete` — request autocompletion suggestions for prompt or resource arguments.
 *
 * Per the MCP spec (2025-11-25), this method accepts a `ref` (prompt or resource reference)
 * and an `argument` object with `name` and `value` fields. The server returns completion
 * suggestions as an array of string values.
 *
 * @changelog
 * - v1.3.0: Updated to match MCP spec with `ref` + `argument` params
 */
export default {
  name: McpMethods.COMPLETIONS_COMPLETE,
  description: 'Request autocompletion suggestions for prompt or resource template arguments',
  params: '{ ref: { type: "ref/prompt" | "ref/resource", name?: string | uri: string }, argument: { name: string, value: string } }',
  async handler(params) {
    const p = params as Record<string, unknown>;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Completion params are required and must be an object');
    }

    if (!isPlainObject(p.ref)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'ref is required and must be an object');
    }

    if (!isPlainObject(p.argument)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'argument is required and must be an object');
    }

    const ref = p.ref as Record<string, unknown>;
    const argument = p.argument as Record<string, unknown>;

    if (!isNonEmptyString(ref.type as string)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'ref.type is required and must be a non-empty string');
    }

    if (!isNonEmptyString(argument.name as string)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'argument.name is required and must be a non-empty string');
    }

    if (!isNonEmptyString(argument.value as string)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'argument.value is required and must be a non-empty string');
    }

    const refType = ref.type as string;

    // Validate ref based on type
    if (refType === 'ref/prompt') {
      if (!isNonEmptyString(ref.name as string)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'ref.name is required for ref/prompt');
      }
    } else if (refType === 'ref/resource') {
      if (!isNonEmptyString(ref.uri as string)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'ref.uri is required for ref/resource');
      }
    } else {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, `Invalid ref.type: "${refType}". Must be "ref/prompt" or "ref/resource"`);
    }

    // In a full implementation, this would query the prompt/resource registry for completion suggestions
    // For now, return empty results to indicate no completions are available
    return {
      completion: {
        values: [],
        total: 0,
        hasMore: false,
      },
    };
  },
} as McpMethodSignature;
