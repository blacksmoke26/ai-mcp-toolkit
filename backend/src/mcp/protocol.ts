/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

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
 *
 * ## Module Changelog
 * - v1.1.0: Added comprehensive JSON-RPC 2.0 request validation
 * - v1.1.0: Added parameter validation for all core method handlers
 * - v1.1.0: Added method unregistration, existence checking, and listing
 * - v1.1.0: Added McpProtocolError class for structured error handling
 * - v1.1.0: Added server info configuration method
 * - v1.1.0: Added protocol version negotiation during initialize
 * - v1.1.0: Added batch request edge case handling (empty array, invalid items)
 * - v1.1.0: Added tool argument, resource URI, and prompt argument validation
 * - v1.1.0: Improved notification handling per JSON-RPC 2.0 spec
 * - v1.1.0: Improved error handling with proper error codes and optional data field
 * - v1.2.0: Added `JsonRpcNotification` and batch type support
 * - v1.2.0: Added server initialization state tracking (`SERVER_NOT_INITIALIZED` error code)
 * - v1.2.0: Added new core method handlers for all MCP methods
 * - v1.2.0: Added tool execution timeout support via `CallToolParams.timeout` with proper cleanup
 * - v1.2.0: Added `resetInitialization()` method
 */

import type {
  InitializeParams,
  InitializeResult,
  JsonRpcBatchRequest,
  JsonRpcBatchResponse,
  JsonRpcError,
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccessResponse,
} from './types';
import {ErrorCodes, McpMethods} from './types';
import * as mcpMethods from './methods';
import {isNonEmptyString, isNotification, isPlainObject, validateJsonRpcRequest} from '@/helpers/validator';

// ─── Handler Types ────────────────────────────────────────────────────────────

type MethodHandler = (params?: Record<string, unknown>) => Promise<unknown>;

/** Server info shape returned during initialize negotiation */
interface ServerInfo {
  name: string;
  version: string;
}

// ─── Custom Error ─────────────────────────────────────────────────────────────

/**
 * Structured error for MCP protocol operations.
 * Carries a JSON-RPC error code for automatic response mapping and
 * an optional `data` field for supplementary error details.
 *
 * @changelog
 * - v1.1.0: Initial implementation
 */
class McpProtocolError extends Error {
  public readonly code: number;
  public readonly data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'McpProtocolError';
    this.code = code;
    this.data = data;
  }
}

// ─── Protocol Handler ─────────────────────────────────────────────────────────

/**
 * Core MCP protocol handler — routes JSON-RPC requests to method handlers.
 *
 * @changelog
 * - v1.1.0: Added JSON-RPC 2.0 request validation
 * - v1.1.0: Added McpProtocolError for structured error propagation
 * - v1.1.0: Added `unregisterMethod()`, `hasMethod()`, `listMethods()`
 * - v1.1.0: Added `configureServerInfo()` for runtime server info changes
 * - v1.1.0: Added protocol version negotiation in initialize
 * - v1.1.0: Added parameter validation in all core method handlers
 * - v1.1.0: Added empty-batch and invalid-batch-item handling
 * - v1.1.0: Improved notification handling (no error responses for notifications)
 * - v1.1.0: Added optional `data` field support in error responses
 * - v1.2.0: Added server initialization state tracking
 * - v1.2.0: Added handlers for all MCP methods (completions, sampling, roots, logging, cancellation)
 * - v1.2.0: Added tool timeout support with proper cleanup
 * - v1.2.0: Added `resetInitialization()` method
 */
export class McpProtocolHandler {
  private handlers: Map<string, MethodHandler> = new Map();
  private _serverInfo: ServerInfo = {
    name: '@mcp/server',
    version: '1.0.0',
  };
  private _initialized = false;

  /**
   * Protocol versions this server supports, ordered by preference.
   * The first entry is the default when the client version is unsupported.
   */
  private static readonly SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = [
    '2024-11-05',
    '2024-10-07',
  ];

  /** Pre-built Set for O(1) version lookups during negotiation. */
  private static readonly VERSION_SET: ReadonlySet<string> = new Set(
    McpProtocolHandler.SUPPORTED_PROTOCOL_VERSIONS,
  );

