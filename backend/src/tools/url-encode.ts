/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/url-encode
 * @description URL encoding and decoding tools for query parameters, fragments, and full URLs.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** URL encoding tool */
export const urlEncodeTool = {
  name: 'url_encode',
  description: 'Encode a string for use in URLs. Converts special characters to percent-encoded format, making them safe for URLs.',
  category: 'encoding',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to encode for URL',
      },
      encodeSpaces: {
        type: 'string',
        description: 'How to encode spaces: "plus" (space becomes +) or "percent" (space becomes %20)',
        enum: ['plus', 'percent'],
      },
    },
    required: ['text'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const encodeSpaces = String(args.encodeSpaces || 'percent');

    let encoded: string;

    if (encodeSpaces === 'plus') {
      encoded = encodeURIComponent(text).replace(/%/g, '%');
      encoded = encoded.replace(/ /g, '+');
      encoded = encodeURIComponent(text)
        .replace(/\+/g, '%2B')
        .replace(/ /g, '+');
      encoded = encodeURI(encodeURIComponent(text))
        .replace(/%20/g, '+');
    } else {
      encoded = encodeURIComponent(text);
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔗 URL Encoding`,
          `───────┬─────────`,
          `Original:    "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
          `Length:      ${text.length} chars`,
          `─┴───────────────`,
          `Encoded (${encodeSpaces} spaces):`,
          `${encoded}`,
        ].join('\n'),
      }],
    };
  },
};

/** URL decoding tool */
export const urlDecodeTool = {
  name: 'url_decode',
  description: 'Decode a URL-encoded string back to its original form. Reverses percent-encoding and converts + back to spaces.',
  category: 'encoding',

  inputSchema: {
    type: 'object',
    properties: {
      encoded: {
        type: 'string',
        description: 'The URL-encoded string to decode',
      },
    },
    required: ['encoded'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const encoded = String(args.encoded || '');

    try {
      // First replace + with space for query string decoding
      const prepared = encoded.replace(/\+/g, ' ');
      const decoded = decodeURIComponent(prepared);

      return {
        content: [{
          type: 'text',
          text: [
            `🔗 URL Decoding`,
            `───────┬─────────`,
            `Encoded:     "${encoded.substring(0, 50)}${encoded.length > 50 ? '...' : ''}"`,
            `Length:      ${encoded.length} chars`,
            `─┴───────────────`,
            `Decoded:`,
            `${decoded}`,
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Invalid URL-encoded string. Make sure the input is valid percent-encoded data.`,
        }],
        isError: true,
      };
    }
  },
};
