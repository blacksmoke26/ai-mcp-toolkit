/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/math-basics
 * @description Basic mathematical operation tools - addition, subtraction, multiplication, and division.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Addition tool */
export const additionTool = {
  name: 'math_add',
  description: 'Add two or more numbers together. Returns the sum of all provided numbers with step-by-step calculation.',
  category: 'math',

  inputSchema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        description: 'Array of numbers to add',
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
          text: '❌ Error: At least one number is required for addition.',
        }],
        isError: true,
      };
    }

    const invalidNumbers = numbers.filter((n) => isNaN(n));

    if (invalidNumbers.length > 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Invalid numbers found in input. All values must be valid numbers.`,
        }],
        isError: true,
      };
    }

    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const roundedSum = Number(sum.toFixed(precision));

    return {
      content: [{
        type: 'text',
        text: [
          `➕ Addition`,
          `───────┬────────`,
          `Numbers:     [${numbers.join(', ')}]`,
          `Count:       ${numbers.length}`,
          `Precision:   ${precision} decimals`,
          `─┴────┴───────`,
          `Result:      ${roundedSum}`,
          `Expression:  ${numbers.join(' + ')} = ${roundedSum}`,
        ].join('\n'),
      }],
    };
  },
};

/** Subtraction tool */
export const subtractionTool = {
  name: 'math_subtract',
  description: 'Subtract numbers sequentially from left to right. The first number is the minuend, and subsequent numbers are subtrahends.',
  category: 'math',

  inputSchema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        description: 'Array of numbers for sequential subtraction [minuend, subtrahend1, subtrahend2, ...]',
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

    if (numbers.length < 2) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: At least two numbers are required for subtraction (minuend and subtrahend).',
        }],
        isError: true,
      };
    }

    const invalidNumbers = numbers.filter((n) => isNaN(n));

    if (invalidNumbers.length > 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error: Invalid numbers found in input. All values must be valid numbers.`,
        }],
        isError: true,
      };
    }

    const result = numbers.reduce((acc, n) => acc - n);
    const roundedResult = Number(result.toFixed(precision));

    return {
      content: [{
        type: 'text',
        text: [
          `➖ Subtraction`,
          `───────┬────────`,
          `Numbers:     [${numbers.join(', ')}]`,
          `Count:       ${numbers.length}`,
          `Precision:   ${precision} decimals`,
          `─┴────┴───────`,
          `Result:      ${roundedResult}`,
          `Expression:  ${numbers.join(' - ')} = ${roundedResult}`,
        ].join('\n'),
      }],
    };
  },
};
