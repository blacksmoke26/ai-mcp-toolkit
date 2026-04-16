/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/math-multiply
 * @description Multiplication and division math tools for arithmetic calculations.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Multiplication tool */
export const multiplyTool = {
  name: 'multiply',
  description: 'Multiply two or more numbers together. Supports decimals, negative numbers, and large values.',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      numbers: {
        type: 'array',
        description: 'Array of numbers to multiply',
        items: { type: 'number' },
      },
      precision: {
        type: 'integer',
        description: 'Decimal places for the result (default: 10)',
        minimum: 0,
        maximum: 20,
      },
    },
    required: ['numbers'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const numbers = Array.isArray(args.numbers)
      ? args.numbers.map((n) => Number(n))
      : [];
    const precision = Math.min(20, Math.max(0, Number(args.precision || 10)));

    if (numbers.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: At least one number is required for multiplication.',
        }],
        isError: true,
      };
    }

    if (numbers.some((n) => isNaN(n))) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: All inputs must be valid numbers.',
        }],
        isError: true,
      };
    }

    let result = 1;
    numbers.forEach((num) => {
      result *= num;
    });

    const formattedResult = Number(result.toFixed(precision));

    return {
      content: [{
        type: 'text',
        text: [
          `✖️ Multiplication Result`,
          `───────────────`,
          `Numbers:      ${numbers.join(' × ')}`,
          `Count:        ${numbers.length}`,
          `───────────────`,
          `Result:       ${formattedResult}`,
        ].join('\n'),
      }],
    };
  },
};

/** Division tool */
export const divideTool = {
  name: 'divide',
  description: 'Divide one number by another. Returns quotient and handles division by zero errors gracefully.',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      dividend: {
        type: 'number',
        description: 'The number to be divided (numerator)',
      },
      divisor: {
        type: 'number',
        description: 'The number to divide by (denominator)',
      },
      precision: {
        type: 'integer',
        description: 'Decimal places for the result (default: 10)',
        minimum: 0,
        maximum: 20,
      },
    },
    required: ['dividend', 'divisor'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const dividend = Number(args.dividend);
    const divisor = Number(args.divisor);
    const precision = Math.min(20, Math.max(0, Number(args.precision || 10)));

    if (isNaN(dividend) || isNaN(divisor)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Both dividend and divisor must be valid numbers.',
        }],
        isError: true,
      };
    }

    if (divisor === 0) {
      return {
        content: [{
          type: 'text',
          text: [
            '❌ Division by Zero',
            `───────────────`,
            `Cannot divide ${dividend} by 0.`,
            `Result is undefined (or infinity).`,
          ].join('\n'),
        }],
        isError: true,
      };
    }

    const quotient = dividend / divisor;
    const remainder = dividend % divisor;
    const formattedQuotient = Number(quotient.toFixed(precision));

    return {
      content: [{
        type: 'text',
        text: [
          `➗ Division Result`,
          `───────────────`,
          `Dividend:     ${dividend}`,
          `Divisor:      ${divisor}`,
          `───────────────`,
          `Quotient:     ${formattedQuotient}`,
          `Remainder:    ${remainder}`,
          `───────────────`,
          `Formula:      ${dividend} ÷ ${divisor} = ${formattedQuotient}`,
        ].join('\n'),
      }],
    };
  },
};
