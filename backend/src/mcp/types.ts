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
 */

// ═══════════════════════════════════════════════════════════════════════════════
// JSON-RPC 2.0 Base Types
// ═══════════════════════════════════════════════════════════════════════════════

/** JSON-RPC 2.0 request envelope */
export interface JsonRpcRequest {
  /** JSON-RPC version, always "2.0" */
  jsonrpc: '2.0';
  /** Request identifier (string, number, or null) */
  id: string | number | null;
  /** Method name to invoke */
  method: string;
  /** Method parameters (positional args or named params) */
  params?: Record<string, unknown> | unknown[];
}

/** JSON-RPC 2.0 success response */
export interface JsonRpcSuccessResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result: T;
}

/** JSON-RPC 2.0 error response */
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: JsonRpcError;
}

/** JSON-RPC 2.0 error object */
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

// ─── Predefined JSON-RPC Error Codes ──────────────────────────────────────────

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
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MCP Protocol Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Initialization ───────────────────────────────────────────────────────────

/** Client capabilities advertised during initialization */
export interface ClientCapabilities {
  /** Client supports listing/reading resources */
  resources?: { subscribe?: boolean; listChanged?: boolean };
  /** Client supports listing/invoking tools */
  tools?: { listChanged?: boolean };
  /** Client supports listing/getting prompts */
  prompts?: { listChanged?: boolean };
}

