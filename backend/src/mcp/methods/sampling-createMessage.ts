/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {ErrorCodes, McpMethods, McpMethodSignature, type CreateMessageParams} from '@/mcp/types';
import {McpProtocolError} from '@/mcp/protocol';
import {isNonEmptyString, isPlainObject} from '@/helpers/validator';

/**
 * Handle `sampling/createMessage` — request LLM sampling.
 *
 * Per the MCP spec, this method allows the server to request that the client
 * create a sampling via an LLM. The server provides a message, model preferences,
 * and system prompt.
 *
 * @changelog
 * - v1.3.0: Updated to include params validation
 */
export default {
  name: McpMethods.SAMPLING_CREATE_MESSAGE,
  description: 'Request the client to create a sampling via an LLM',
  params: '{ messages: SamplingMessage[], modelPreferences?: ModelPreferences, systemPrompt?: string, maxTokens: number }',
  async handler(params) {
    const p = params as unknown as CreateMessageParams;

    if (!isPlainObject(p)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Sampling createMessage params are required and must be an object');
    }

    if (!Array.isArray(p.messages)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'messages is required and must be an array');
    }

    if (p.messages.length === 0) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'messages array must not be empty');
    }

    // Validate each message has required fields
    for (const msg of p.messages) {
      if (!isPlainObject(msg)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Each message must be an object');
      }
      if (!isNonEmptyString(msg.role as string)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Each message must have a non-empty role');
      }
      if (!isNonEmptyString((msg.content as unknown as Record<string, unknown>)?.text as string)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Each message must have non-empty content.text');
      }
    }

    // modelPreferences is optional — no validation needed

    // systemPrompt is optional per MCP spec
    // maxTokens is required and must be a positive number
    if (!(typeof p.maxTokens === 'number') || p.maxTokens <= 0) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'maxTokens is required and must be a positive number');
    }

    // In a full implementation, this would forward the sampling request to the LLM provider
    return {};
  },
} as McpMethodSignature;
