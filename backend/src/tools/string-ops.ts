/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/string-ops
 * @description String manipulation tools - concatenation, splitting, and basic operations.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** String concatenation tool */
export const stringConcatTool = {
  name: 'string_concat',
  description: 'Concatenate multiple strings together with an optional separator. Useful for joining text, building messages, or combining data fields.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      strings: {
        type: 'array',
        description: 'Array of strings to concatenate',
        items: { type: 'string' },
      },
      separator: {
        type: 'string',
        description: 'Separator to place between strings (default: empty)',
      },
      ignoreEmpty: {
        type: 'boolean',
        description: 'Ignore empty strings in the result',
      },
    },
    required: ['strings'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const strings = Array.isArray(args.strings)
      ? args.strings.map((s) => String(s))
      : [];
    const separator = String(args.separator || '');
    const ignoreEmpty = Boolean(args.ignoreEmpty || false);

    if (strings.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: No strings provided to concatenate.',
        }],
      };
    }

    let filtered = strings;

    if (ignoreEmpty) {
      filtered = strings.filter((s) => s.trim() !== '');
    }

    const result = filtered.join(separator);

    return {
      content: [{
        type: 'text',
        text: [
          `🔗 String Concatenation`,
          `────┬───────`,
          `Input count:     ${strings.length}`,
          `After filter:    ${filtered.length}`,
          `Separator:       "${separator || '(none)'}"`,
          `Result length:   ${result.length} chars`,
          `─┴──────────`,
          `Result:`,
          `${result}`,
        ].join('\n'),
      }],
    };
  },
};

/** String split tool */
export const stringSplitTool = {
  name: 'string_split',
  description: 'Split a string into an array using a delimiter. Supports common delimiters like comma, space, newline, pipe, or custom separators.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The string to split',
      },
      delimiter: {
        type: 'string',
        description: 'Delimiter to split on (comma, space, newline, pipe, or custom)',
        enum: ['comma', 'space', 'newline', 'pipe', 'semicolon', 'tab', 'custom'],
      },
      customDelimiter: {
        type: 'string',
        description: 'Custom delimiter character(s) (used when delimiter is "custom")',
      },
      trim: {
        type: 'boolean',
        description: 'Trim whitespace from each part',
      },
      removeEmpty: {
        type: 'boolean',
        description: 'Remove empty strings from result',
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of parts to return (0 = no limit)',
      },
    },
    required: ['text', 'delimiter'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const delimiter = String(args.delimiter || 'comma');
    const trim = Boolean(args.trim || false);
    const removeEmpty = Boolean(args.removeEmpty || false);
    const limit = Number(args.limit || 0);

    if (!text.trim()) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Text cannot be empty.',
        }],
        isError: true,
      };
    }

    let splitDelimiter: string;

    switch (delimiter) {
      case 'comma':
        splitDelimiter = ',';
        break;
      case 'space':
        splitDelimiter = ' ';
        break;
      case 'newline':
        splitDelimiter = '\n';
        break;
      case 'pipe':
        splitDelimiter = '|';
        break;
      case 'semicolon':
        splitDelimiter = ';';
        break;
      case 'tab':
        splitDelimiter = '\t';
        break;
      case 'custom':
        splitDelimiter = String(args.customDelimiter || '');
        if (!splitDelimiter) {
          return {
            content: [{
              type: 'text',
              text: '❌ Error: When using "custom" delimiter, you must provide "customDelimiter".',
            }],
            isError: true,
          };
        }
        break;
      default:
        splitDelimiter = ',';
    }

    let parts: string[];

    if (limit > 0) {
      parts = text.split(splitDelimiter).slice(0, limit);
    } else {
      parts = text.split(splitDelimiter);
    }

    if (trim) {
      parts = parts.map((p) => p.trim());
    }

    if (removeEmpty) {
      parts = parts.filter((p) => p.length > 0);
    }

    const displayLimit = limit > 0 ? ` (limited to ${limit})` : '';

    return {
      content: [{
        type: 'text',
        text: [
          `✂️  String Split${displayLimit}`,
          `────┬───────`,
          `Delimiter:     "${splitDelimiter === '\n' ? 'newline' : splitDelimiter === '\t' ? 'tab' : splitDelimiter}"`,
          `Trim parts:    ${trim ? 'Yes' : 'No'}`,
          `Remove empty:  ${removeEmpty ? 'Yes' : 'No'}`,
          `Result count:  ${parts.length} parts`,
          `─┴──────────`,
          `Parts:`,
          parts.map((part, idx) => `  ${idx + 1}. ${part || '(empty)'}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};
