/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module mcp/types
 * @description Complete type definitions for the Model Context Protocol (MCP).
 *
 * MCP is a standardized protocol for connecting AI models to external tools,
 * resources, and prompt templates. It uses JSON-RPC 2.0 as its transport layer.
 *
 * ## Protocol Overview
 *
 * The MCP protocol defines three core primitives:
 *
 * 1. **Tools** — Functions the model can invoke (e.g., "search database", "read file")
 * 2. **Resources** — Read-only data sources the model can access (e.g., "file://path", "db://table")
 * 3. **Prompts** — Reusable prompt templates with variable substitution
 *
 * ## Transport
 *
 * MCP supports two transport modes:
 * - **stdio** — Bidirectional pipe (for CLI tools and local processes)
 * - **HTTP+SSE** — Server-Sent Events for server-to-client streaming
 *
 * ## References
 *
 * - [MCP Specification](https://modelcontextprotocol.io/specification)
 * - [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
 *
 * @changelog
 * - v1.1.0: Added runtime type guards for JSON-RPC and MCP validation
 * - v1.1.0: Added `JsonRpcNotification` and batch request/response types
 * - v1.1.0: Added `RequestMeta` with progress token support for MCP requests
 * - v1.1.0: Added missing MCP protocol types (Sampling, Roots, Completions, Cancellations)
 * - v1.1.0: Refactored `ToolContent` and `ChatMessage` into strict discriminated unions
 * - v1.1.0: Added new error codes for standard edge cases
 * - v1.1.0: Added new MCP method names to `McpMethods`
 */

// ═══════════════════════════════════════════════════════════════════════════════
// JSON-RPC 2.0 Base Types
// ═══════════════════════════════════════════════════════════════════════════════

import {McpProtocolHandler} from '@/mcp/protocol';

/**
 * JSON-RPC 2.0 request envelope.
 * @changelog Added strict validation requirements for `jsonrpc` and `id` fields. Added `_meta` support.
 */
export interface JsonRpcRequest {
  /** JSON-RPC version, always "2.0" */
  jsonrpc: '2.0';
  /** Request identifier (string, number, or null). Must be unique per request. */
  id: string | number | null;
  /** Method name to invoke. Must be a valid string. */
  method: string;
  /** Method parameters (positional args or named params). */
  params?: Record<string, unknown> | unknown[];
  /** MCP-specific request metadata, including progress tokens. */
  _meta?: RequestMeta;
}

/**
 * JSON-RPC 2.0 notification envelope (no id, no response expected).
 * @changelog Initial implementation to properly separate notifications from requests per spec.
 */
export interface JsonRpcNotification {
  /** JSON-RPC version, always "2.0" */
  jsonrpc: '2.0';
  /** Method name to invoke. */
  method: string;
  /** Method parameters. */
  params?: Record<string, unknown> | unknown[];
  /** MCP-specific notification metadata. */
  _meta?: Record<string, unknown>;
}

export interface McpMethodSignature {
  name: string;
  description: string;
  params: string;
  handler?(this: McpProtocolHandler, params?: Record<string, unknown>): Promise<unknown>;
}

/**
 * JSON-RPC 2.0 batch request type (array of requests/notifications).
 * @changelog Initial implementation.
 */
export type JsonRpcBatchRequest = (JsonRpcRequest | JsonRpcNotification)[];

/**
 * JSON-RPC 2.0 success response.
 * @changelog Added generic type `T` for result payload typing.
 */
export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result: T;
}

/**
 * JSON-RPC 2.0 error response.
 * @changelog Ensured `error` field is mandatory and strictly typed.
 */
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcError;
}

/**
 * JSON-RPC 2.0 batch response type (array of responses).
 * @changelog Initial implementation.
 */
export type JsonRpcBatchResponse = JsonRpcResponse[];

/**
 * JSON-RPC 2.0 error object.
 * @changelog Added constraint that `code` must be a number and `message` a non-empty string. Added optional `data`.
 */
export interface JsonRpcError {
  /** Error code (predefined or custom) */
  code: number;
  /** Short human-readable error message */
  message: string;
  /** Additional error data (optional) */
  data?: unknown;
}

/** Union type for all JSON-RPC responses */
export type JsonRpcResponse<T = unknown> =
  | JsonRpcSuccessResponse<T>
  | JsonRpcErrorResponse;

