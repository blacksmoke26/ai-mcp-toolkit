/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/string-replace
 * @description String find and replace tools - text substitution and replacement operations.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** String replace tool */
export const stringReplaceTool = {
  name: 'string_replace',
  description: 'Replace occurrences of a substring within a text. Supports replacing all occurrences or just the first one, with case sensitivity options.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The original text to perform replacement on',
      },
      find: {
        type: 'string',
        description: 'The substring to find and replace',
      },
      replace: {
        type: 'string',
        description: 'The replacement text (can be empty to remove matches)',
      },
      replaceAll: {
        type: 'boolean',
        description: 'Replace all occurrences (true) or just the first one (false)',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Make the search case-sensitive',
      },
    },
    required: ['text', 'find'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const findStr = String(args.find || '');
    const replaceStr = String(args.replace || '');
    const replaceAll = Boolean(args.replaceAll ?? true);
    const caseSensitive = Boolean(args.caseSensitive ?? false);

    if (!text) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Text is required for replacement.',
        }],
        isError: true,
      };
    }

    if (!findStr) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: No "find" pattern specified. Text returned unchanged.',
        }],
      };
    }

    let result = text;
    let matches = 0;

    // Count occurrences
    const searchStr = caseSensitive ? findStr : new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const regex = caseSensitive
      ? new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

    const matchesArray = text.match(regex);
    matches = matchesArray ? matchesArray.length : 0;

    if (matches > 0) {
      if (replaceAll) {
        result = text.replace(regex, replaceStr);
      } else {
        const singleRegex = caseSensitive
          ? new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          : new RegExp(findStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        result = text.replace(singleRegex, replaceStr);
      }
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔄 String Replacement`,
          `─────┬──────────────`,
          `Original:      ${text.length} chars`,
          `Find:          "${findStr}"`,
          `Replace with:  "${replaceStr || '(empty)'}"`,
          `Matches found: ${matches}`,
          `Replace all:   ${replaceAll ? 'Yes' : 'First only'}`,
          `Case sensitive: ${caseSensitive ? 'Yes' : 'No'}`,
          `─────┴──────────────`,
          `Result (${result.length} chars):`,
          `${result}`,
        ].join('\n'),
      }],
    };
  },
};

/** Find in string tool */
export const stringFindTool = {
  name: 'string_find',
  description: 'Find occurrences of a substring within text. Returns positions, count, and context of matches with case sensitivity options.',
  category: 'text-processing',

  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to search in',
      },
      search: {
        type: 'string',
        description: 'The substring to search for',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Make the search case-sensitive',
      },
      limit: {
        type: 'integer',
        description: 'Maximum matches to report (0 = all)',
      },
    },
    required: ['text', 'search'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const text = String(args.text || '');
    const searchStr = String(args.search || '');
    const caseSensitive = Boolean(args.caseSensitive ?? false);
    const limit = Number(args.limit || 0);

    if (!text) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Text is required for search.',
        }],
        isError: true,
      };
    }

    if (!searchStr) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Search string cannot be empty.',
        }],
        isError: true,
      };
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);

    const positions: Array<{index: number; context: string}> = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 15);
      const end = Math.min(text.length, match.index + match[0].length + 15);
      const context = `${match.index > 15 ? '...' : ''}${text.slice(start, end)}${match.index + match[0].length < text.length - 15 ? '...' : ''}`;

      positions.push({
        index: match.index,
        context: context,
      });

      if (limit > 0 && positions.length >= limit) {
        break;
      }
    }

    const totalMatches = positions.length;
    const displayLimit = limit > 0 && positions.length >= limit ? ` (limited to ${limit})` : '';

    return {
      content: [{
        type: 'text',
        text: [
          `🔍 Find Results${displayLimit}`,
          `─────┬──────────────`,
          `Text length:   ${text.length} chars`,
          `Search for:    "${searchStr}"`,
          `Case sensitive: ${caseSensitive ? 'Yes' : 'No'}`,
          `─────┴──────────────`,
          ``,
          totalMatches === 0
            ? `No matches found for "${searchStr}".`
            : [
                `Found ${totalMatches} occurrence${totalMatches === 1 ? '' : 's'}:`,
                ``,
                ...positions.map((pos, idx) => `  ${idx + 1}. Position: ${pos.index} (0-indexed)\n     Context: ${pos.context}`),
              ].join('\n'),
        ].join('\n'),
      }],
    };
  },
};
