/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/string-sub
 * @description String substring extraction and length calculation tools.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** String length tool */
export const stringLengthTool = {
  name: 'string_length',
  description: 'Get the length of a string in characters, words, and lines. Useful for content validation and text analysis.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The string to measure',
      },
      includeWhitespace: {
        type: 'boolean',
        description: 'Include whitespace in character count',
      },
    },
    required: ['text'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const includeWhitespace = Boolean(args.includeWhitespace ?? true);

    const charCount = text.length;
    const charCountNoSpace = text.replace(/\s/g, '').length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lineCount = text ? text.split(/\r\n|\r|\n/).length : 0;
    const bytes = Buffer.from(text, 'utf8').length;

    const usedCharCount = includeWhitespace ? charCount : charCountNoSpace;

    return {
      content: [{
        type: 'text',
        text: [
          `📏 String Length Analysis`,
          `────┬───────`,
          `Characters:  ${charCount.toLocaleString()}`,
          `Chars (no space): ${charCountNoSpace.toLocaleString()}`,
          `Words:       ${wordCount.toLocaleString()}`,
          `Lines:       ${lineCount.toLocaleString()}`,
          `Bytes:       ${bytes.toLocaleString()}`,
          `────┴───────`,
          `Preview: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
        ].join('\n'),
      }],
    };
  },
};

/** String substring extraction tool */
export const substringTool = {
  name: 'string_substring',
  description: 'Extract a substring from a string by specifying start and end positions. Supports negative indices for end-relative positioning.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The string to extract substring from',
      },
      startIndex: {
        type: 'integer',
        description: 'Start position (0-indexed, negative for end-relative)',
      },
      endIndex: {
        type: 'integer',
        description: 'End position (exclusive, omit for end of string)',
      },
      length: {
        type: 'integer',
        description: 'Length of substring to extract (alternative to endIndex)',
      },
    },
    required: ['text', 'startIndex'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const startIndex = Number(args.startIndex ?? 0);
    const endIndex = args.endIndex !== undefined ? Number(args.endIndex) : undefined;
    const length = args.length !== undefined ? Number(args.length) : undefined;

    if (!text) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Text cannot be empty.',
        }],
        isError: true,
      };
    }

    let start = startIndex;

    if (startIndex < 0) {
      start = Math.max(0, text.length + startIndex);
    } else {
      start = Math.min(start, text.length);
    }

    let end: number;

    if (length !== undefined) {
      end = start + length;
    } else if (endIndex !== undefined) {
      end = endIndex < 0 ? text.length + endIndex : endIndex;
    } else {
      end = text.length;
    }

    end = Math.min(end, text.length);
    end = Math.max(end, start);

    const result = text.slice(start, end);

    return {
      content: [{
        type: 'text',
        text: [
          `✂️ Substring Extraction`,
          `────┬───────`,
          `Original: "${text}"`,
          `Length: ${text.length} chars`,
          `Start:   ${startIndex}`,
          `End:     ${endIndex !== undefined ? endIndex : length !== undefined ? `${start} + ${length}` : 'end'}`,
          `────┴───────`,
          `Extracted: ${result}`,
          `Length:    ${result.length} chars`,
        ].join('\n'),
      }],
    };
  },
};