/**
 * MCP-specific request metadata.
 * @changelog Initial implementation.
 */
export interface RequestMeta {
  /** Token to receive progress notifications for this request */
  progressToken?: ProgressToken;
}

// ─── Predefined JSON-RPC Error Codes ──────────────────────────────────────────

/**
 * Standard and MCP-specific error codes.
 * @changelog Added `INVALID_CURSOR`, `UNAUTHORIZED`, `SERVER_NOT_INITIALIZED`, `UNSUPPORTED_OPERATION`, and `TIMEOUT`.
 */
export const ErrorCodes = {
  /** Parse error: invalid JSON was received */
  PARSE_ERROR: -32700,
  /** Invalid Request: the JSON sent is not a valid Request object */
  INVALID_REQUEST: -32600,
  /** Method not found: the method does not exist / is not available */
  METHOD_NOT_FOUND: -32601,
  /** Invalid params: invalid method parameter(s) */
  INVALID_PARAMS: -32602,
  /** Internal error: internal JSON-RPC error */
  INTERNAL_ERROR: -32603,

  // MCP-specific error codes (reserved range: -32000 to -32099)
  /** Tool not found */
  TOOL_NOT_FOUND: -32001,
  /** Resource not found */
  RESOURCE_NOT_FOUND: -32002,
  /** Provider error (e.g., LLM unavailable) */
  PROVIDER_ERROR: -32003,
  /** Rate limit exceeded */
  RATE_LIMITED: -32004,
  /** Invalid pagination cursor */
  INVALID_CURSOR: -32005,
  /** Unauthorized access */
  UNAUTHORIZED: -32006,
  /** Server has not been initialized */
  SERVER_NOT_INITIALIZED: -32007,
  /** Unsupported operation requested */
  UNSUPPORTED_OPERATION: -32008,
  /** Operation timed out */
  TIMEOUT: -32009,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Runtime Validation Type Guards
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates if an unknown value is a proper JsonRpcRequest.
 * @param val - The value to check
 * @returns True if the value is a valid JsonRpcRequest
 * @changelog Initial implementation.
 */
export function isJsonRpcRequest(val: unknown): val is JsonRpcRequest {
  if (typeof val !== 'object' || val === null) return false;
  const req = val as Record<string, unknown>;
  return (
    req.jsonrpc === '2.0' &&
    typeof req.method === 'string' &&
    (typeof req.id === 'string' || typeof req.id === 'number' || req.id === null)
  );
}

/**
 * Validates if an unknown value is a proper JsonRpcNotification.
 * @param val - The value to check
 * @returns True if the value is a valid JsonRpcNotification
 * @changelog Initial implementation.
 */
export function isJsonRpcNotification(val: unknown): val is JsonRpcNotification {
  if (typeof val !== 'object' || val === null) return false;
  const req = val as Record<string, unknown>;
  return req.jsonrpc === '2.0' && typeof req.method === 'string' && !('id' in req);
}

/**
 * Validates if an unknown value is a proper JsonRpcSuccessResponse.
 * @param val - The value to check
 * @returns True if the value is a valid JsonRpcSuccessResponse
 * @changelog Initial implementation.
 */
export function isJsonRpcSuccessResponse(val: unknown): val is JsonRpcSuccessResponse {
  if (typeof val !== 'object' || val === null) return false;
  const res = val as Record<string, unknown>;
  return res.jsonrpc === '2.0' && 'result' in res && !('error' in res);
}

/**
 * Validates if an unknown value is a proper JsonRpcErrorResponse.
 * @param val - The value to check
 * @returns True if the value is a valid JsonRpcErrorResponse
 * @changelog Initial implementation.
 */
export function isJsonRpcErrorResponse(val: unknown): val is JsonRpcErrorResponse {
  if (typeof val !== 'object' || val === null) return false;
  const res = val as Record<string, unknown>;
  if (res.jsonrpc !== '2.0' || !('error' in res)) return false;
  const err = res.error;
  return typeof err === 'object' && err !== null && typeof (err as JsonRpcError).code === 'number' && typeof (err as JsonRpcError).message === 'string';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP Protocol Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Client capabilities advertised during initialization.
 * @changelog Added `experimental` and `sampling` fields.
 */
export interface ClientCapabilities {
  /** Client supports listing/reading resources */
  resources?: { subscribe?: boolean; listChanged?: boolean };
  /** Client supports listing/invoking tools */
  tools?: { listChanged?: boolean };
  /** Client supports listing/getting prompts */
  prompts?: { listChanged?: boolean };
  /** Client supports sampling (LLM requests) */
  sampling?: {};
  /** Experimental features */
  experimental?: Record<string, unknown>;
}

/**
 * Server capabilities advertised during initialization.
 * @changelog Added `experimental`, `sampling`, and stricter typing for `logging`.
 */
export interface ServerCapabilities {
  resources?: { subscribe?: boolean; listChanged?: boolean };
  tools?: { listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  /** Server supports logging */
  logging?: { level?: LoggingLevel };
  /** Server supports sampling (LLM requests) */
  sampling?: {};
  /** Experimental features */
  experimental?: Record<string, unknown>;
}

/**
 * Parameters for the "initialize" method.
 * @changelog Added `traceLevel` for debugging support.
 */
export interface InitializeParams {
  /** Protocol version the client supports */
  protocolVersion: string;
  /** Client capabilities */
  capabilities: ClientCapabilities;
  /** Client implementation info */
  clientInfo: Implementation;
  /** Optional trace level for debugging */
  traceLevel?: 'off' | 'messages' | 'verbose';
}

/**
 * Result of the "initialize" method.
 * @changelog Added `traceLevel` to result to confirm server setting.
 */
export interface InitializeResult {
  /** Protocol version the server supports */
  protocolVersion: string;
  /** Server capabilities */
  capabilities: ServerCapabilities;
  /** Server implementation info */
  serverInfo: Implementation;
  /** Optional instructions for the client */
  instructions?: string;
  /** Confirmed trace level */
  traceLevel?: 'off' | 'messages' | 'verbose';
}

/**
 * Implementation metadata (client or server).
 * @changelog No changes.
 */
export interface Implementation {
  name: string;
  version: string;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

/**
 * JSON Schema type definition (simplified).
 * @changelog Added `const` and `allOf`/`anyOf`/`oneOf` support for complex schemas.
 */
export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  const?: unknown;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  [key: string]: unknown;
};

/**
 * Tool definition exposed by the MCP server.
 * @changelog Added `category` for better organization and `experimental` for metadata. Added `annotations`.
 */
export interface ToolDefinition {
  /** Unique tool name */
  name: string;
  /** Human-readable description (shown to the LLM) */
  description: string;
  /** JSON Schema for the tool's input parameters */
  inputSchema: JsonSchema;
  /** Category for grouping tools (e.g., "database", "filesystem") */
  category?: string;
  /** Optional annotations providing hints about the tool's behavior */
  annotations?: {
    /** Hint that the tool is read-only and doesn't modify state */
    readOnlyHint?: boolean;
    /** Hint that the tool is destructive and modifies state significantly */
    destructiveHint?: boolean;
    /** Hint that the tool interacts with external entities */
    openWorldHint?: boolean;
  };
  /** Experimental metadata */
  experimental?: Record<string, unknown>;
}

/**
 * Parameters for the "tools/list" method.
 * @changelog No changes.
 */
export interface ListToolsParams {
  /** Optional cursor for pagination */
  cursor?: string;
}

/**
 * Result of the "tools/list" method.
 * @changelog No changes.
 */
export interface ListToolsResult {
  /** Available tools */
  tools: ToolDefinition[];
  /** Next page cursor (if more results exist) */
  nextCursor?: string;
}

/**
 * Parameters for the "tools/call" method.
 * @changelog Added `timeout` for long-running tools. Added `_meta` for progress.
 */
export interface CallToolParams {
  /** Name of the tool to invoke */
  name: string;
  /** Tool input arguments (must match inputSchema) */
  arguments?: Record<string, unknown>;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** MCP request metadata */
  _meta?: RequestMeta;
}

/**
 * Result of a successful tool invocation.
 * @changelog Added `meta` field for execution metadata (e.g., duration).
 */
export interface CallToolResult {
  /** List of content blocks returned by the tool */
  content: ToolContent[];
  /** Whether the tool execution encountered an error */
  isError?: boolean;
  /** Optional metadata about the execution */
  meta?: {
    /** Execution time in milliseconds */
    durationMs?: number;
    /** Token usage for the tool call */
    tokensUsed?: number;
  };
}

/**
 * Individual content block within a tool result.
 * Refactored to a strict discriminated union for improved type safety.
 * @changelog Refactored from a single loose interface to a discriminated union.
 */
export type ToolContent = TextContent | ImageContent | EmbeddedResource;

/**
 * Text content block.
 * @changelog No changes.
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content block.
 * @changelog No changes.
 */
export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

/**
 * Embedded resource content block.
 * @changelog No changes.
 */
export interface EmbeddedResource {
  type: 'resource';
  resource: ResourceContent;
}

// ─── Resources ────────────────────────────────────────────────────────────────

/**
 * Resource definition exposed by the MCP server.
 * @changelog Added `annotations` for metadata like `audience` or `priority`. Added `size`.
 */
export interface ResourceDefinition {
  /** URI of the resource (e.g., "file:///path/to/file") */
  uri: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** MIME type of the resource content */
  mimeType?: string;
  /** Optional annotations */
  annotations?: {
    /** Who this resource is intended for */
    audience?: ('user' | 'assistant')[];
    /** Priority hint (0-1) */
    priority?: number;
  };
  /** The size of the raw resource content, in bytes */
  size?: number;
}

/**
 * Parameters for the "resources/list" method.
 * @changelog No changes.
 */
export interface ListResourcesParams {
  cursor?: string;
}

/**
 * Result of the "resources/list" method.
 * @changelog No changes.
 */
export interface ListResourcesResult {
  resources: ResourceDefinition[];
  nextCursor?: string;
}

/**
 * Parameters for the "resources/read" method.
 * @changelog Added `_meta` for progress.
 */
export interface ReadResourceParams {
  /** URI of the resource to read */
  uri: string;
  /** MCP request metadata */
  _meta?: RequestMeta;
}

/**
 * Result of the "resources/read" method.
 * @changelog No changes.
 */
export interface ReadResourceResult {
  contents: ResourceContent[];
}

/**
 * Individual resource content block.
 * @changelog No changes.
 */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: Blob | string;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

/**
 * Prompt argument definition.
 * @changelog No changes.
 */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Whether this argument is required */
  required?: boolean;
}

/**
 * Prompt definition exposed by the MCP server.
 * @changelog Added `annotations`.
 */
export interface PromptDefinition {
  /** Unique prompt name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Arguments the prompt accepts */
  arguments?: PromptArgument[];
  /** Optional annotations */
  annotations?: {
    /** Who this prompt is intended for */
    audience?: ('user' | 'assistant')[];
    /** Priority hint (0-1) */
    priority?: number;
  };
}

/**
 * Parameters for the "prompts/list" method.
 * @changelog No changes.
 */
export interface ListPromptsParams {
  cursor?: string;
}

/**
 * Result of the "prompts/list" method.
 * @changelog No changes.
 */
export interface ListPromptsResult {
  prompts: PromptDefinition[];
  nextCursor?: string;
}

/**
 * Parameters for the "prompts/get" method.
 * @changelog Added `_meta` for progress.
 */
export interface GetPromptParams {
  /** Name of the prompt to retrieve */
  name: string;
  /** Argument values to substitute into the prompt template */
  arguments?: Record<string, string>;
  /** MCP request metadata */
  _meta?: RequestMeta;
}

/**
 * Result of the "prompts/get" method.
 * @changelog No changes.
 */
export interface GetPromptResult {
  /** Description of the prompt */
  description?: string;
  /** Messages that make up the prompt */
  messages: PromptMessage[];
}

/**
 * Individual message in a prompt.
 * @changelog No changes.
 */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: TextContent | ImageContent | EmbeddedResource;
}

// ─── Completions ──────────────────────────────────────────────────────────────

/**
 * Reference to a prompt.
 * @changelog Initial implementation.
 */
export interface PromptReference {
  type: 'ref/prompt';
  name: string;
}

/**
 * Reference to a resource.
 * @changelog Initial implementation.
 */
export interface ResourceReference {
  type: 'ref/resource';
  uri: string;
}

/**
 * Parameters for the "completion/complete" method.
 * @changelog Initial implementation.
 */
export interface CompleteParams {
  /** The reference to the prompt or resource */
  ref: PromptReference | ResourceReference;
  /** The argument name and current value to complete */
  argument: {
    name: string;
    value: string;
  };
}

/**
 * Result of the "completion/complete" method.
 * @changelog Initial implementation.
 */
export interface CompleteResult {
  /** The completion details */
  completion: {
    /** Array of completion values */
    values: string[];
    /** Total number of possible values (if known) */
    total?: number;
    /** Whether there are more values available */
    hasMore?: boolean;
  };
}

// ─── Sampling ─────────────────────────────────────────────────────────────────

/**
 * Message for sampling requests.
 * @changelog Initial implementation.
 */
export interface SamplingMessage {
  role: 'user' | 'assistant';
  content: TextContent | ImageContent;
}

/**
 * Hints for model selection.
 * @changelog Initial implementation.
 */
export interface ModelHint {
  /** Name of the model preference */
  name?: string;
}

/**
 * Preferences for model selection.
 * @changelog Initial implementation.
 */
export interface ModelPreferences {
  /** Hints for model selection */
  hints?: ModelHint[];
  /** Priority for cost (0-1) */
  costPriority?: number;
  /** Priority for speed (0-1) */
  speedPriority?: number;
  /** Priority for intelligence (0-1) */
  intelligencePriority?: number;
}

/**
 * Parameters for "sampling/createMessage" method.
 * @changelog Initial implementation.
 */
export interface CreateMessageParams {
  messages: SamplingMessage[];
  modelPreferences?: ModelPreferences;
  systemPrompt?: string;
  includeContext?: 'none' | 'thisServer' | 'allServers';
  temperature?: number;
  maxTokens: number;
  stopSequences?: string[];
  _meta?: RequestMeta;
}

/**
 * Result of "sampling/createMessage" method.
 * @changelog Initial implementation.
 */
export interface CreateMessageResult {
  role: 'assistant';
  model: string;
  content: TextContent;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
}

// ─── Roots ────────────────────────────────────────────────────────────────────

/**
 * Root directory definition.
 * @changelog Initial implementation.
 */
export interface Root {
  /** URI of the root directory */
  uri: string;
  /** Optional name */
  name?: string;
}

/**
 * Result of the "roots/list" method.
 * @changelog Initial implementation.
 */
export interface ListRootsResult {
  roots: Root[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * Log level for notifications.
 * @changelog No changes.
 */
export type LoggingLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/**
 * Parameters for the "notifications/message" notification.
 * @changelog Added `timestamp` for better event tracking.
 */
export interface NotificationParams {
  level: LoggingLevel;
  logger?: string;
  data?: unknown;
  /** ISO 8601 timestamp of the event */
  timestamp?: string;
}

/**
 * Parameters for the "notifications/cancelled" notification.
 * @changelog Initial implementation.
 */
export interface CancelledNotificationParams {
  /** The ID of the request to cancel */
  requestId: string | number;
  /** Optional reason for cancellation */
  reason?: string;
}

/**
 * Parameters for the "notifications/resources/updated" notification.
 * @changelog Initial implementation.
 */
export interface ResourceUpdatedNotificationParams {
  /** URI of the resource that was updated */
  uri: string;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/**
 * Progress token for tracking long-running operations.
 * @changelog No changes.
 */
export type ProgressToken = string | number;

/**
 * Progress notification parameters.
 * @changelog Added `message` for status updates and `cancellable` flag.
 */
export interface ProgressParams {
  /** Operation progress token */
  progressToken: ProgressToken;
  /** Current progress value */
  progress: number;
  /** Total progress value (if known) */
  total?: number;
  /** Human-readable status message */
  message?: string;
  /** Whether the operation can be cancelled */
  cancellable?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP Method Names (enum for type safety)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enumeration of all supported MCP methods.
 * @changelog Added `CANCELLED`, `RESOURCES_UPDATED`, `COMPLETIONS_COMPLETE`, `SAMPLING_CREATE_MESSAGE`, `ROOTS_LIST`.
 */
export const McpMethods = {
  // Lifecycle
  INITIALIZE: 'initialize',
  NOTIFICATION_INITIALIZED: 'notifications/initialized',

  // Ping
  PING: 'ping',

  // Cancellation
  NOTIFICATION_CANCELLED: 'notifications/cancelled',

  // Tools
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  TOOLS_CANCEL: 'tools/cancel',

  // Resources
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  RESOURCES_SUBSCRIBE: 'resources/subscribe',
  RESOURCES_UNSUBSCRIBE: 'resources/unsubscribe',
  RESOURCES_UPDATED: 'notifications/resources/updated',

  // Prompts
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',

  // Completions
  COMPLETIONS_COMPLETE: 'completion/complete',

  // Logging
  LOGGING_SET_LEVEL: 'logging/setLevel',

  // Sampling
  SAMPLING_CREATE_MESSAGE: 'sampling/createMessage',

  // Roots
  ROOTS_LIST: 'roots/list',

  // Progress
  PROGRESS: 'notifications/progress',
} as const;

export type McpMethodName = (typeof McpMethods)[keyof typeof McpMethods];

// ═══════════════════════════════════════════════════════════════════════════════
// LLM-Specific Types (for agent loop)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chat message role.
 * @changelog No changes.
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Single chat message.
 * Refactored to a discriminated union to strictly enforce the shape of messages
 * based on their role (e.g., `tool_call_id` is only valid on `tool` messages).
 * @changelog Refactored to a discriminated union for strict type safety. Added `context`.
 */
export type ChatMessage =
  | {
  role: 'system';
  content: string;
  context?: Record<string, unknown>;
}
  | {
  role: 'user';
  content: string;
  context?: Record<string, unknown>;
}
  | {
  role: 'assistant';
  content: string;
  /** Tool calls requested by the assistant */
  tool_calls?: ToolCall[];
  context?: Record<string, unknown>;
}
  | {
  role: 'tool';
  content: string;
  /** Tool call ID this message responds to */
  tool_call_id: string;
  /** Name of the tool */
  name?: string;
  context?: Record<string, unknown>;
};

/**
 * Tool call requested by the LLM.
 * @changelog No changes.
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Type of tool call (always "function" for MCP) */
  type: 'function';
  /** The function to call */
  function: {
    /** Name of the tool */
    name: string;
    /** Arguments as a JSON string */
    arguments: string;
  };
}

/**
 * LLM provider completion response.
 * @changelog Added `reasoning_content` for chain-of-thought models and `safety_ratings`.
 */
export interface LLMCompletionResponse {
  /** The generated message content */
  content: string;
  /** Tool calls requested by the model */
  tool_calls?: ToolCall[];
  /** Total tokens used in the request */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** The model that was used */
  model: string;
  /** Whether the generation was truncated */
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | string;
  /** Optional reasoning content (for CoT models) */
  reasoning_content?: string;
  /** Safety ratings for the response */
  safety_ratings?: {
    category: string;
    probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
  }[];
}

/**
 * Runtime definition of an MCP tool including its handler.
 * @changelog Added `category`, `annotations`, and `experimental` fields. Improved documentation.
 */
export interface MCPTool {
  /**
   * The unique name of the tool.
   *
   * @example
   * "search_database"
   */
  name: string;
  /**
   * A human-readable description of what the tool does.
   * This is typically shown to the LLM to help it decide when to use the tool.
   *
   * @example
   * "Searches the PostgreSQL database for records matching the query."
   */
  description: string;
  /**
   * The category the tool belongs to (e.g., "database", "file_system", "api").
   *
   * @example
   * "database"
   */
  category: string;
  /**
   * JSON Schema definition for the input arguments the tool accepts.
   *
   * @example
   * ```json
   * {
   *   "type": "object",
   *   "properties": {
   *     "query": { "type": "string", "description": "The SQL query." }
   *   },
   *   "required": ["query"]
   * }
   * ```
   */
  inputSchema: JsonSchema;
  /**
   * Optional annotations providing hints about the tool's behavior.
   * @changelog Initial implementation.
   */
  annotations?: {
    /** Hint that the tool is read-only */
    readOnlyHint?: boolean;
    /** Hint that the tool is destructive */
    destructiveHint?: boolean;
    /** Hint that the tool interacts with external entities */
    openWorldHint?: boolean;
  };

  /**
   * The async function that executes the tool logic.
   *
   * @param args - The arguments passed to the tool, matching the `inputSchema`.
   * @returns A promise resolving to the tool's execution result.
   *
   * @example
   * ```typescript
   * async handler(args) {
   *   const result = await db.query(args.query);
   *   return {
   *     content: [{ type: 'text', text: JSON.stringify(result) }]
   *   };
   * }
   * ```
   */
  handler(args: Record<string, unknown>): Promise<CallToolResult>;

  /**
   * Optional experimental metadata.
   */
  experimental?: Record<string, unknown>;
}
