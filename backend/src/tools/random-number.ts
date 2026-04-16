/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/random-number
 * @description Random number generation tools for integers, floating-point numbers, and secure random values.
 */

import type { CallToolResult } from '@/mcp/types.js';
import crypto from 'node:crypto';

/** Random number generation tool */
export const randomNumberTool = {
  name: 'random_number',
  description: 'Generate random numbers within a specified range. Supports integers, floating-point numbers, and secure cryptographically random values.',
  category: 'generation',

  inputSchema: {
    type: 'object',
    properties: {
      min: {
        type: 'number',
        description: 'Minimum value (inclusive)',
      },
      max: {
        type: 'number',
        description: 'Maximum value (inclusive)',
      },
      type: {
        type: 'string',
        description: 'Type of random number to generate',
        enum: ['integer', 'float', 'secure'],
      },
      decimalPlaces: {
        type: 'integer',
        description: 'Number of decimal places for float type (0-10)',
        minimum: 0,
        maximum: 10,
      },
      count: {
        type: 'integer',
        description: 'Number of random values to generate (1-20)',
        minimum: 1,
        maximum: 20,
      },
    },
    required: ['min', 'max'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const min = Number(args.min ?? 0);
    const max = Number(args.max ?? 100);
    const type = String(args.type || 'integer');
    const decimalPlaces = Math.max(0, Math.min(10, Number(args.decimalPlaces ?? 2)));
    const count = Math.max(1, Math.min(20, Number(args.count ?? 1)));

    if (min > max) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: min value cannot be greater than max value.',
        }],
        isError: true,
      };
    }

    const numbers: number[] = [];

    for (let i = 0; i < count; i++) {
      let num: number;

      if (type === 'secure') {
        // Cryptographically secure random number
        const range = max - min;
        const randomBytes = crypto.randomBytes(8);
        const randomValue = randomBytes.readDoubleLE(0); // 0 to 1
        num = min + (randomValue * range);
        num = Math.floor(num);
      } else if (type === 'float') {
        // Floating-point random number
        num = min + Math.random() * (max - min);
        num = parseFloat(num.toFixed(decimalPlaces));
      } else {
        // Integer random number
        num = Math.floor(min + Math.random() * (max - min + 1));
      }

      numbers.push(num);
    }

    const typeLabel = type === 'secure' ? 'Secure Integer' : type === 'float' ? `Float (${decimalPlaces} decimals)` : 'Integer';

    return {
      content: [{
        type: 'text',
        text: [
          `🎲 Random Number Generator`,
          `───────┬─────┬────`,
          `Range:     [${min}, ${max}]`,
          `Type:      ${typeLabel}`,
          `Count:     ${count}`,
          `─┴─┴─┴───┴──`,
          count === 1
            ? `Result:    ${numbers[0]}`
            : `Results (${count}):\n` + numbers.map((n, i) => `  ${i + 1}. ${n}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};

/** Dice roll simulation tool */
export const diceRollTool = {
  name: 'dice_roll',
  description: 'Simulate rolling dice for games. Supports standard 6-sided dice and custom dice with various number of sides (4, 6, 8, 10, 12, 20, 100, or custom).',
  category: 'generation',

  inputSchema: {
    type: 'object',
    properties: {
      dice: {
        type: 'string',
        description: 'Dice notation (e.g., "d6", "d20", "100-sided", "custom")',
        enum: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', 'custom'],
      },
      customSides: {
        type: 'integer',
        description: 'Number of sides for custom dice (when dice is "custom")',
      },
      count: {
        type: 'integer',
        description: 'Number of dice to roll (1-10)',
        minimum: 1,
        maximum: 10,
      },
      showAll: {
        type: 'boolean',
        description: 'Show all individual rolls instead of just the sum',
      },
    },
    required: ['dice'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const dice = String(args.dice || 'd6');
    const count = Math.max(1, Math.min(10, Number(args.count) || 1));
    const showAll = Boolean(args.showAll || false);

    let sides: number;

    switch (dice) {
      case 'd4':
        sides = 4;
        break;
      case 'd6':
        sides = 6;
        break;
      case 'd8':
        sides = 8;
        break;
      case 'd10':
        sides = 10;
        break;
      case 'd12':
        sides = 12;
        break;
      case 'd20':
        sides = 20;
        break;
      case 'd100':
        sides = 100;
        break;
      case 'custom':
        sides = Number(args.customSides) || 6;
        break;
      default:
        sides = 6;
    }

    const rolls: number[] = [];

    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const isCriticalSuccess = rolls.some((r) => r === sides);
    const isCriticalFailure = rolls.some((r) => r === 1);

    let resultText = '';

    if (count === 1) {
      resultText = `Roll: ${rolls[0]}`;
    } else if (showAll) {
      resultText = rolls.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
    } else {
      resultText = `Sum: ${sum}`;
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🎲 Dice Roll (${count}x d${sides})`,
          `─────┬──────`,
          `Dice:      ${count} dice`,
          `Sides:     ${sides}`,
          `Min:       ${count}`,
          `Max:       ${count * sides}`,
          `─┴────┴──────`,
          resultText,
          count > 1 && !showAll
            ? `Individual: [${rolls.join(', ')}]`
            : undefined,
          isCriticalSuccess
            ? `⭐ CRITICAL SUCCESS! At least one roll was max (${sides}).`
            : undefined,
          isCriticalFailure
            ? `☠️ CRITICAL FAILURE! At least one roll was 1.`
            : undefined,
        ].filter(Boolean).join('\n'),
      }],
    };
  },
};
