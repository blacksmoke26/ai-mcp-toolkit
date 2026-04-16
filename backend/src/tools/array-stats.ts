/**
 * @module tools/array-stats
 * @description Array statistics tools - calculate min, max, sum, average, and other aggregate functions.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Array min/max tool */
export const arrayMinMaxTool = {
  name: 'array_min_max',
  description: 'Find the minimum and maximum values in an array of numbers. Useful for data analysis and range determination.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        description: 'Array of numbers to analyze',
        items: { type: 'number' },
      },
    },
    required: ['numbers'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const numbers = Array.isArray(args.numbers)
      ? args.numbers.map((n) => Number(n))
      : [];

    if (numbers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Array cannot be empty. Please provide at least one number.',
        }],
        isError: true,
      };
    }

    const invalidNumbers = numbers.filter((n) => isNaN(n));

    if (invalidNumbers.length > 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: All values in the array must be valid numbers.',
        }],
        isError: true,
      };
    }

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const range = max - min;
    const minIndex = numbers.indexOf(min);
    const maxIndex = numbers.indexOf(max);

    return {
      content: [{
        type: 'text',
        text: [
          `📊 Array Min/Max Analysis`,
          `────┬───────`,
          `Array count:   ${numbers.length} numbers`,
          `────┴───────`,
          ``,
          `Results:`,
          `  Minimum:     ${min}`,
          `  Min Index:   ${minIndex} (0-indexed)`,
          `  ──────────────`,
          `  Maximum:     ${max}`,
          `  Max Index:   ${maxIndex} (0-indexed)`,
          `  ──────────────`,
          `  Range:       ${range}`,
        ].join('\n'),
      }],
    };
  },
};

/** Array sum tool */
export const arraySumTool = {
  name: 'array_sum',
  description: 'Calculate the sum of all numbers in an array. Supports precision control for decimal results.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        description: 'Array of numbers to sum',
        items: { type: 'number' },
      },
      precision: {
        type: 'integer',
        description: 'Decimal places to round result (0-10)',
        minimum: 0,
        maximum: 10,
      },
    },
    required: ['numbers'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const numbers = Array.isArray(args.numbers)
      ? args.numbers.map((n) => Number(n))
      : [];
    const precision = Math.max(0, Math.min(10, Number(args.precision) || 2));

    if (numbers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Array cannot be empty. Please provide at least one number.',
        }],
        isError: true,
      };
    }

    const invalidNumbers = numbers.filter((n) => isNaN(n));

    if (invalidNumbers.length > 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: All values in the array must be valid numbers.',
        }],
        isError: true,
      };
    }

    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const roundedSum = Number(sum.toFixed(precision));
    const count = numbers.length;
    const average = sum / count;
    const roundedAverage = Number(average.toFixed(precision));

    return {
      content: [{
        type: 'text',
        text: [
          `📊 Array Sum Calculation`,
          `────┬───────`,
          `Count:         ${count} numbers`,
          `Precision:     ${precision} decimals`,
          `────┴───────`,
          ``,
          `Results:`,
          `  Sum:         ${roundedSum}`,
          `  Average:     ${roundedAverage}`,
          `  Expression:  [${numbers.join(' + ')}] = ${roundedSum}`,
        ].join('\n'),
      }],
    };
  },
};