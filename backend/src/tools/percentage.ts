/**
 * @module tools/percentage
 * @description Percentage calculation tools for computing percentages, increases, decreases, and more.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** Percentage of a number tool */
export const percentageOfTool = {
  name: 'percentage_of',
  description: 'Calculate what a given percentage of a number is. For example, what is 25% of 200? Returns the result with detailed breakdown.',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      percentage: {
        type: 'number',
        description: 'The percentage value (e.g., 25 for 25%)',
      },
      number: {
        type: 'number',
        description: 'The number to calculate the percentage of',
      },
      precision: {
        type: 'integer',
        description: 'Decimal places for the result (0-10)',
        minimum: 0,
        maximum: 10,
      },
    },
    required: ['percentage', 'number'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const percentage = Number(args.percentage ?? 0);
    const number = Number(args.number ?? 0);
    const precision = Math.max(0, Math.min(10, Number(args.precision) || 2));

    if (isNaN(percentage) || isNaN(number)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Both percentage and number must be valid numeric values.',
        }],
        isError: true,
      };
    }

    const result = (percentage / 100) * number;
    const formattedResult = Number(result.toFixed(precision));

    return {
      content: [{
        type: 'text',
        text: [
          `📊 Percentage Calculation`,
          `────┬───────`,
          `Percentage:    ${percentage}%`,
          `Of Number:     ${number}`,
          `─┴──────────`,
          `Result:        ${formattedResult}`,
          ``,
          `Formula:`,
          `${percentage}% of ${number} = (${percentage} / 100) × ${number} = ${formattedResult}`,
        ].join('\n'),
      }],
    };
  },
};

/** Percentage increase/decrease tool */
export const percentageChangeTool = {
  name: 'percentage_change',
  description: 'Calculate the percentage increase or decrease between two values. Useful for measuring growth, decline, and change over time.',
  category: 'calculations',

  inputSchema: {
    type: 'object',
    properties: {
      original: {
        type: 'number',
        description: 'The original or starting value',
      },
      new: {
        type: 'number',
        description: 'The new or ending value',
      },
      precision: {
        type: 'integer',
        description: 'Decimal places for the result (0-10)',
        minimum: 0,
        maximum: 10,
      },
    },
    required: ['original', 'new'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const original = Number(args.original ?? 0);
    const newVal = Number(args.new ?? 0);
    const precision = Math.max(0, Math.min(10, Number(args.precision) || 2));

    if (isNaN(original) || isNaN(newVal)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Both original and new values must be valid numeric values.',
        }],
        isError: true,
      };
    }

    if (original === 0) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Warning: Original value is 0. Cannot calculate percentage change (division by zero).',
        }],
        isError: true,
      };
    }

    const change = newVal - original;
    const percentageChange = (change / Math.abs(original)) * 100;
    const formattedPercentage = Number(percentageChange.toFixed(precision));
    const isIncrease = percentageChange > 0;
    const isDecrease = percentageChange < 0;
    const isSame = percentageChange === 0;

    const symbol = isIncrease ? '+' : '';
    const direction = isIncrease ? 'increase' : isDecrease ? 'decrease' : 'no change';

    return {
      content: [{
        type: 'text',
        text: [
          `📈 Percentage ${isIncrease ? 'Increase' : isDecrease ? 'Decrease' : 'Change'}`,
          `────┬───────`,
          `Original:      ${original}`,
          `New Value:     ${newVal}`,
          `Change:        ${symbol}${change}`,
          `─┴──────────`,
          `Result:        ${symbol}${formattedPercentage}%`,
          ``,
          `Interpretation:`,
          isSame
            ? 'The value remained the same (no change).'
            : `The value ${direction}d by ${Math.abs(formattedPercentage)}% from ${original} to ${newVal}.`,
          ``,
          `Formula:`,
          `(${newVal} - ${original}) / |${original}| × 100 = ${symbol}${formattedPercentage}%`,
        ].join('\n'),
      }],
    };
  },
};