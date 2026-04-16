/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/number-round
 * @description Number rounding and precision tools for formatting numeric values.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Number rounding tool */
export const numberRoundTool = {
  name: 'number_round',
  description: 'Round a number using different methods: round (nearest), ceil (up), floor (down), or trunc (drop decimals).',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      number: {
        type: 'number',
        description: 'The number to round',
      },
      method: {
        type: 'string',
        description: 'Rounding method to use',
        enum: ['round', 'ceil', 'floor', 'trunc'],
      },
      decimals: {
        type: 'integer',
        description: 'Number of decimal places (0-20, default: 0)',
        minimum: 0,
        maximum: 20,
      },
    },
    required: ['number', 'method'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const number = Number(args.number ?? 0);
    const method = String(args.method || 'round');
    const decimals = Math.max(0, Math.min(20, Number(args.decimals) || 0));

    if (isNaN(number)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Invalid number. Please provide a valid numeric value.',
        }],
        isError: true,
      };
    }

    let result: number;
    const factor = Math.pow(10, decimals);

    switch (method) {
      case 'round':
        result = Math.round(number * factor) / factor;
        break;
      case 'ceil':
        result = Math.ceil(number * factor) / factor;
        break;
      case 'floor':
        result = Math.floor(number * factor) / factor;
        break;
      case 'trunc':
        result = Math.trunc(number * factor) / factor;
        break;
      default:
        result = Math.round(number * factor) / factor;
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔢 Number Rounding`,
          `────┬───────`,
          `Input:         ${number}`,
          `Method:        ${method}`,
          `Decimals:      ${decimals}`,
          `─┴──────────`,
          `Result:        ${result}`,
          ``,
          `Method Details:`,
          method === 'round'
            ? 'Rounds to the nearest value (0.5 rounds up)'
            : method === 'ceil'
              ? 'Rounds up to the next value (ceiling)'
              : method === 'floor'
                ? 'Rounds down to the previous value (floor)'
                : 'Truncates by removing decimals',
        ].join('\n'),
      }],
    };
  },
};

/** Number precision/formatting tool */
export const numberPrecisionTool = {
  name: 'number_precision',
  description: 'Format a number with specific decimal precision and optional thousand separators. Supports fixed and exponential notation.',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      number: {
        type: 'number',
        description: 'The number to format',
      },
      decimals: {
        type: 'integer',
        description: 'Number of decimal places (0-20)',
        minimum: 0,
        maximum: 20,
      },
      notation: {
        type: 'string',
        description: 'Number notation',
        enum: ['fixed', 'exponential', 'auto'],
      },
      thousandSeparator: {
        type: 'boolean',
        description: 'Add thousand separators (commas)',
      },
    },
    required: ['number', 'decimals'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const number = Number(args.number ?? 0);
    const decimals = Math.max(0, Math.min(20, Number(args.decimals) || 2));
    const notation = String(args.notation || 'fixed');
    const thousandSeparator = Boolean(args.thousandSeparator || false);

    if (isNaN(number)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Invalid number. Please provide a valid numeric value.',
        }],
        isError: true,
      };
    }

    let formatted: string;

    if (notation === 'exponential') {
      formatted = number.toExponential(decimals);
    } else if (notation === 'auto') {
      formatted = number.toPrecision(decimals + 1);
    } else {
      formatted = number.toFixed(decimals);
    }

    if (thousandSeparator && notation !== 'exponential') {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔢 Number Precision & Formatting`,
          `────┬───────`,
          `Input:             ${number}`,
          `Decimals:          ${decimals}`,
          `Notation:          ${notation}`,
          `Thousand Separator: ${thousandSeparator ? 'Yes' : 'No'}`,
          `─┴──────────`,
          `Formatted Result:  ${formatted}`,
          ``,
          `Alternative Formats:`,
          `  Fixed (2dp):      ${number.toFixed(2)}`,
          `  Exponential:      ${number.toExponential(4)}`,
          `  Scientific:       ${number.toPrecision(6)}e+${Math.floor(Math.log10(Math.abs(number))) + 1}`,
        ].join('\n'),
      }],
    };
  },
};
