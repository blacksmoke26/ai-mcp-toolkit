/**
 * @module tools/color-convert
 * @description Color conversion tools - convert between RGB, HEX, HSL, and other color formats.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** RGB to HEX conversion tool */
export const rgbToHexTool = {
  name: 'rgb_to_hex',
  description: 'Convert RGB color values to hexadecimal format. Supports RGB and RGBA with optional alpha channel.',
  category: 'conversion',

  inputSchema: {
    type: 'object',
    properties: {
      red: {
        type: 'integer',
        description: 'Red component (0-255)',
        minimum: 0,
        maximum: 255,
      },
      green: {
        type: 'integer',
        description: 'Green component (0-255)',
        minimum: 0,
        maximum: 255,
      },
      blue: {
        type: 'integer',
        description: 'Blue component (0-255)',
        minimum: 0,
        maximum: 255,
      },
      alpha: {
        type: 'number',
        description: 'Alpha/opacity (0-1, optional for transparency)',
        minimum: 0,
        maximum: 1,
      },
      includeHash: {
        type: 'boolean',
        description: 'Include # prefix in output',
      },
      uppercase: {
        type: 'boolean',
        description: 'Use uppercase hex letters',
      },
    },
    required: ['red', 'green', 'blue'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const red = Math.max(0, Math.min(255, Number(args.red) || 0));
    const green = Math.max(0, Math.min(255, Number(args.green) || 0));
    const blue = Math.max(0, Math.min(255, Number(args.blue) || 0));
    const alpha = Number(args.alpha);
    const includeHash = Boolean(args.includeHash ?? true);
    const uppercase = Boolean(args.uppercase ?? false);

    const toHex = (value: number): string => {
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    const hex = toHex(red) + toHex(green) + toHex(blue);
    const output = uppercase ? hex.toUpperCase() : hex.toLowerCase();

    let result = includeHash ? `#${output}` : output;

    if (alpha !== undefined && alpha >= 0 && alpha <= 1) {
      const alphaHex = toHex(Math.round(alpha * 255));
      result = includeHash ? `#${output}${alphaHex}` : `${output}${alphaHex}`;
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🎨 RGB to HEX Conversion`,
          `───────┬──────`,
          `Red:       ${red}`,
          `Green:     ${green}`,
          `Blue:      ${blue}`,
          alpha !== undefined
            ? `Alpha:     ${alpha}`
            : undefined,
          `───────┴──────`,
          `HEX Output:  ${result}`,
          ``,
          `CSS Format:  ${includeHash ? result : `#${result.replace('#', '')}`}`,
          `RGB Format:  ${alpha !== undefined ? `rgba(${red}, ${green}, ${blue}, ${alpha})` : `rgb(${red}, ${green}, ${blue})`}`,
        ].filter(Boolean).join('\n'),
      }],
    };
  },
};

/** HEX to RGB conversion tool */
export const hexToRgbTool = {
  name: 'hex_to_rgb',
  description: 'Convert hexadecimal color codes to RGB values. Supports 3-digit, 6-digit, and 8-digit (with alpha) HEX formats.',
  category: 'conversion',

  inputSchema: {
    type: 'object',
    properties: {
      hex: {
        type: 'string',
        description: 'HEX color code (e.g., #FF5733, #F53, #FF573380)',
      },
      includeAlpha: {
        type: 'boolean',
        description: 'Include alpha channel if present in input',
      },
    },
    required: ['hex'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const hex = String(args.hex || '').replace('#', '').trim();
    const includeAlpha = Boolean(args.includeAlpha ?? true);

    if (!hex || !/^[\dA-Fa-f]{3}([\dA-Fa-f]{3})?([\dA-Fa-f]{2})?$/.test(hex)) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Invalid HEX color code. Use format like #FF5733, #F53, or #FF573380.',
        }],
        isError: true,
      };
    }

    let red: number = 0;
    let green: number = 0;
    let blue: number = 0;
    let alpha: number | undefined = undefined;

    if (hex.length === 3) {
      red = parseInt(hex[0] + hex[0], 16);
      green = parseInt(hex[1] + hex[1], 16);
      blue = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      red = parseInt(hex.substring(0, 2), 16);
      green = parseInt(hex.substring(2, 4), 16);
      blue = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 8) {
      red = parseInt(hex.substring(0, 2), 16);
      green = parseInt(hex.substring(2, 4), 16);
      blue = parseInt(hex.substring(4, 6), 16);
      if (includeAlpha) {
        alpha = Math.round((parseInt(hex.substring(6, 8), 16) / 255) * 100) / 100;
      }
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🎨 HEX to RGB Conversion`,
          `───────┬──────`,
          `Input HEX:   #${hex}`,
          `───────┴──────`,
          `Red:         ${red}`,
          `Green:       ${green}`,
          `Blue:        ${blue}`,
          includeAlpha && alpha !== undefined
            ? `Alpha:       ${alpha}`
            : undefined,
          `───────┴──────`,
          `RGB Output:  rgb(${red}, ${green}, ${blue})`,
          includeAlpha && alpha !== undefined
            ? `RGBA Output: rgba(${red}, ${green}, ${blue}, ${alpha})`
            : undefined,
        ].filter(Boolean).join('\n'),
      }],
    };
  },
};
