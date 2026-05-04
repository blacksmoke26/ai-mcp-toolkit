/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature, type ReadResourceParams} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';
import resourceRegistry from '@/mcp/resources/registry';

/**
 * Handle `resources/read` — read a resource by URI.
 *
 * @changelog
 * - v1.0.0: Initial implementation
 * - v1.1.0: Added params object validation
 * - v1.1.0: Added URI type validation
 * - v1.1.0: Added URI format validation via URL constructor
 */
export default {
  name: McpMethods.RESOURCES_READ,
  description: 'Read the content of a specific resource',
  params: 'Resource URI',
  async handler(params) {
    const p = params as unknown as ReadResourceParams;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Resource read params are required and must be an object');
    }

    if (!isNonEmptyString(p.uri)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Resource URI is required and must be a non-empty string');
    }

    // Validate URI format
    try {
      new URL(p.uri);
    } catch {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, `Invalid resource URI format: ${p.uri}`);
    }

    return resourceRegistry.read(p.uri);
  },
} as McpMethodSignature;
