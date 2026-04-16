/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/json
 * @description JSON parsing and stringification tools.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** JSON parse and validate tool */
export const jsonParseTool = {
  name: 'json_parse',
  description: 'Parse and validate a JSON string. Returns the parsed object/array or error message if invalid.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      jsonString: {
        type: 'string',
        description: 'The JSON string to parse',
      },
      pretty: {
        type: 'boolean',
        description: 'Pretty-print the output with indentation',
      },
    },
    required: ['jsonString'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const jsonString = String(args.jsonString || '');
    const pretty = Boolean(args.pretty || false);

    if (!jsonString.trim()) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: JSON string cannot be empty.',
        }],
        isError: true,
      };
    }

    try {
      const parsed = JSON.parse(jsonString);
      const type = Array.isArray(parsed) ? 'Array' : typeof parsed;

      return {
        content: [{
          type: 'text',
          text: [
            `📥 JSON Parse Result`,
            `───────────────────`,
            `Type: ${type}`,
            `Status: Valid JSON ✓`,
            `───────────────────`,
            `Parsed Output:`,
            pretty
              ? JSON.stringify(parsed, null, 2)
              : JSON.stringify(parsed),
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: [
            `❌ JSON Parse Error`,
            `───────────────────`,
            `The input is not valid JSON.`,
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          ].join('\n'),
        }],
        isError: true,
      };
    }
  },
};

/** JSON stringify tool */
export const jsonStringifyTool = {
  name: 'json_stringify',
  description: 'Convert a JavaScript object or array to a JSON string. Supports pretty-printing with indentation.',
  category: 'data-processing',

  inputSchema: {
    type: 'object',
    properties: {
      object: {
        type: 'object',
        description: 'The object or array to convert to JSON',
      },
      indent: {
        type: 'integer',
        description: 'Indentation spaces (2 or 4 recommended)',
      },
    },
    required: ['object'],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const obj = args.object;
    const indent = Number(args.indent ?? 2);

    if (obj === undefined) {
      return {
        content: [{
          type: 'text',
          text: '❌ Error: Object parameter is required.',
        }],
        isError: true,
      };
    }

    try {
      const jsonString = JSON.stringify(obj, null, indent);
      const type = Array.isArray(obj) ? 'Array' : typeof obj;

      return {
        content: [{
          type: 'text',
          text: [
            `📤 JSON Stringify Result`,
            `───────────────────`,
            `Type: ${type}`,
            `Length: ${jsonString.length} chars`,
            `───────────────────`,
            `JSON String:`,
            jsonString,
          ].join('\n'),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: [
            `❌ JSON Stringify Error`,
            `───────────────────`,
            `Error: ${error instanceof Error ? error.message : String(error)}`,
            `Note: Cannot stringify objects with circular references or non-serializable values.`,
          ].join('\n'),
        }],
        isError: true,
      };
    }
  },
};