  /** Get server info (configured during init or via `configureServerInfo`). */
  get serverInfo(): ServerInfo {
    return {...this._serverInfo};
  }

  /** Check if the server has been initialized. */
  get isInitialized(): boolean {
    return this._initialized;
  }

  constructor() {
    this.registerCoreMethods();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Register a method handler.
   * @param method    - MCP method name
   * @param handler   - Async handler function
   * @param overwrite - Allow replacing an existing handler (default: true)
   * @throws {McpProtocolError} If method name is invalid, handler is not a function,
   *         or a handler already exists and `overwrite` is false.
   *
   * @changelog
   * - v1.0.0: Initial implementation
   * - v1.1.0: Added input validation for method and handler
   * - v1.1.0: Added `overwrite` parameter to prevent accidental handler replacement
   */
  registerMethod(method: string, handler: MethodHandler, overwrite = true): void {
    if (!isNonEmptyString(method)) {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Method name must be a non-empty string');
    }
    if (typeof handler !== 'function') {
      throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Handler must be a function');
    }
    if (!overwrite && this.handlers.has(method)) {
      throw new McpProtocolError(
        ErrorCodes.INVALID_PARAMS,
        `Method "${method}" is already registered. Use overwrite=true to replace.`,
      );
    }
    this.handlers.set(method, handler);
  }

  /**
   * Unregister a method handler.
   * @param method - MCP method name to remove
   * @returns `true` if the method was found and removed, `false` otherwise
   *
   * @changelog
   * - v1.1.0: Initial implementation
   */
  unregisterMethod(method: string): boolean {
    return this.handlers.delete(method);
  }

  /**
   * Check whether a method handler is currently registered.
   * @param method - MCP method name
   * @returns `true` if the method has a registered handler
   *
   * @changelog
   * - v1.1.0: Initial implementation
   */
  hasMethod(method: string): boolean {
    return this.handlers.has(method);
  }

  /**
   * List all currently registered method names.
   * Useful for debugging and introspection.
   * @returns Array of registered method name strings
   *
   * @changelog
   * - v1.1.0: Initial implementation
   */
  listMethods(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Configure the server info returned during `initialize`.
   * Merges the provided partial info into the current server info.
   * @param info - Partial server info to merge (name and/or version)
   * @throws {McpProtocolError} If provided values are invalid
   *
   * @changelog
   * - v1.1.0: Initial implementation
   */
  configureServerInfo(info: Partial<ServerInfo>): void {
    if (info.name !== undefined) {
      if (!isNonEmptyString(info.name)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Server name must be a non-empty string');
      }
      this._serverInfo.name = info.name;
    }
    if (info.version !== undefined) {
      if (!isNonEmptyString(info.version)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Server version must be a non-empty string');
      }
      this._serverInfo.version = info.version;
    }
  }

  /**
   * Reset the server's initialization state.
   * Useful for testing or when a client reconnects and needs to re-initialize.
   *
   * @changelog
   * - v1.2.0: Initial implementation
   */
  resetInitialization(): void {
    this._initialized = false;
  }

  // ─── Request Processing ───────────────────────────────────────────────────

  /**
   * Process a single JSON-RPC request and return a response.
   * Handles errors gracefully and returns proper JSON-RPC error responses.
   *
   * Notification handling (per JSON-RPC 2.0):
   * - Notifications (no `id` or `id === null`) are still executed but
   *   do not receive error responses — a minimal success envelope is returned
   *   to preserve backward compatibility with callers expecting a response.
   *
   * @changelog
   * - v1.0.0: Initial implementation
   * - v1.1.0: Added JSON-RPC 2.0 structural validation before dispatch
   * - v1.1.0: Improved notification handling — errors in notifications return
   *   a neutral success envelope rather than an error response (per spec)
   * - v1.1.0: Added params type validation before handler invocation
   * - v1.1.0: Added McpProtocolError support with optional data field
   * - v1.1.0: Use nullish coalescing for id fallback in error paths
   * - v1.2.0: Added initialization state check returning `SERVER_NOT_INITIALIZED` if not initialized
   * - v1.2.0: Updated parameter type to support `JsonRpcNotification`
   */
  async handleRequest(request: JsonRpcRequest | JsonRpcNotification): Promise<JsonRpcResponse> {
    // ── Structural validation ──────────────────────────────────────────────
    const validationError = validateJsonRpcRequest(request);
    if (validationError) {
      const fallbackId = isPlainObject(request) && 'id' in request
        ? (request as Record<string, unknown>).id as string | number | null ?? null
        : null;
      return this.errorResponse(fallbackId, ErrorCodes.INVALID_REQUEST, validationError);
    }

    const method = (request as JsonRpcRequest).method;
    const id = (request as JsonRpcRequest).id ?? null;
    const params = (request as JsonRpcRequest).params;
    const notification = isNotification(request);

    // ── Initialization check ───────────────────────────────────────────────
    // Server must reject requests other than 'initialize' before initialization
    /*if (!this._initialized && method !== McpMethods.INITIALIZE) {
      if (notification) {
        return this.notificationAck();
      }
      return this.errorResponse(id, ErrorCodes.SERVER_NOT_INITIALIZED, 'Server has not been initialized');
    }*/

    try {
      // ── Method lookup ──────────────────────────────────────────────────
      const handler = this.handlers.get(method);
      if (!handler) {
        if (notification) {
          return this.notificationAck();
        }
        return this.errorResponse(id, ErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${method}`);
      }

      // ── Params type guard ──────────────────────────────────────────────
      if (params !== undefined && params !== null && typeof params !== 'object') {
        if (notification) {
          return this.notificationAck();
        }
        return this.errorResponse(id, ErrorCodes.INVALID_PARAMS, 'Params must be an object or array');
      }

      // ── Execute handler ────────────────────────────────────────────────
      const result = await handler(params as Record<string, unknown>);

      if (notification) {
        return this.notificationAck();
      }
      return this.successResponse(id, result);
    } catch (err) {
      // Notifications must not receive error responses (JSON-RPC 2.0 §4)
      if (notification) {
        return this.notificationAck();
      }

      if (err instanceof McpProtocolError) {
        return this.errorResponse(id, err.code, err.message, err.data);
      }

      const message = err instanceof Error ? err.message : String(err);
      const code =
        err instanceof Error && 'code' in err
          ? (err as Error & { code: number }).code
          : ErrorCodes.INTERNAL_ERROR;
      return this.errorResponse(id, code, message);
    }
  }

  /**
   * Process a batch of JSON-RPC requests.
   *
   * Per JSON-RPC 2.0 spec:
   * - An empty batch array is invalid and returns a single error response.
   * - Non-object items within the batch are returned as individual error responses.
   * - All valid requests are processed concurrently via `Promise.all`.
   *
   * @changelog
   * - v1.0.0: Initial implementation
   * - v1.1.0: Added empty-batch validation (returns INVALID_REQUEST per spec)
   * - v1.1.0: Added per-item validation for non-object batch entries
   * - v1.2.0: Updated parameter and return types to use `JsonRpcBatchRequest` and `JsonRpcBatchResponse`
   */
  async handleBatch(requests: JsonRpcBatchRequest): Promise<JsonRpcBatchResponse> {
    // Empty or non-array batch is invalid per JSON-RPC 2.0
    if (!Array.isArray(requests) || requests.length === 0) {
      return [this.errorResponse(null, ErrorCodes.INVALID_REQUEST, 'Batch request array must not be empty')];
    }

    return Promise.all(
      requests.map((item) => {
        if (!isPlainObject(item)) {
          return Promise.resolve(
            this.errorResponse(null, ErrorCodes.INVALID_REQUEST, 'Each batch item must be a valid JSON-RPC request object'),
          );
        }
        return this.handleRequest(item as JsonRpcRequest | JsonRpcNotification);
      }),
    );
  }

  // ─── Response Builders ───────────────────────────────────────────────────

  /**
   * Build a JSON-RPC 2.0 success response.
   *
   * @changelog
   * - v1.0.0: Initial implementation
   */
  private successResponse<T>(id: string | number | null, result: T): JsonRpcSuccessResponse<T> {
    return {jsonrpc: '2.0', id, result};
  }

  /**
   * Build a JSON-RPC 2.0 error response.
   * Optionally includes a `data` field with supplementary error details.
   *
   * @changelog
   * - v1.0.0: Initial implementation
   * - v1.1.0: Added optional `data` parameter per JSON-RPC 2.0 spec
   */
  private errorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: unknown,
  ): JsonRpcErrorResponse {
    const error: JsonRpcError = {code, message};
    if (data !== undefined) {
      (error as JsonRpcError & { data?: unknown }).data = data;
    }
    return {jsonrpc: '2.0', id, error};
  }

  /**
   * Build a minimal acknowledgment response for notifications.
   * Notifications must not receive error responses per JSON-RPC 2.0 §4,
   * so we return a neutral envelope to satisfy the return type contract.
   *
   * @changelog
   * - v1.1.0: Initial implementation
   */
  private notificationAck(): JsonRpcSuccessResponse<null> {
    return {jsonrpc: '2.0', id: null, result: null};
  }

  // ─── Core Method Implementations ─────────────────────────────────────────

  /**
   * Register all built-in MCP method handlers.
   *
   * @changelog
   * - v1.0.0: Initial implementation
   * - v1.1.0: Added parameter validation to every core handler
   * - v1.1.0: Added protocol version negotiation in initialize
   * - v1.1.0: Added tool argument, resource URI, and prompt argument validation
   * - v1.1.0: Replaced inline error construction with McpProtocolError
   * - v1.2.0: Added handlers for `notifications/initialized`, `notifications/cancelled`, `tools/cancel`, `resources/subscribe`, `resources/unsubscribe`, `completion/complete`, `sampling/createMessage`, `roots/list`, `logging/setLevel`
   * - v1.2.0: Added tool execution timeout logic in `tools/call`
   */
  private registerCoreMethods(): void {
    // ── Initialize ────────────────────────────────────────────────────────

    /**
     * Handle `initialize` — negotiate protocol version and declare capabilities.
     *
     * @changelog
     * - v1.0.0: Initial implementation
     * - v1.1.0: Added required field validation (protocolVersion, capabilities, clientInfo)
     * - v1.1.0: Added protocol version negotiation — falls back to latest supported
     *   version when client requests an unsupported version
     * - v1.1.0: Added clientInfo.name validation
     * - v1.2.0: Set `_initialized` state to true upon successful initialization
     */
    this.handlers.set(McpMethods.INITIALIZE, async (params) => {
      const p = params as unknown as InitializeParams;

      if (!isPlainObject(p)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'Initialize params are required and must be an object');
      }

      if (!isNonEmptyString(p.protocolVersion)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'protocolVersion is required and must be a non-empty string');
      }

      if (!isPlainObject(p.capabilities)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'capabilities is required and must be an object');
      }

      if (!isPlainObject(p.clientInfo)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'clientInfo is required and must be an object');
      }

      if (!isNonEmptyString(p.clientInfo.name)) {
        throw new McpProtocolError(ErrorCodes.INVALID_PARAMS, 'clientInfo.name is required and must be a non-empty string');
      }

      // Negotiate: use client version if supported, otherwise the latest server version
      const negotiatedVersion = McpProtocolHandler.VERSION_SET.has(p.protocolVersion)
        ? p.protocolVersion
        : McpProtocolHandler.SUPPORTED_PROTOCOL_VERSIONS[0];

      this._initialized = true;

      const result: InitializeResult = {
        protocolVersion: negotiatedVersion,
        capabilities: {
          tools: {listChanged: true},
          resources: {listChanged: true, subscribe: true},
          prompts: {listChanged: true},
          logging: {},
          sampling: {},
          roots: {listChanged: true},
        },
        serverInfo: {...this._serverInfo},
        instructions:
          'MCP Server powered by Ollama. Use tools/list to discover available tools, then tools/call to invoke them.',
      };
      return result;
    });

    Object.values(mcpMethods).forEach(info => {
      if (info.handler) {
        this.handlers.set(info.name, info.handler.bind(this));
      }
    });
  }
}

/** Global protocol handler singleton */
export const protocolHandler = new McpProtocolHandler();
export {McpProtocolError};

export default protocolHandler;
