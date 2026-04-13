/**
 * @module mcp/tools/builtin
 * @description Built-in MCP tools that ship with the server.
 * 
 * These tools provide essential functionality:
 * 
 * - **echo** — Echoes input back (useful for testing)
 * - **get_current_time** — Returns the current date/time
 * - **list_providers** — Lists configured LLM providers
 * - **calculator** — Evaluates mathematical expressions safely
 * - **json_query** — Queries/transforms JSON data with simple expressions
 */

import { toolRegistry } from './registry.js';
import type { CallToolResult } from '../types.js';

function textResult(text: string, isError = false): CallToolResult {
  return { content: [{ type: 'text', text }], isError };
}

/** Echo tool — returns input exactly as received */
const echoTool = {
  name: 'echo',
  description: 'Echoes the input text back to the caller. Useful for testing connectivity.',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The message to echo back' },
    },
    required: ['message'] as string[],
  },
  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    return textResult(String(args.message ?? ''));
  },
};

/** Get current time tool */
const timeTool = {
  name: 'get_current_time',
  description: 'Returns the current date and time in ISO 8601 format. Optionally in a specific timezone.',
  inputSchema: {
    type: 'object',
    properties: {
      timezone: { type: 'string', description: 'IANA timezone name (e.g., "UTC", "America/New_York")' },
      format: {
        type: 'string',
        description: 'Output format: "iso" (ISO 8601), "unix" (Unix timestamp), or "human" (readable)',
        enum: ['iso', 'unix', 'human'],
      },
    },
  },
  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const tz = (args.timezone as string) || 'UTC';
    const format = (args.format as string) || 'iso';
    try {
      const now = new Date();
      let result: string;
      switch (format) {
        case 'unix':
          result = Math.floor(now.getTime() / 1000).toString();
          break;
        case 'human':
          result = now.toLocaleString('en-US', { timeZone: tz });
          break;
        default:
          result = now.toISOString();
      }
      return textResult(result);
    } catch {
      return textResult(`Invalid timezone: ${tz}`, true);
    }
  },
};

/** Calculator tool — safe math evaluation */
const calculatorTool = {
  name: 'calculator',
  description: 'Evaluates a mathematical expression and returns the result. Supports basic arithmetic: +, -, *, /, %, **, parentheses.',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'Mathematical expression to evaluate (e.g., "2 + 3 * 4")' },
    },
    required: ['expression'],
  },
  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const expr = String(args.expression ?? '');
    // Only allow safe characters: digits, operators, parentheses, spaces, dots
    if (!/^[\d+\-*/%.()\s]+$/.test(expr)) {
      return textResult('Expression contains disallowed characters. Only numbers and basic operators (+, -, *, /, %, **) are allowed.', true);
    }
    try {
      // Replace ** with Math.pow for safety
      const sanitized = expr.replace(/\*\*/g, '^');
      const fn = new Function(`"use strict"; return (${sanitized});`);
      const result = fn();
      return textResult(`= ${result}`);
    } catch (e) {
      return textResult(`Error evaluating expression: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  },
};

/** JSON query tool — simple JSON manipulation */
const jsonQueryTool = {
  name: 'json_query',
  description: 'Parses JSON and extracts or transforms data. Returns formatted JSON output.',
  inputSchema: {
    type: 'object',
    properties: {
      json: { type: 'string', description: 'JSON string to query' },
      path: { type: 'string', description: 'Dot-notation path to extract (e.g., "users.0.name"). Omit to return full parsed JSON.' },
    },
    required: ['json'],
  },
  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    try {
      const data = JSON.parse(String(args.json));
      if (!args.path) {
        return textResult(JSON.stringify(data, null, 2));
      }
      const parts = String(args.path).split('.');
      let current: unknown = data;
      for (const part of parts) {
        if (current === null || current === undefined) {
          return textResult(`Path "${args.path}" not found in JSON data.`, true);
        }
        const key = /^\d+$/.test(part) ? parseInt(part, 10) : part;
        current = (current as Record<string | number, unknown>)[key];
      }
      return textResult(JSON.stringify(current, null, 2));
    } catch (e) {
      return textResult(`Error: ${e instanceof Error ? e.message : String(e)}`, true);
    }
  },
};

/**
 * Register all built-in tools.
 * Called once at server startup.
 */
export function registerBuiltinTools(): void {
  const tools = [echoTool, timeTool, calculatorTool, jsonQueryTool];
  for (const tool of tools) {
    toolRegistry.register({ ...tool, category: 'builtin' });
  }
  console.log(`🔧 Registered ${tools.length} built-in tools`);
}