/** Server capabilities advertised during initialization */
export interface ServerCapabilities {
  resources?: { subscribe?: boolean; listChanged?: boolean };
  tools?: { listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  /** Server supports logging */
  logging?: Record<string, unknown>;
}

/** Parameters for the "initialize" method */
export interface InitializeParams {
  /** Protocol version the client supports */
  protocolVersion: string;
  /** Client capabilities */
  capabilities: ClientCapabilities;
  /** Client implementation info */
  clientInfo: Implementation;
}

/** Result of the "initialize" method */
export interface InitializeResult {
  /** Protocol version the server supports */
  protocolVersion: string;
  /** Server capabilities */
  capabilities: ServerCapabilities;
  /** Server implementation info */
  serverInfo: Implementation;
  /** Optional instructions for the client */
  instructions?: string;
}

/** Implementation metadata (client or server) */
export interface Implementation {
  name: string;
  version: string;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

/** JSON Schema type definition (simplified) */
export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  default?: unknown;
  [key: string]: unknown;
};

/** Tool definition exposed by the MCP server */
export interface ToolDefinition {
  /** Unique tool name */
  name: string;
  /** Human-readable description (shown to the LLM) */
  description: string;
  /** JSON Schema for the tool's input parameters */
  inputSchema: JsonSchema;
}

/** Parameters for the "tools/list" method */
export interface ListToolsParams {
  /** Optional cursor for pagination */
  cursor?: string;
}

/** Result of the "tools/list" method */
export interface ListToolsResult {
  /** Available tools */
  tools: ToolDefinition[];
  /** Next page cursor (if more results exist) */
  nextCursor?: string;
}

/** Parameters for the "tools/call" method */
export interface CallToolParams {
  /** Name of the tool to invoke */
  name: string;
  /** Tool input arguments (must match inputSchema) */
  arguments?: Record<string, unknown>;
}

/** Result of a successful tool invocation */
export interface CallToolResult {
  /** List of content blocks returned by the tool */
  content: ToolContent[];
  /** Whether the tool execution encountered an error */
  isError?: boolean;
}

/** Individual content block within a tool result */
export interface ToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    name?: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

// ─── Resources ────────────────────────────────────────────────────────────────

/** Resource definition exposed by the MCP server */
export interface ResourceDefinition {
  /** URI of the resource (e.g., "file:///path/to/file") */
  uri: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** MIME type of the resource content */
  mimeType?: string;
}

/** Parameters for the "resources/list" method */
export interface ListResourcesParams {
  cursor?: string;
}

/** Result of the "resources/list" method */
export interface ListResourcesResult {
  resources: ResourceDefinition[];
  nextCursor?: string;
}

/** Parameters for the "resources/read" method */
export interface ReadResourceParams {
  /** URI of the resource to read */
  uri: string;
}

/** Result of the "resources/read" method */
export interface ReadResourceResult {
  contents: ResourceContent[];
}

/** Individual resource content block */
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

/** Prompt argument definition */
export interface PromptArgument {
  /** Argument name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Whether this argument is required */
  required?: boolean;
}

/** Prompt definition exposed by the MCP server */
export interface PromptDefinition {
  /** Unique prompt name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Arguments the prompt accepts */
  arguments?: PromptArgument[];
}

/** Parameters for the "prompts/list" method */
export interface ListPromptsParams {
  cursor?: string;
}

/** Result of the "prompts/list" method */
export interface ListPromptsResult {
  prompts: PromptDefinition[];
  nextCursor?: string;
}

/** Parameters for the "prompts/get" method */
export interface GetPromptParams {
  /** Name of the prompt to retrieve */
  name: string;
  /** Argument values to substitute into the prompt template */
  arguments?: Record<string, string>;
}

/** Result of the "prompts/get" method */
export interface GetPromptResult {
  /** Description of the prompt */
  description?: string;
  /** Messages that make up the prompt */
  messages: PromptMessage[];
}

/** Individual message in a prompt */
export interface PromptMessage {
  role: 'user' | 'assistant';
  content: TextContent | ImageContent | EmbeddedResource;
}

/** Text content block */
export interface TextContent {
  type: 'text';
  text: string;
}

/** Image content block */
export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

/** Embedded resource content block */
export interface EmbeddedResource {
  type: 'resource';
  resource: ResourceContent;
}

// ─── Notifications ────────────────────────────────────────────────────────────

/** Log level for notifications */
export type LoggingLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

/** Parameters for the "notifications/message" notification */
export interface NotificationParams {
  level: LoggingLevel;
  logger?: string;
  data?: unknown;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

/** Progress token for tracking long-running operations */
export type ProgressToken = string | number;

/** Progress notification parameters */
export interface ProgressParams {
  /** Operation progress token */
  progressToken: ProgressToken;
  /** Current progress value */
  progress: number;
  /** Total progress value (if known) */
  total?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MCP Method Names (enum for type safety)
// ═══════════════════════════════════════════════════════════════════════════════

export const McpMethods = {
  // Lifecycle
  INITIALIZE: 'initialize',
  INITIALIZED: 'notifications/initialized',

  // Ping
  PING: 'ping',

  // Tools
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',

  // Resources
  RESOURCES_LIST: 'resources/list',
  RESOURCES_READ: 'resources/read',
  RESOURCES_SUBSCRIBE: 'resources/subscribe',
  RESOURCES_UNSUBSCRIBE: 'resources/unsubscribe',

  // Prompts
  PROMPTS_LIST: 'prompts/list',
  PROMPTS_GET: 'prompts/get',

  // Logging
  LOGGING_SET_LEVEL: 'logging/setLevel',

  // Progress
  PROGRESS: 'notifications/progress',
} as const;

export type McpMethodName = (typeof McpMethods)[keyof typeof McpMethods];

// ═══════════════════════════════════════════════════════════════════════════════
// LLM-Specific Types (for agent loop)
// ═══════════════════════════════════════════════════════════════════════════════

/** Chat message role */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/** Single chat message */
export interface ChatMessage {
  /** The user role */
  role: ChatRole;
  content: string;
  /** Tool calls requested by the assistant (only for role='assistant') */
  tool_calls?: ToolCall[];
  /** Tool call ID this message responds to (only for role='tool') */
  tool_call_id?: string;
  /** Name of the tool (only for role='tool') */
  name?: string;
}

/** Tool call requested by the LLM */
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

/** LLM provider completion response */
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
}

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
}
