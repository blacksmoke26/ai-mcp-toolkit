/**
 * @module tools/array-sort
 * @description Array sorting and filtering tools - sort arrays by various criteria and filter items.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Array sorting tool */
export const arraySortTool = {
  name: 'array_sort',
  description: 'Sort an array of items in ascending or descending order. Supports numbers, strings, and custom sorting options.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of items to sort',
        items: { type: 'string' },
      },
      order: {
        type: 'string',
        description: 'Sort order: ascending or descending',
        enum: ['ascending', 'descending'],
      },
      type: {
        type: 'string',
        description: 'Type of sorting to apply',
        enum: ['numeric', 'alphabetic', 'length'],
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Case-sensitive sorting for strings',
      },
    },
    required: ['items', 'order', 'type'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const items = Array.isArray(args.items)
      ? args.items.map((item) => String(item))
      : [];
    const order = String(args.order || 'ascending');
    const type = String(args.type || 'alphabetic');
    const caseSensitive = Boolean(args.caseSensitive || false);

    if (items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: Empty array provided. Please provide at least one item to sort.',
        }],
      };
    }

    let sorted: string[];

    if (type === 'numeric') {
      sorted = [...items].sort((a, b) => {
        const numA = parseFloat(a) || 0;
        const numB = parseFloat(b) || 0;
        return order === 'ascending' ? numA - numB : numB - numA;
      });
    } else if (type === 'length') {
      sorted = [...items].sort((a, b) => {
        return order === 'ascending' ? a.length - b.length : b.length - a.length;
      });
    } else {
      // alphabetic
      sorted = [...items].sort((a, b) => {
        if (!caseSensitive) {
          return order === 'ascending'
            ? a.toLowerCase().localeCompare(b.toLowerCase())
            : b.toLowerCase().localeCompare(a.toLowerCase());
        }
        return order === 'ascending'
          ? a.localeCompare(b)
          : b.localeCompare(a);
      });
    }

    return {
      content: [{
        type: 'text',
        text: [
          `📊 Array Sorted`,
          `────┬───────`,
          `Original:      ${items.length} items`,
          `Sort Type:     ${type}`,
          `Order:         ${order}`,
          `Case Sensitive: ${caseSensitive ? 'Yes' : 'No'}`,
          `─┴──────────`,
          `Result:`,
          sorted.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};

/** Array filter tool */
export const arrayFilterTool = {
  name: 'array_filter',
  description: 'Filter array items based on conditions. Supports includes, excludes, starts with, ends with, and length filtering.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of items to filter',
        items: { type: 'string' },
      },
      filterType: {
        type: 'string',
        description: 'Type of filter to apply',
        enum: ['includes', 'excludes', 'startsWith', 'endsWith', 'lengthMin', 'lengthMax', 'notEmpty', 'empty'],
      },
      value: {
        type: 'string',
        description: 'Value to filter by (required for includes, excludes, startsWith, endsWith)',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Case-sensitive matching',
      },
    },
    required: ['items', 'filterType'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const items = Array.isArray(args.items)
      ? args.items.map((item) => String(item))
      : [];
    const filterType = String(args.filterType || 'notEmpty');
    const value = String(args.value || '');
    const caseSensitive = Boolean(args.caseSensitive || false);

    if (items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: Empty array provided. Please provide at least one item to filter.',
        }],
      };
    }

    const filtered: string[] = [];

    for (const item of items) {
      let match = false;

      if (filterType === 'notEmpty') {
        match = item.trim() !== '';
      } else if (filterType === 'empty') {
        match = item.trim() === '';
      } else if (filterType === 'lengthMin') {
        match = item.length >= parseInt(value || '0', 10);
      } else if (filterType === 'lengthMax') {
        match = item.length <= parseInt(value || '0', 10);
      } else if (filterType === 'includes') {
        if (!value) continue;
        if (caseSensitive) {
          match = item.includes(value);
        } else {
          match = item.toLowerCase().includes(value.toLowerCase());
        }
      } else if (filterType === 'excludes') {
        if (!value) continue;
        if (caseSensitive) {
          match = !item.includes(value);
        } else {
          match = !item.toLowerCase().includes(value.toLowerCase());
        }
      } else if (filterType === 'startsWith') {
        if (!value) continue;
        if (caseSensitive) {
          match = item.startsWith(value);
        } else {
          match = item.toLowerCase().startsWith(value.toLowerCase());
        }
      } else if (filterType === 'endsWith') {
        if (!value) continue;
        if (caseSensitive) {
          match = item.endsWith(value);
        } else {
          match = item.toLowerCase().endsWith(value.toLowerCase());
        }
      }

      if (match) {
        filtered.push(item);
      }
    }

    const filterDesc = filterType === 'notEmpty' ? 'non-empty items'
      : filterType === 'empty' ? 'empty items'
      : filterType === 'lengthMin' ? `items with length >= ${value}`
      : filterType === 'lengthMax' ? `items with length <= ${value}`
      : filterType === 'includes' ? `items containing "${value}"`
      : filterType === 'excludes' ? `items NOT containing "${value}"`
      : filterType === 'startsWith' ? `items starting with "${value}"`
      : filterType === 'endsWith' ? `items ending with "${value}"`
      : 'filtered items';

    return {
      content: [{
        type: 'text',
        text: [
          `🔍 Array Filtered`,
          `────┬───────`,
          `Original:      ${items.length} items`,
          `Filter:        ${filterType}`,
          `Filtering:     ${filterDesc}`,
          `Case Sensitive: ${caseSensitive ? 'Yes' : 'No'}`,
          `─┴──────────`,
          `Result (${filtered.length} matches):`,
          filtered.length === 0
            ? '  No items matched the filter criteria.'
            : filtered.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};