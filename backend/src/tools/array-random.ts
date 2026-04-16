/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/array-random
 * @description Array randomization tools - shuffle arrays and get random samples.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Array shuffle tool */
export const arrayShuffleTool = {
  name: 'array_shuffle',
  description: 'Shuffle an array of items in random order using Fisher-Yates algorithm. Returns the shuffled array.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of items to shuffle',
        items: { type: 'string' },
      },
    },
    required: ['items'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const items = Array.isArray(args.items)
      ? args.items.map((item) => String(item))
      : [];

    if (items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: Empty array provided. Please provide at least one item to shuffle.',
        }],
      };
    }

    // Fisher-Yates shuffle algorithm
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔀 Array Shuffled (Fisher-Yates)`,
          `───────────────────`,
          `Original count: ${items.length} items`,
          `────┬───`,
          `Shuffled result:`,
          shuffled.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};

/** Random sample from array tool */
export const arraySampleTool = {
  name: 'array_sample',
  description: 'Get random sample(s) from an array. Specify how many items to pick (without replacement).',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Array of items to sample from',
        items: { type: 'string' },
      },
      count: {
        type: 'integer',
        description: 'Number of random items to pick (default: 1)',
      },
    },
    required: ['items'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const items = Array.isArray(args.items)
      ? args.items.map((item) => String(item))
      : [];
    const count = Math.max(1, Math.floor(Number(args.count) || 1));

    if (items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: Empty array provided. Please provide at least one item to sample from.',
        }],
      };
    }

    const sampleCount = Math.min(count, items.length);

    // Create a copy and shuffle to get random samples
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const samples = shuffled.slice(0, sampleCount);

    return {
      content: [{
        type: 'text',
        text: [
          `🎲 Random Sample`,
          `─────────────────`,
          `Total items:    ${items.length}`,
          `Sample size:    ${sampleCount}`,
          `────┬───`,
          `Selected samples:`,
          samples.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};
