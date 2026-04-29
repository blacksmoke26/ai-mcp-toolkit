/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/errors
 * @description Error code definitions and helper functions for the WebSocket system.
 *
 * This module provides:
 *
 * - **Predefined error codes** — Structured constants for common error conditions
 * - **Error code categories** — Groups errors by origin (MCP, WebSocket, System)
 * - **Helper functions** — Convenience functions for error creation and formatting
 * - **Error type guards** — Type-safe error object validation
 *
 * ## Usage Example
 *
 * ```typescript
 * import { WsErrors, isWsError } from '@/websocket/errors';
 *
 * // Create a standard error response
 * const error = WsErrors.toolNotFound('my-tool');
 *
 * // Check if an object is a WebSocket error
 * if (isWsError(response)) {
 *   console.error(`WS Error ${response.code}: ${response.message}`);
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════════════
// MCP-Specific Error Codes — Based on JSON-RPC 2.0 and MCP spec
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Standard JSON-RPC 2.0 and MCP-specific error codes.
 * These codes follow the JSON-RPC 2.0 specification and extend it with MCP-specific codes.
 */
export const McpErrorCodes = {
  /** Parse error: invalid JSON was received by the server */
  PARSE_ERROR: -32700,

  /** Invalid Request: the JSON sent is not a valid Request object */
  INVALID_REQUEST: -32600,

  /** Method not found: the method does not exist / is not available */
  METHOD_NOT_FOUND: -32601,

  /** Invalid params: invalid method parameter(s) */
  INVALID_PARAMS: -32602,

  /** Internal JSON-RPC error: internal error */
  INTERNAL_ERROR: -32603,

  // ─── MCP-Specific Error Codes (reserved range: -32000 to -32099) ───

  /** MCP tool not found */
  TOOL_NOT_FOUND: -32001,

  /** MCP resource not found */
  RESOURCE_NOT_FOUND: -32002,

  /** MCP provider error (e.g., LLM unavailable) */
  PROVIDER_ERROR: -32003,

  /** MCP rate limit exceeded */
  RATE_LIMITED: -32004,

  /** MCP authentication required */
  AUTH_REQUIRED: -32005,

  /** MCP authentication failed */
  AUTH_FAILED: -32006,

  /** MCP invalid authentication token */
  INVALID_TOKEN: -32007,

  /** MCP server not found */
  SERVER_NOT_FOUND: -32008,

  /** MCP server connection failed */
  SERVER_CONNECTION_FAILED: -32009,

  /** MCP prompt not found */
  PROMPT_NOT_FOUND: -32010,

  /** MCP resource access denied */
  RESOURCE_ACCESS_DENIED: -32011,

  /** MCP tool execution failed */
  TOOL_EXECUTION_FAILED: -32012,

  /** MCP invalid schema */
  INVALID_SCHEMA: -32013,

  /** MCP connection closed by peer */
  CONNECTION_CLOSED: -32014,

  /** MCP connection timeout */
  CONNECTION_TIMEOUT: -32015,

  /** MCP too many connections */
  TOO_MANY_CONNECTIONS: -32016,

  /** MCP room not found */
  ROOM_NOT_FOUND: -32017,

  /** MCP room is full */
  ROOM_FULL: -32018,

  /** MCP room already exists */
  ROOM_ALREADY_EXISTS: -32019,

  /** MCP simulation not found */
  SIMULATION_NOT_FOUND: -32020,

  /** MCP simulation already running */
  SIMULATION_ALREADY_RUNNING: -32021,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════════════
// WebSocket-Specific Error Codes
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Error codes specific to the WebSocket transport layer.
 * These are used when WebSocket protocol-level errors occur.
 */
export const WsErrorCodes = {
  /** Invalid message format */
  INVALID_MESSAGE: -40001,

  /** Message too large */
  MESSAGE_TOO_LARGE: -40002,

  /** Authentication required for this operation */
  AUTH_REQUIRED: -40003,

  /** Authentication failed */
  AUTH_FAILED: -40004,

  /** Invalid authentication token */
  INVALID_TOKEN: -40005,

  /** Operation not allowed in current state */
  OPERATION_NOT_ALLOWED: -40006,

  /** Too many open connections from this client */
  TOO_MANY_CONNECTIONS: -40007,

  /** Connection limit exceeded */
  CONNECTION_LIMIT_EXCEEDED: -40008,

  /** Session expired */
  SESSION_EXPIRED: -40009,

  /** Permission denied */
  PERMISSION_DENIED: -40010,

  /** Feature not supported */
  FEATURE_NOT_SUPPORTED: -40011,

  /** Invalid room name */
  INVALID_ROOM: -40012,

  /** Room join failed */
  ROOM_JOIN_FAILED: -40013,

  /** Room leave failed */
  ROOM_LEAVE_FAILED: -40014,

  /** Message send failed */
  SEND_FAILED: -40015,

  /** Connection already closed */
  CONNECTION_CLOSED: -40016,

  /** Protocol version not supported */
  PROTOCOL_VERSION_UNSUPPORTED: -40017,

  /** Invalid event name */
  INVALID_EVENT_NAME: -40018,

  /** Handler not found for event */
  HANDLER_NOT_FOUND: -40019,

  /** Handler execution error */
  HANDLER_EXECUTION_ERROR: -40020,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════════════
// Combined Error Code Registry
// ═══════════════════════════════════════════════════════════════════════════════════════

/** All error codes combined */
export const ALL_ERROR_CODES = {
  ...McpErrorCodes,
  ...WsErrorCodes,
} as const;

/** Union type of all error codes */
export type WsErrorCode = (typeof ALL_ERROR_CODES)[keyof typeof ALL_ERROR_CODES];

// ═══════════════════════════════════════════════════════════════════════════════════════
// Error Response Types
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Standard WebSocket error response envelope.
 * All error responses sent to clients should follow this structure.
 */
export interface WsErrorResponse {
  /** Error code (from the predefined error code constants) */
  code: WsErrorCode;

  /** Human-readable error message */
  message: string;

  /** Additional context data (optional) */
  data?: unknown;

  /** Optional suggestion for resolving the error */
  hint?: string;

  /** Optional timestamp of when the error occurred */
  timestamp?: string;
}

/**
 * Typed error response with known code.
 * Used when the error code is known at compile time.
 */
export interface WsTypedErrorResponse<C extends WsErrorCode> extends WsErrorResponse {
  code: C;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Error Code Metadata
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Metadata describing each error code.
 * Used for documentation and help messages.
 */
const ERROR_CODE_DESCRIPTIONS: Record<number, string> = {
  ...Object.fromEntries(
    Object.entries(McpErrorCodes).map(([key, value]) => [value, `MCP error ${key}`]),
  ),
  ...Object.fromEntries(
    Object.entries(WsErrorCodes).map(([key, value]) => [value, `WebSocket error ${key}`]),
  ),
};

/**
 * Get a human-readable description for an error code.
 * @param code - Error code to look up
 * @returns Description string, or "Unknown error code" if not found
 */
export function getErrorCodeDescription(code: number): string {
  return ERROR_CODE_DESCRIPTIONS[code] || 'Unknown error code';
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Error Code Helper Classes and Functions
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Helper class for constructing standardized error responses.
 */
export class WsErrors {
  /**
   * Create a standard error response.
   * @param code - Error code
   * @param message - Human-readable message
   * @param data - Optional additional data
   * @param hint - Optional hint for resolution
   * @returns Standardized error response object
   */
  static create(
    code: WsErrorCode,
    message: string,
    data?: unknown,
    hint?: string,
  ): WsErrorResponse {
    return {
      code,
      message,
      data,
      hint,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── MCP Error Helpers ──

  /**
   * Create a "tool not found" error.
   * @param toolName - Name of the missing tool
   */
  static toolNotFound(toolName: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.TOOL_NOT_FOUND,
      `Tool not found: ${toolName}`,
      { toolName },
      'Check the available tools using mcp:tools:list',
    );
  }

  /**
   * Create a "resource not found" error.
   * @param uri - URI of the missing resource
   */
  static resourceNotFound(uri: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.RESOURCE_NOT_FOUND,
      `Resource not found: ${uri}`,
      { uri },
      'Check the available resources using mcp:resources:list',
    );
  }

  /**
   * Create a "provider error" indicating an LLM provider issue.
   * @param providerName - Name of the provider
   * @param details - Optional details about the error
   */
  static providerError(providerName: string, details?: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.PROVIDER_ERROR,
      details || `Provider error: ${providerName} is unavailable`,
      { providerName },
      'Check the provider status using provider:health',
    );
  }

  /**
   * Create a "prompt not found" error.
   * @param promptName - Name of the missing prompt
   */
  static promptNotFound(promptName: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.PROMPT_NOT_FOUND,
      `Prompt not found: ${promptName}`,
      { promptName },
      'Check the available prompts using mcp:prompts:list',
    );
  }

  // ─── WebSocket Error Helpers ──

  /**
   * Create an "invalid message" error.
   * @param reason - Optional reason why the message was invalid
   */
  static invalidMessage(reason?: string): WsErrorResponse {
    return this.create(
      WsErrorCodes.INVALID_MESSAGE,
      reason || 'Invalid message format',
      undefined,
      'Messages must be valid JSON with an "event" field',
    );
  }

  /**
   * Create a "message too large" error.
   * @param maxSize - Maximum allowed size in bytes
   */
  static messageTooLarge(maxSize: number): WsErrorResponse {
    return this.create(
      WsErrorCodes.MESSAGE_TOO_LARGE,
      `Message too large: exceeds maximum of ${maxSize} bytes`,
      { maxSize },
      'Try reducing your message size or using streaming',
    );
  }

  /**
   * Create an "authentication required" error.
   */
  static authRequired(): WsErrorResponse {
    return this.create(
      WsErrorCodes.AUTH_REQUIRED,
      'Authentication is required for this operation',
      undefined,
      'Send a ws:auth event with your token before proceeding',
    );
  }

  /**
   * Create an "authentication failed" error.
   * @param reason - Optional reason for authentication failure
   */
  static authFailed(reason?: string): WsErrorResponse {
    return this.create(
      WsErrorCodes.AUTH_FAILED,
      reason || 'Authentication failed',
      undefined,
      'Verify your token and try again',
    );
  }

  /**
   * Create an "invalid token" error.
   */
  static invalidToken(): WsErrorResponse {
    return this.create(
      WsErrorCodes.INVALID_TOKEN,
      'Invalid or expired authentication token',
      undefined,
      'Obtain a new token and authenticate again',
    );
  }

  /**
   * Create an "operation not allowed" error.
   * @param operation - The disallowed operation
   * @param reason - Why the operation is not allowed
   */
  static operationNotAllowed(operation: string, reason: string): WsErrorResponse {
    return this.create(
      WsErrorCodes.OPERATION_NOT_ALLOWED,
      `Operation not allowed: ${operation} — ${reason}`,
      { operation },
    );
  }

  /**
   * Create a "room not found" error.
   * @param roomName - Name of the missing room
   */
  static roomNotFound(roomName: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.ROOM_NOT_FOUND,
      `Room not found: ${roomName}`,
      { roomName },
      'List available rooms using system:info',
    );
  }

  /**
   * Create a "room is full" error.
   * @param roomName - Name of the full room
   * @param maxMembers - Maximum number of members
   */
  static roomFull(roomName: string, maxMembers: number): WsErrorResponse {
    return this.create(
      McpErrorCodes.ROOM_FULL,
      `Room is full: ${roomName} (max ${maxMembers} members)`,
      { roomName, maxMembers },
    );
  }

  /**
   * Create a "handler not found" error.
   * @param event - The event name with no handler
   */
  static handlerNotFound(event: string): WsErrorResponse {
    return this.create(
      WsErrorCodes.HANDLER_NOT_FOUND,
      `No handler registered for event: ${event}`,
      { event },
    );
  }

  /**
   * Create a "handler execution error" from an exception.
   * @param event - The event that caused the error
   * @param error - The caught error object
   */
  static handlerExecutionError(event: string, error: unknown): WsErrorResponse {
    const message = error instanceof Error ? error.message : String(error);
    return this.create(
      WsErrorCodes.HANDLER_EXECUTION_ERROR,
      `Error executing handler for "${event}": ${message}`,
      { event, originalError: message },
    );
  }

  /**
   * Create a "simulation not found" error.
   * @param simulationName - Name of the missing simulation
   */
  static simulationNotFound(simulationName: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.SIMULATION_NOT_FOUND,
      `Simulation not found: ${simulationName}`,
      { simulationName },
      'List available simulations using simulate:scenarios:list',
    );
  }

  /**
   * Create a "simulation already running" error.
   * @param simulationName - Name of the running simulation
   */
  static simulationAlreadyRunning(simulationName: string): WsErrorResponse {
    return this.create(
      McpErrorCodes.SIMULATION_ALREADY_RUNNING,
      `Simulation "${simulationName}" is already running`,
      { simulationName },
      'Wait for the simulation to complete or abort it first',
    );
  }

  // ─── Generic Helpers ──

  /**
   * Create a generic internal server error.
   * @param details - Optional additional details
   */
  static internalError(details?: string): WsErrorResponse {
    return this.create(
      WsErrorCodes.HANDLER_EXECUTION_ERROR,
      details || 'An unexpected internal error occurred',
    );
  }

  /**
   * Create a permission denied error.
   * @param resource - The resource that access was denied to
   */
  static permissionDenied(resource: string): WsErrorResponse {
    return this.create(
      WsErrorCodes.PERMISSION_DENIED,
      `Permission denied for resource: ${resource}`,
      { resource },
    );
  }

  /**
   * Create a rate limit exceeded error.
   * @param limit - The rate limit
   * @param retryAfter - Seconds until the client can retry
   */
  static rateLimited(limit: number, retryAfter: number): WsErrorResponse {
    return this.create(
      McpErrorCodes.RATE_LIMITED,
      `Rate limit exceeded: ${limit} requests. Retry after ${retryAfter}s.`,
      { limit, retryAfter },
      `Wait ${retryAfter} seconds before sending more requests`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if an object is a valid WsErrorResponse.
 * @param obj - Object to check
 * @returns true if the object matches the WsErrorResponse shape
 */
export function isWsErrorResponse(obj: unknown): obj is WsErrorResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const objTyped = obj as Record<string, unknown>;
  return (
    typeof objTyped.code === 'number' &&
    typeof objTyped.message === 'string' &&
    (objTyped.data === undefined || typeof objTyped.data === 'object' || typeof objTyped.data === 'string' || typeof objTyped.data === 'number') &&
    (objTyped.hint === undefined || typeof objTyped.hint === 'string') &&
    (objTyped.timestamp === undefined || typeof objTyped.timestamp === 'string')
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// Export Default
// ═══════════════════════════════════════════════════════════════════════════════════════

export default {
  McpErrorCodes,
  WsErrorCodes,
  ALL_ERROR_CODES,
  WsErrors,
  isWsErrorResponse,
  getErrorCodeDescription,
};