/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/math-advanced
 * @description Advanced math tools - modulo, exponent, logarithm, factorial, and more.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Modulo/remainder tool */
export const moduloTool = {
  name: 'math_modulo',
  description: 'Calculate the modulo (remainder) of division. Useful for checking even/odd, cyclical patterns, and wrapping values.',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      dividend: {
        type: 'number',
        description: 'The number to divide (numerator)',
      },
      divisor: {
        type: 'number',
        description: 'The number to divide by (denominator)',
      },
    },
    required: ['dividend', 'divisor'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const dividend = Number(args.dividend ?? 0);
    const divisor = Number(args.divisor ?? 0);

    if (divisor === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Cannot calculate modulo with divisor of 0.',
        }],
        isError: true,
      };
    }

    const result = dividend % divisor;

    return {
      content: [{
        type: 'text',
        text: [
          `🧮 Modulo Operation`,
          `───────┬──────────`,
          `Dividend:     ${dividend}`,
          `Divisor:      ${divisor}`,
          `───────┴──────────`,
          `Remainder:    ${result}`,
          ``,
          `Interpretation:`,
          dividend >= 0 && divisor > 0
            ? `When ${dividend} is divided by ${divisor}, ${result} remains.`
            : `Result may vary for negative numbers (language-specific behavior).`,
        ].join('\n'),
      }],
    };
  },
};

/** Exponent/power tool */
export const exponentTool = {
  name: 'math_exponent',
  description: 'Calculate the exponent/power of a number. Raises base to the power of exponent (base^exponent).',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      base: {
        type: 'number',
        description: 'The base number',
      },
      exponent: {
        type: 'number',
        description: 'The exponent/power to raise to',
      },
      precision: {
        type: 'integer',
        description: 'Decimal precision for the result (0-10)',
      },
    },
    required: ['base', 'exponent'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const base = Number(args.base ?? 0);
    const exponent = Number(args.exponent ?? 0);
    const precision = Math.max(0, Math.min(10, Number(args.precision ?? 4)));

    try {
      const result = Math.pow(base, exponent);

      let formattedResult: string;
      if (!isFinite(result)) {
        formattedResult = result.toString();
      } else if (precision > 0) {
        formattedResult = Number(result.toFixed(precision)).toString();
      } else {
        formattedResult = Math.round(result).toString();
      }

      return {
        content: [{
          type: 'text',
          text: [
            `🧮 Exponent Operation (${base}^${exponent})`,
            `────────┬───────`,
            `Base:         ${base}`,
            `Exponent:     ${exponent}`,
            `────────┴───────`,
            `Result:       ${formattedResult}`,
            ``,
            exponent === 2
              ? `Note: Squaring ${base}`
              : exponent === 3
                ? `Note: Cubing ${base}`
                : exponent === 0.5
                  ? `Note: Square root of ${base}`
                  : exponent === 0.333333
                    ? `Note: Cube root approximation of ${base}`
                    : undefined,
          ].filter(Boolean).join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Error calculating exponent: ${(error as Error).message}`,
        }],
        isError: true,
      };
    }
  },
};
