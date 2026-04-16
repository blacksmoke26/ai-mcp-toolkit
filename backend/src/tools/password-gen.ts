/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/password-gen
 * @description Password and random string generation tools for secure random data creation.
 */

import crypto from 'node:crypto';
import type { CallToolResult } from '@/mcp/types.js';

/** Password generation tool */
export const passwordGenerateTool = {
  name: 'generate_password',
  description: 'Generate a secure random password with customizable length and character types (uppercase, lowercase, numbers, symbols).',
  category: 'generation',

  inputSchema: {
    type: 'object',
    properties: {
      length: {
        type: 'integer',
        description: 'Password length (default: 16, min: 8, max: 128)',
        minimum: 8,
        maximum: 128,
      },
      includeUppercase: {
        type: 'boolean',
        description: 'Include uppercase letters (A-Z)',
      },
      includeLowercase: {
        type: 'boolean',
        description: 'Include lowercase letters (a-z)',
      },
      includeNumbers: {
        type: 'boolean',
        description: 'Include numbers (0-9)',
      },
      includeSymbols: {
        type: 'boolean',
        description: 'Include special symbols (!@#$%^&* etc.)',
      },
      excludeAmbiguous: {
        type: 'boolean',
        description: 'Exclude ambiguous characters (Il1O0)',
      },
    },
    required: [],
  },

  async handler(args: Record<string, unknown>): Promise<CallToolResult> {
    const length = Math.max(8, Math.min(128, Number(args.length) || 16));
    const includeUppercase = Boolean(args.includeUppercase ?? true);
    const includeLowercase = Boolean(args.includeLowercase ?? true);
    const includeNumbers = Boolean(args.includeNumbers ?? true);
    const includeSymbols = Boolean(args.includeSymbols ?? false);
    const excludeAmbiguous = Boolean(args.excludeAmbiguous ?? false);

    const ambiguousChars = 'Il1O0';

    let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

    if (excludeAmbiguous) {
      uppercase = uppercase.split('').filter(c => !ambiguousChars.includes(c)).join('');
      lowercase = lowercase.split('').filter(c => !ambiguousChars.includes(c)).join('');
      numbers = numbers.split('').filter(c => !ambiguousChars.includes(c)).join('');
    }

    let charset = '';

    if (includeUppercase) charset += uppercase;
    if (includeLowercase) charset += lowercase;
    if (includeNumbers) charset += numbers;
    if (includeSymbols) charset += symbols;

    if (charset.length === 0) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: At least one character type must be selected (uppercase, lowercase, numbers, or symbols).',
        }],
        isError: true,
      };
    }

    // Ensure at least one character from each selected type
    const guaranteedChars: string[] = [];

    if (includeUppercase) guaranteedChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
    if (includeLowercase) guaranteedChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
    if (includeNumbers) guaranteedChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
    if (includeSymbols) guaranteedChars.push(symbols[Math.floor(Math.random() * symbols.length)]);

    const remainingLength = length - guaranteedChars.length;
    const randomBytes = crypto.randomBytes(remainingLength);
    const randomChars: string[] = [];

    for (let i = 0; i < remainingLength; i++) {
      randomChars.push(charset[randomBytes[i] % charset.length]);
    }

    const allChars = [...guaranteedChars, ...randomChars];

    // Shuffle using Fisher-Yates
    for (let i = allChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allChars[i], allChars[j]] = [allChars[j], allChars[i]];
    }

    const password = allChars.join('');

    const hasUpper = includeUppercase ? '✓' : '✗';
    const hasLower = includeLowercase ? '✓' : '✗';
    const hasNum = includeNumbers ? '✓' : '✗';
    const hasSym = includeSymbols ? '✓' : '✗';

    let strength: 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
    const complexityScore = (includeUppercase ? 1 : 0) + (includeLowercase ? 1 : 0) + (includeNumbers ? 1 : 0) + (includeSymbols ? 1 : 0);

    if (length >= 16 && complexityScore >= 3) {
      strength = 'Very Strong';
    } else if (length >= 12 && complexityScore >= 2) {
      strength = 'Strong';
    } else if (length >= 8 && complexityScore >= 2) {
      strength = 'Medium';
    } else {
      strength = 'Weak';
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔐 Password Generated`,
          `──────┬──────`,
          `Length:      ${length} chars`,
          `Strength:    ${strength}`,
          `──────┴──────`,
          `Character Types:`,
          `  Uppercase (A-Z):     ${hasUpper}`,
          `  Lowercase (a-z):     ${hasLower}`,
          `  Numbers (0-9):       ${hasNum}`,
          `  Symbols:             ${hasSym}`,
          `  Exclude Ambiguous:   ${excludeAmbiguous ? 'Yes' : 'No'}`,
          `──────┬──────`,
          `Password:`,
          ``,
          `${password}`,
          ``,
          `💡 Tip: Store this password in a secure password manager.`,
        ].join('\n'),
      }],
    };
  },
};

/** Random string generation tool */
export const randomStringTool = {
  name: 'generate_random_string',
  description: 'Generate a random string for tokens, UUIDs, verification codes, or testing. Supports various character sets and length options.',
  category: 'generation',

  inputSchema: {
    type: 'object',
    properties: {
      length: {
        type: 'integer',
        description: 'String length (default: 20, min: 1, max: 1000)',
        minimum: 1,
        maximum: 1000,
      },
      charset: {
        type: 'string',
        description: 'Character set to use',
        enum: ['alphanumeric', 'alpha', 'numeric', 'hex', 'base64', 'custom'],
      },
      customChars: {
        type: 'string',
        description: 'Custom character set (used when charset is "custom")',
      },
    },
    required: [],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const length = Math.max(1, Math.min(1000, Number(args.length) || 20));
    const charset = String(args.charset || 'alphanumeric');
    const customChars = String(args.customChars || '');

    let chars: string;

    switch (charset) {
      case 'alphanumeric':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        break;
      case 'alpha':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        break;
      case 'numeric':
        chars = '0123456789';
        break;
      case 'hex':
        chars = '0123456789abcdef';
        break;
      case 'base64':
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        break;
      case 'custom':
        if (!customChars.trim()) {
          return {
            content: [{
              type: 'text',
              text: '❌ Error: When charset is "custom", you must provide "customChars".',
            }],
            isError: true,
          };
        }
        chars = customChars;
        break;
      default:
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }

    const randomBytes = crypto.randomBytes(length);
    const randomString: string[] = [];

    for (let i = 0; i < length; i++) {
      randomString.push(chars[randomBytes[i] % chars.length]);
    }

    const result = randomString.join('');

    return {
      content: [{
        type: 'text',
        text: [
          `🎲 Random String Generated`,
          `──────┬──────`,
          `Length:      ${length} chars`,
          `Charset:     ${charset}${charset === 'custom' ? ` (${customChars})` : ''}`,
          `Characters:  ${chars.length} available`,
          `──────┴──────`,
          `Result:`,
          ``,
          `${result}`,
        ].join('\n'),
      }],
    };
  },
};
