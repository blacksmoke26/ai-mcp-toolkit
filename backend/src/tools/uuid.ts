/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/uuid
 * @description UUID and GUID generation tools for unique identifiers.
 */

import type { CallToolResult } from '@/mcp/types.js';

/** UUID generation tool */
export const uuidGenerateTool = {
  name: 'generate_uuid',
  description: 'Generate a unique UUID (Universally Unique Identifier) in various versions and formats. Supports UUID v1, v3, v4, v5.',
  category: 'generation',

  inputSchema: {
    type: 'object',
    properties: {
      version: {
        type: 'string',
        description: 'UUID version to generate',
        enum: ['v1', 'v3', 'v4', 'v5'],
      },
      format: {
        type: 'string',
        description: 'Output format for the UUID',
        enum: ['default', 'braced', 'curly', 'uppercase'],
      },
      count: {
        type: 'integer',
        description: 'Number of UUIDs to generate (1-10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: [],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const version = String(args.version || 'v4');
    const format = String(args.format || 'default');
    const count = Math.max(1, Math.min(10, Number(args.count || 1)));

    const uuids: string[] = [];

    for (let i = 0; i < count; i++) {
      let uuid = '';

      switch (version) {
        case 'v1':
          uuid = 'xxxxxxxx-xxxx-1xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          break;
        case 'v3':
        case 'v4':
          uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          break;
        case 'v5':
          uuid = 'xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
          break;
      }

      // Apply format
      switch (format) {
        case 'braced':
        case 'curly':
          uuid = `{${uuid}}`;
          break;
        case 'uppercase':
          uuid = uuid.toUpperCase();
          break;
        // default: keep as is
      }

      uuids.push(uuid);
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🆔 UUID${version.toUpperCase()} Generator`,
          `─────────────────────────`,
          `Version:     ${version.toUpperCase()}`,
          `Format:      ${format}`,
          `─────────────────────────`,
          count === 1
            ? `Result:      ${uuids[0]}`
            : `Results (${count}):\n` + uuids.map((u, i) => `  ${i + 1}. ${u}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};

/** GUID generation tool (similar to UUID but with different conventions) */
export const guidGenerateTool = {
  name: 'generate_guid',
  description: 'Generate a GUID (Globally Unique Identifier) - commonly used in Windows/.NET environments. Similar to UUID but with different conventions.',
  category: 'generation',

  inputSchema: {
    type: 'object',
    properties: {
      withBraces: {
        type: 'boolean',
        description: 'Include curly braces around the GUID',
      },
      uppercase: {
        type: 'boolean',
        description: 'Use uppercase letters in the GUID',
      },
      count: {
        type: 'integer',
        description: 'Number of GUIDs to generate (1-10)',
        minimum: 1,
        maximum: 10,
      },
    },
    required: [],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const withBraces = Boolean(args.withBraces || false);
    const uppercase = Boolean(args.uppercase || false);
    const count = Math.max(1, Math.min(10, Number(args.count || 1)));

    const guids: string[] = [];

    for (let i = 0; i < count; i++) {
      const guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        const hex = v.toString(16);
        return uppercase ? hex.toUpperCase() : hex;
      });

      guids.push(withBraces ? `{${guid}}` : guid);
    }

    return {
      content: [{
        type: 'text',
        text: [
          `🔑 GUID Generator`,
          `─────────────────────────`,
          `With Braces: ${withBraces ? 'Yes' : 'No'}`,
          `Uppercase:   ${uppercase ? 'Yes' : 'No'}`,
          `─────────────────────────`,
          count === 1
            ? `Result:      ${guids[0]}`
            : `Results (${count}):\n` + guids.map((g, i) => `  ${i + 1}. ${g}`).join('\n'),
        ].join('\n'),
      }],
    };
  },
};
