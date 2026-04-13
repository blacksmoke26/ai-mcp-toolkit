/**
 * @module mcp/tools/registry
 * @description Tool registry for managing MCP tools.
 * 
 * The tool registry is the central place where all MCP tools are registered
 * and looked up. It supports:
 * 
 * - Registering tools with validation schemas
 * - Looking up tools by name
 * - Listing all available tools
 * - Enabling/disabling tools dynamically
 * 
 * ## Registering a Custom Tool
 * 
 * ```typescript
 * import { toolRegistry } from '@/mcp/tools/registry';
 * 
 * toolRegistry.register({
 *   name: 'my_tool',
 *   description: 'Does something useful',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       query: { type: 'string', description: 'Search query' },
 *     },
 *     required: ['query'],
 *   },
 *   handler: async (args) => {
 *     return { content: [{ type: 'text', text: `Result for: ${args.query}` }] };
 *   },
 * });
 * ```
 */

import type {
  ToolDefinition,
  CallToolResult,
  JsonSchema,
} from '../types.js';

/** Handler function type for tool execution */
export type ToolHandler = (args: Record<string, unknown>) => Promise<CallToolResult>;

/** Extended tool definition with handler */
export interface RegisteredTool extends ToolDefinition {
  /** The function that executes when the tool is called */
  handler: ToolHandler;
  /** Whether the tool is currently enabled */
  enabled: boolean;
  /** Optional category for organization */
  category?: string;
}

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a new tool.
   * @param tool - Tool definition with handler function
   * @throws {Error} If a tool with the same name already exists
   */
  register(tool: Omit<RegisteredTool, 'enabled'> & { enabled?: boolean }): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered. Unregister it first.`);
    }
    this.tools.set(tool.name, {
      ...tool,
      enabled: tool.enabled ?? true,
    });
  }

  /**
   * Unregister a tool by name.
   * @param name - Tool name to remove
   * @returns true if the tool was found and removed
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a registered tool by name.
   * @param name - Tool name to look up
   * @returns The registered tool, or undefined if not found
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered.
   * @param name - Tool name to check
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tools as MCP ToolDefinition objects.
   * Only includes enabled tools.
   * @returns Array of tool definitions
   */
  listDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter((t) => t.enabled)
      .map(({ handler: _h, enabled: _e, category: _c, ...def }) => def);
  }

  /**
   * List all registered tools (including disabled).
   * @returns Array of all registered tools
   */
  listAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Enable or disable a tool by name.
   * @param name - Tool name
   * @param enabled - Whether to enable the tool
   * @returns true if the tool was found and updated
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const tool = this.tools.get(name);
    if (!tool) return false;
    tool.enabled = enabled;
    return true;
  }

  /**
   * Get the total number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Get tool names grouped by category.
   */
  getByCategory(): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    for (const [name, tool] of this.tools) {
      const cat = tool.category || 'uncategorized';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(name);
    }
    return categories;
  }
}

/** Global singleton tool registry */
export const toolRegistry = new ToolRegistry();
export default toolRegistry;
