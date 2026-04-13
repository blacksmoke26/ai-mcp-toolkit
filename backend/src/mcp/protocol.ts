/**
 * @module mcp/protocol
 * @description MCP protocol request handler — dispatches JSON-RPC requests to the correct method.
 * 
 * This module implements the core MCP protocol logic:
 * 
 * 1. **Method routing** — Maps MCP method names to handler functions
 * 2. **Request validation** — Ensures requests conform to the MCP spec
 * 3. **Response formatting** — Wraps results in proper JSON-RPC 2.0 envelopes
 * 4. **Error handling** — Returns standardized error responses
 * 
 * ## Adding a New MCP Method
 * 
 * ```typescript
 * protocolHandler.registerMethod('my/method', async (params) => {
 *   // Validate and process params
 *   return { myData: 'result' };
 * });
 * ```
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcErrorResponse,
  JsonRpcSuccessResponse,
  McpMethodName,
  InitializeParams,
  InitializeResult,
  ListToolsResult,
  CallToolParams,
  CallToolResult,
  ListResourcesResult,
  ReadResourceParams,
  ListPromptsResult,
  GetPromptParams,
} from './types.js';
import { ErrorCodes, McpMethods } from './types.js';
import { toolRegistry } from './tools/registry.js';
import { resourceRegistry } from './resources/registry.js';
import { promptRegistry } from './prompts/registry.js';

// ─── Handler Types ────────────────────────────────────────────────────────────

type MethodHandler = (params?: Record<string, unknown>) => Promise<unknown>;

// ─── Protocol Handler ─────────────────────────────────────────────────────────

class McpProtocolHandler {
  private handlers: Map<string, MethodHandler> = new Map();
  private _serverInfo = {
    name: '@mcp/server',
    version: '1.0.0',
  };

  /** Get server info (set during init) */
  get serverInfo() {
    return this._serverInfo;
  }

  constructor() {
    this.registerCoreMethods();
  }

  /**
   * Register a method handler.
   * @param method - MCP method name
   * @param handler - Async handler function
   */
  registerMethod(method: string, handler: MethodHandler): void {
    this.handlers.set(method, handler);
  }

  /**
   * Process a single JSON-RPC request and return a response.
   * Handles errors gracefully and returns proper JSON-RPC error responses.
   */
  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, id, params } = request;

    try {
      // Handle notifications (no id = no response expected)
      if (id === null) {
        const handler = this.handlers.get(method);
        if (handler) await handler(params as Record<string, unknown>);
        return { jsonrpc: '2.0', id: null, result: null } as JsonRpcSuccessResponse<null>;
      }

      // Look up method handler
      const handler = this.handlers.get(method);
      if (!handler) {
        return this.errorResponse(id, ErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${method}`);
      }

      // Execute handler and wrap result
      const result = await handler(params as Record<string, unknown>);
      return this.successResponse(id, result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err instanceof Error && 'code' in err) ? (err as { code: number }).code : ErrorCodes.INTERNAL_ERROR;
      return this.errorResponse(id, code, message);
    }
  }

  /**
   * Process a batch of JSON-RPC requests.
   */
  async handleBatch(requests: JsonRpcRequest[]): Promise<JsonRpcResponse[]> {
    return Promise.all(requests.map((r) => this.handleRequest(r)));
  }

  // ─── Response Builders ───────────────────────────────────────────────────

  private successResponse<T>(id: string | number | null, result: T): JsonRpcSuccessResponse<T> {
    return { jsonrpc: '2.0', id, result };
  }

  private errorResponse(id: string | number | null, code: number, message: string): JsonRpcErrorResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
  }

  // ─── Core Method Implementations ─────────────────────────────────────────

  private registerCoreMethods(): void {
    // ── Initialize ────────────────────────────────────────────────────────

    this.handlers.set(McpMethods.INITIALIZE, async (params) => {
      const p = params as unknown as InitializeParams;
      const result: InitializeResult = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true },
          prompts: { listChanged: true },
          logging: {},
        },
        serverInfo: this._serverInfo,
        instructions: 'MCP Server powered by Ollama. Use tools/list to discover available tools, then tools/call to invoke them.',
      };
      return result;
    });

    // ── Ping ──────────────────────────────────────────────────────────────

    this.handlers.set(McpMethods.PING, async () => ({}));

    // ── Tools ──────────────────────────────────────────────────────────────

    this.handlers.set(McpMethods.TOOLS_LIST, async () => {
      const result: ListToolsResult = { tools: toolRegistry.listDefinitions() };
      return result;
    });

    this.handlers.set(McpMethods.TOOLS_CALL, async (params) => {
      const p = params as unknown as CallToolParams;
      const tool = toolRegistry.get(p.name);

      if (!tool) {
        const err = new Error(`Tool not found: ${p.name}`) as Error & { code: number };
        err.code = ErrorCodes.TOOL_NOT_FOUND;
        throw err;
      }

      if (!tool.enabled) {
        const err = new Error(`Tool "${p.name}" is currently disabled`) as Error & { code: number };
        err.code = ErrorCodes.TOOL_NOT_FOUND;
        throw err;
      }

      const result: CallToolResult = await tool.handler(p.arguments || {});
      return result;
    });

    // ── Resources ──────────────────────────────────────────────────────────

    this.handlers.set(McpMethods.RESOURCES_LIST, async () => {
      const result: ListResourcesResult = { resources: resourceRegistry.listDefinitions() };
      return result;
    });

    this.handlers.set(McpMethods.RESOURCES_READ, async (params) => {
      const p = params as unknown as ReadResourceParams;
      return resourceRegistry.read(p.uri);
    });

    // ── Prompts ────────────────────────────────────────────────────────────

    this.handlers.set(McpMethods.PROMPTS_LIST, async () => {
      const result: ListPromptsResult = { prompts: promptRegistry.listDefinitions() };
      return result;
    });

    this.handlers.set(McpMethods.PROMPTS_GET, async (params) => {
      const p = params as unknown as GetPromptParams;
      return promptRegistry.render(p.name, p.arguments);
    });
  }
}

/** Global protocol handler singleton */
export const protocolHandler = new McpProtocolHandler();
export default protocolHandler;
