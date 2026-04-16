/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/base64
 * @description Base64 encoding and decoding tools.
 */

import type { CallToolResult, MCPTool } from '@/mcp/types.js';

/** Base64 encoding tool */
export const base64EncodeTool: MCPTool = {
  name: 'base64_encode',
  description: 'Encode a string or text to Base64 format. Useful for encoding data for URLs, emails, or storage.',
  category: 'encoding',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to encode to Base64',
      },
      urlSafe: {
        type: 'boolean',
        description: 'Use URL-safe Base64 (replaces + with - and / with _)',
      },
    },
    required: ['text'],
  },

  async handler(args: Record<string, unknown>): Promise<CallToolResult> {
    const text = String(args.text || '');
    const urlSafe = Boolean(args.urlSafe || false);

    let encoded: string;

    if (urlSafe) {
      encoded = Buffer.from(text, 'utf8').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } else {
      encoded = Buffer.from(text, 'utf8').toString('base64');
    }

    return {
      content: [{
        type: 'text',
        text: [
          `📤 Base64 Encoding`,
          `───────┬────────`,
          `Original:    "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          `Length:      ${text.length} chars`,
          `───────┴────────`,
          `Encoded:${urlSafe ? ' (URL-safe)' : ''}`,
          `${encoded}`,
        ].join('\n'),
      }],
    };
  },
};

/** Base64 decoding tool */
export const base64DecodeTool: MCPTool = {
  name: 'base64_decode',
  description: 'Decode a Base64 encoded string back to original text. Supports standard and URL-safe Base64.',
  category: 'encoding',

  inputSchema: {
    type: 'object',
    properties: {
      encoded: {
        type: 'string',
        description: 'The Base64 encoded string to decode',
      },
      urlSafe: {
        type: 'boolean',
        description: 'Decode URL-safe Base64 (replaces - with + and _ with /)',
      },
    },
    required: ['encoded'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const encoded = String(args.encoded || '');
    const urlSafe = Boolean(args.urlSafe || false);

    let input = encoded.trim();

    if (urlSafe) {
      input = input
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const padding = 4 - (input.length % 4);
      if (padding !== 4) {
        input += '='.repeat(padding);
      }
    }

    try {
      const decoded = Buffer.from(input, 'base64').toString('utf8');

      return {
        content: [{
          type: 'text',
          text: [
            `📥 Base64 Decoding`,
            `───────┬────────`,
            `Encoded:     "${encoded.substring(0, 50)}${encoded.length > 50 ? '...' : ''}"`,
            `Length:      ${encoded.length} chars`,
            `───────┴────────`,
            `Decoded:${urlSafe ? ' (URL-safe)' : ''}`,
            `${decoded}`,
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Invalid Base64 string. Make sure the input is valid Base64 encoded data.`,
        }],
        isError: true,
      };
    }
  },
};
