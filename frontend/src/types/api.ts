/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module types/api
 * @description Type definitions for MCP Server API endpoints and data structures.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  /** Response status indicator */
  status?: string;
  /** ISO timestamp of the response */
  timestamp?: string;
  /** Response payload */
  data?: T;
  /** Error message if any */
  error?: string;
  /** Human-readable message */
  message?: string;
}

// ============================================================================
// Health & Info Endpoints
// ============================================================================

export interface HealthResponse {
  /** Health status */
  status: 'ok';
  /** ISO timestamp */
  timestamp: string;
  /** Server uptime in seconds */
  uptime: number;
  /** Memory usage information */
  memory: {
    /** Used heap memory in bytes */
    heapUsed: number;
    /** Total heap memory in bytes */
    heapTotal: number;
  };
}

/** Represents a single health check result (e.g., database, provider:name) */
export interface HealthCheckResult {
  /** Check status */
  status: 'ok' | 'error';
  /** Latency in milliseconds */
  latencyMs?: number;
  /** Error message if failed */
  error?: string;
}

/** Map of health check results */
export interface HealthChecks {
  /** Database check result */
  database: HealthCheckResult;
  /** Provider-specific checks (e.g., provider:openai) */
  [key: `provider:${string}`]: HealthCheckResult;
}

export interface HealthReadyResponse {
  /** Readiness status */
  status: 'ready' | 'degraded';
  /** ISO timestamp */
  timestamp: string;
  /** Map of health checks */
  checks: HealthChecks;
}

/** MCP server health response from /mcp/health */
export interface McpHealthResponse {
  /** Health status */
  status: string;
  /** ISO timestamp */
  timestamp: string;
}

export interface ServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Protocol version */
  protocol: string;
  /** Node.js runtime version */
  node: string;
}

export interface ProviderInfo {
  /** List of available providers */
  available: string[];
  /** Default provider name */
  default: string;
}

export interface ToolInfo {
  /** Total number of tools */
  total: number;
  /** Number of enabled tools */
  enabled: number;
  /** Tools grouped by category */
  categories: Record<string, string[]>;
}

export interface InfoResponse {
  /** Server information */
  server: ServerInfo;
  /** Provider information */
  providers: ProviderInfo;
  /** Tool information */
  tools: ToolInfo;
  /** Number of resources */
  resources: number;
  /** Number of prompts */
  prompts: number;
  /** Server uptime in seconds */
  uptime: number;
  /** Runtime environment (e.g., production, development) */
  env: string;
}

// ============================================================================
// MCP Protocol Types (JSON-RPC 2.0)
// ============================================================================

export interface JsonRpcRequest {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  /** Request identifier */
  id: number | string;
  /** Method name to invoke */
  method: string;
  /** Method parameters */
  params?: unknown;
}

export interface JsonRpcResponse {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  /** Request identifier */
  id: number | string;
  /** Result payload */
  result?: unknown;
  /** Error details if any */
  error?: {
    /** Error code */
    code: number;
    /** Error message */
    message: string;
    /** Additional error data */
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  /** JSON-RPC version */
  jsonrpc: '2.0';
  /** Notification method name */
  method: string;
  /** Notification parameters */
  params?: unknown;
}

// MCP Tool Definition
export interface ToolDefinition {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Input JSON schema */
  inputSchema?: {
    /** Schema type */
    type: string;
    /** Schema properties */
    properties?: Record<string, {
      /** Property type */
      type: string;
      /** Property description */
      description?: string;
      /** Enum values */
      enum?: string[];
    }>;
    /** Required properties */
    required?: string[];
  };
  annotations: Record<string, any>;
}

// MCP Call Tool Result
export interface CallToolResult {
  /** Result content items */
  content: Array<{
    /** Content type */
    type: 'text' | 'image' | 'resource';
    /** Text content */
    text?: string;
    /** Base64 data */
    data?: string;
    /** MIME type */
    mimeType?: string;
    /** Resource URI */
    uri?: string;
    resource: Record<string, any>;
  }>;
  /** Error flag */
  isError?: boolean;
}

// MCP Tools List Response
export interface ToolsListResponse {
  /** List of tool definitions */
  tools: ToolDefinition[];
}

// MCP Tools Call Request
export interface ToolsCallRequest {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
}

// ============================================================================
// Chat API Types
// ============================================================================

export interface ChatMessage {
  /** Unique message identifier */
  id?: string;
  /** Message role */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Message content */
  content: string;
  /** Tool name if applicable (for tool role messages) */
  toolName?: string;
  /** Message timestamp */
  timestamp?: number;
}

export interface ChatRequest {
  /** Chat messages history */
  messages?: ChatMessage[];
  /** Single message input */
  message?: string;
  /** Conversation ID */
  conversationId?: string;
  /** Provider name */
  provider?: string;
  /** Model name */
  model?: string;
  /** Sampling temperature */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Max tool iterations */
  maxIterations?: number;
}

export interface ToolCall {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
  /** Tool result */
  result: string;
}

export interface TokenUsage {
  /** Prompt token count */
  prompt: number;
  /** Completion token count */
  completion: number;
  /** Total token count */
  total: number;
}

export interface ChatResponse {
  /** Conversation ID */
  conversationId: string;
  /** Response content */
  content: string;
  /** Number of iterations */
  iterations: number;
  /** Tool calls made */
  toolCalls: ToolCall[];
  /** Token usage stats */
  tokens: TokenUsage;
  /** Elapsed time in ms */
  elapsedMs: number;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationMessage {
  /** Message role */
  role: string;
  /** Message content */
  content: string;
  /** Tool name if applicable */
  toolName?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Number of tokens count */
  tokenCount?: number;
}

export interface Conversation {
  /** Conversation ID */
  id: string;
  /** Conversation title */
  title: string;
  /** Model used */
  model: string;
  /** Last message preview */
  lastMessage?: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Created timestamp */
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  /** Conversation messages */
  messages: ConversationMessage[];
}

export interface ConversationsListResponse {
  /** Total number of conversations */
  total: number;
  /** List of conversations */
  conversations: Conversation[];
}

export interface ConversationDeleteResponse {
  /** Response status */
  status: string;
  /** Deleted conversation ID */
  id: string;
}

// ============================================================================
// Admin API - Providers
// ============================================================================

export interface Provider {
  /** Provider ID */
  id: string;
  /** Provider name */
  name: string;
  /** Provider type */
  type: 'ollama' | 'openai';
  /** Base URL */
  baseUrl: string;
  /** Default model */
  defaultModel: string;
  /** API key */
  apiKey?: string;
  /** Default flag */
  isDefault: boolean;
  /** Temperature setting */
  temperature?: number;
  /** Max tokens setting */
  maxTokens?: number;
}

// @ts-expect-error known issue
export interface ProviderWithId extends Provider {
  /** Numeric ID */
  id: number;
  /** Settings JSON */
  settings?: string;
}

export interface ProvidersResponse {
  /** Active providers */
  active: Array<Provider & { id?: number }>;
  /** Configured providers */
  configured: ProviderWithId[];
  /** Default provider name */
  default: string;
}

export interface CreateProviderRequest {
  /** Provider name */
  name: string;
  /** Provider type */
  type: 'ollama' | 'openai';
  /** Base URL */
  baseUrl: string;
  /** API key */
  apiKey?: string;
  /** Default model */
  defaultModel: string;
  /** Default flag */
  isDefault?: boolean;
  /** Temperature setting */
  temperature?: number;
  /** Max tokens setting */
  maxTokens?: number;
}

export interface ProviderResponse {
  /** Response status */
  status: string;
  /** Provider details */
  provider: ProviderWithId;
}

export interface ProviderRemoveResponse {
  /** Response status */
  status: string;
  /** Removed provider name */
  provider: string;
}

export interface ProviderDefaultResponse {
  /** Response status */
  status: string;
  /** Default provider name */
  provider: string;
}

export interface Model {
  /** Model ID */
  id: string;
  /** Model name */
  name?: string;
}

export interface ModelsListResponse {
  /** Provider name */
  provider: string;
  /** Available models */
  models: Model[];
}

// ============================================================================
// Admin API - Tools
// ============================================================================

export interface RegisteredTool extends ToolDefinition {
  /** Enabled flag */
  enabled: boolean;
  /** Tool category */
  category?: string;
}

export interface ToolSummary {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Enabled flag */
  enabled: boolean;
  /** Tool category */
  category?: string;
  /** Has input schema flag */
  hasInputSchema: boolean;
}

export interface ToolsResponse {
  /** Total tools count */
  total: number;
  /** Enabled tools count */
  enabled: number;
  /** Tools by category */
  categories: Record<string, string[]>;
  /** Tool summaries */
  tools: ToolSummary[];
}

export interface ToolDetailResponse {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Enabled flag */
  enabled: boolean;
  /** Tool category */
  category?: string;
  /** Input schema */
  inputSchema?: ToolDefinition['inputSchema'];
}

export interface UpdateToolRequest {
  /** Enabled flag */
  enabled: boolean;
}

export interface UpdateToolResponse {
  /** Response status */
  status: string;
  /** Tool name */
  tool: string;
  /** Enabled flag */
  enabled: boolean;
}

// ====== Provider Test Connection ======

export interface ProviderTestResponse {
  /** Provider name */
  provider: string;
  /** Connection status */
  status: 'ok' | 'error';
  /** Connection latency in milliseconds (only on success) */
  latencyMs?: number;
  /** Error message (only on failure) */
  error?: string;
  /** Detailed error message (only on failure) */
  message?: string;
}

// ====== Batch Tool Update ======

export interface BatchToolUpdateRequest {
  /** List of tool names to update */
  names: string[];
  /** Whether to enable or disable the tools */
  enabled: boolean;
}

export interface BatchToolUpdateResponse {
  /** Response status */
  status: string;
  /** List of tools that were successfully updated */
  updated: string[];
  /** List of tools that were not found */
  notFound: string[];
  /** The enabled state that was applied */
  enabled: boolean;
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type SSEEventType = 'tool_call' | 'result' | 'done' | 'error';

export interface ToolCallEvent {
  /** Iteration number */
  iteration: number;
  /** Tool calls made */
  tools: Array<{
    /** Tool name */
    name: string;
    /** Success flag */
    success: boolean;
  }>;
}

export interface ResultEvent {
  /** Result content */
  content: string;
  /** Number of iterations */
  iterations: number;
  /** Number of tool calls */
  toolCalls: number;
  /** Token usage */
  tokens: TokenUsage;
}

export interface ErrorEvent {
  /** Error message */
  error: string;
}

export type SSEEvent =
  | { type: 'tool_call'; data: ToolCallEvent }
  | { type: 'result'; data: ResultEvent }
  | { type: 'done'; data: object }
  | { type: 'error'; data: ErrorEvent };

// ============================================================================
// API Configuration
// ============================================================================

export interface ApiConfig {
  /** Base API URL */
  baseUrl: string;
  /** Request timeout in ms */
  timeout?: number;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  /** Default base URL */
  baseUrl: 'http://localhost:3100',
  /** Default timeout */
  timeout: 30000,
};

// ============================
// Metrics API Types
// ============================

export interface RequestMetric {
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method: string;
  /** Duration in ms */
  durationMs: number;
  /** HTTP status code */
  statusCode: number;
  /** Request size in bytes */
  requestSize?: number;
  /** Response size in bytes */
  responseSize?: number;
  /** ISO timestamp */
  timestamp: string;
}

export interface ToolMetric {
  /** Tool name */
  toolName: string;
  /** Duration in ms */
  durationMs: number;
  /** Success flag */
  success: boolean;
  /** Error message */
  error?: string;
  /** Input parameter keys */
  inputKeys?: string[];
  /** ISO timestamp */
  timestamp: string;
}

export interface TokenMetric {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Input token count */
  inputTokens: number;
  /** Output token count */
  outputTokens: number;
  /** Total token count */
  totalTokens: number;
  /** Cost estimate */
  costEstimate?: number;
  /** ISO timestamp */
  timestamp: string;
}

export interface ProviderMetric {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Latency in ms */
  latencyMs: number;
  /** Provider status */
  status: 'ok' | 'degraded' | 'error';
  /** ISO timestamp */
  timestamp: string;
}

export interface ErrorMetric {
  /** Error type */
  type: string;
  /** Error message */
  message: string;
  /** ISO timestamp */
  timestamp: string;
  /** Error context */
  context?: Record<string, unknown>;
}

export interface SystemMetric {
  /** Memory used in MB */
  memoryUsedMb: number;
  /** Total memory in MB */
  memoryTotalMb: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Event loop lag in ms */
  eventLoopLagMs: number;
  /** Active handles count */
  activeHandles?: number;
  /** ISO timestamp */
  timestamp: string;
}

export interface MetricsSummary {
  /** Time period */
  period: {
    /** Start timestamp */
    start: string;
    /** End timestamp */
    end: string;
  };
  /** Request metrics */
  requests: {
    /** Total requests */
    total: number;
    /** Average latency */
    avgLatencyMs: number;
    /** P50 latency */
    p50LatencyMs: number;
    /** P95 latency */
    p95LatencyMs: number;
    /** P99 latency */
    p99LatencyMs: number;
    /** By endpoint */
    byEndpoint: Record<string, number>;
    /** By status code */
    byStatusCode: Record<string, number>;
  };
  /** Tool metrics */
  tools: {
    /** Total calls */
    totalCalls: number;
    /** Success rate */
    successRate: number;
    /** Average duration */
    avgDurationMs: number;
    /** By tool */
    byTool: Record<string, {
      /** Call count */
      calls: number;
      /** Average duration */
      avgDurationMs: number;
      /** Success rate */
      successRate: number;
    }>;
  };
  /** Token metrics */
  tokens: {
    /** Total input tokens */
    totalInput: number;
    /** Total output tokens */
    totalOutput: number;
    /** Total cost estimate */
    totalCostEstimate: number;
    /** By provider */
    byProvider: Record<string, {
      /** Input tokens */
      inputTokens: number;
      /** Output tokens */
      outputTokens: number;
      /** Total tokens */
      totalTokens: number;
      /** Request count */
      requests: number;
    }>;
  };
  /** Error metrics */
  errors: {
    /** Total errors */
    total: number;
    /** By type */
    byType: Record<string, number>;
    /** Recent errors */
    recent: ErrorMetric[];
  };
  /** Provider metrics */
  providers: {
    /** By provider */
    byProvider: Record<string, {
      /** Average latency */
      avgLatencyMs: number;
      /** Request count */
      requestCount: number;
      /** Success rate */
      successRate: number;
      /** Last status */
      lastStatus: 'ok' | 'degraded' | 'error';
    }>;
  };
}

export interface MetricsResponse {
  /** Time period */
  period: {
    /** Duration in hours */
    hours: number;
    /** Start timestamp */
    start: string;
    /** End timestamp */
    end: string;
  };
  /** Metrics summary */
  summary: MetricsSummary;
}

export interface SystemMetricsResponse {
  /** System metrics */
  system: SystemMetric;
  /** Platform info */
  platform: {
    /** Node version */
    nodeVersion: string;
    /** OS platform */
    platform: string;
    /** OS architecture */
    arch: string;
    /** Process ID */
    pid: number;
    /** Uptime in seconds */
    uptime: number;
  };
  /** Recent history */
  recentHistory: SystemMetric[];
}

// ============================
// Simulation API Types
// ============================

export interface MockResponse {
  /** Mock content */
  content: Array<{ type: 'text'; text: string }>;
  /** Error flag */
  isError?: boolean;
  /** Delay in ms */
  delayMs?: number;
  /** Failure rate */
  failureRate?: number;
}

export interface ScenarioStep {
  /** Step name */
  name: string;
  /** Tool to call */
  tool: string;
  /** Tool arguments */
  args?: Record<string, unknown>;
  /** Expected results */
  expects?: {
    /** Contains string */
    contains?: string;
    /** Does not contain string */
    notContains?: string;
    /** Has error flag */
    hasError?: boolean;
    /** Max duration */
    maxDurationMs?: number;
  };
  /** Step description */
  description?: string;
}

export interface Scenario {
  /** Scenario name */
  name: string;
  /** Scenario description */
  description: string;
  /** Scenario steps */
  steps: ScenarioStep[];
  /** Mock setup */
  setupMocks?: Record<string, MockResponse>;
  /** Cleanup mocks flag */
  cleanupMocks?: boolean;
}

export interface StepResult {
  /** Step name */
  name: string;
  /** Passed flag */
  passed: boolean;
  /** Duration in ms */
  durationMs: number;
  /** Response data */
  response?: CallToolResult;
  /** Error message */
  error?: string;
}

export interface ScenarioResult {
  /** Scenario name */
  name: string;
  /** Passed flag */
  passed: boolean;
  /** Duration in ms */
  durationMs: number;
  /** Step results */
  steps: StepResult[];
  /** Error messages */
  errors: string[];
  /** ISO timestamp */
  timestamp: string;
}

export interface LoadConfig {
  /** Tools to test */
  tools: string[];
  /** Argument templates */
  argsTemplates?: Record<string, Record<string, unknown>[]>;
  /** Concurrent users */
  concurrentUsers: number;
  /** Test duration in ms */
  durationMs: number;
  /** Requests per second */
  requestsPerSecond?: number;
  /** Record metrics flag */
  recordMetrics?: boolean;
  /** Use mocks flag */
  useMocks?: boolean;
}

export interface LoadResults {
  /** Total requests */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average latency */
  avgLatencyMs: number;
  /** Minimum latency */
  minLatencyMs: number;
  /** Maximum latency */
  maxLatencyMs: number;
  /** P50 latency */
  p50LatencyMs: number;
  /** P95 latency */
  p95LatencyMs: number;
  /** P99 latency */
  p99LatencyMs: number;
  /** Requests per second */
  rps: number;
  /** Results by tool */
  byTool: Record<string, {
    /** Request count */
    count: number;
    /** Average latency */
    avgLatencyMs: number;
    /** Error count */
    errors: number;
  }>;
  /** Start timestamp */
  startTime: string;
  /** End timestamp */
  endTime: string;
}

export interface SimulationStatus {
  /** Mock mode enabled */
  mockModeEnabled: boolean;
  /** Mocks count */
  mocksCount: number;
  /** Scenarios count */
  scenariosCount: number;
  /** Available tools */
  availableTools: string[];
  /** Mock mode description */
  mockModeDescription: string;
}

export interface MocksListResponse {
  /** Total mocks */
  total: number;
  /** Mock mode enabled */
  mockModeEnabled: boolean;
  /** Mock definitions */
  mocks: Record<string, {
    /** Error flag */
    isError?: boolean;
    /** Delay in ms */
    delayMs?: number;
    /** Failure rate */
    failureRate?: number;
  }>;
}

export interface ScenariosListResponse {
  /** Total scenarios */
  total: number;
  /** Scenario list */
  scenarios: Array<{
    /** Scenario name */
    name: string;
    /** Scenario description */
    description: string;
    /** Step count */
    steps: number;
    /** Has mocks flag */
    hasMocks: boolean;
  }>;
}

// =============================
// Custom Tools API Types
// =============================

export interface CustomToolInputSchema {
  /** Schema type */
  type: string;
  /** Schema properties */
  properties?: Record<string, {
    /** Property type */
    type: string;
    /** Property description */
    description?: string;
    /** Enum values */
    enum?: string[];
    /** Default value */
    default?: unknown;
  }>;
  /** Required properties */
  required?: string[];
}

export interface CustomTool {
  /** Tool ID */
  id: number;
  /** Tool name */
  name: string;
  /** Display name */
  displayName: string;
  /** Tool description */
  description: string;
  /** Input schema JSON */
  inputSchema: string;
  /** Operation type (e.g., 'call', 'stream') */
  operation?: string;
  /** Handler code */
  handlerCode: string;
  /** Enabled flag */
  enabled: boolean;
  /** Tool category */
  category?: string;
  /** Tool icon */
  icon?: string;
  /** Settings JSON */
  settings?: string | null;
  /** Last test args JSON */
  lastTestArgs?: string | null;
  /** Last test result JSON */
  lastTestResult?: string | null;
  /** Creation timestamp */
  createdAt: string;
  /** Update timestamp */
  updatedAt: string;
}

export interface CustomToolSummary {
  /** Tool ID */
  id: number;
  /** Tool name */
  name: string;
  /** Display name */
  displayName: string;
  /** Tool description */
  description: string;
  /** Enabled flag */
  enabled: boolean;
  /** Tool category */
  category?: string;
  /** Tool icon */
  icon?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Update timestamp */
  updatedAt: string;
  /** Has test result flag */
  hasTestResult?: boolean;
}

export interface CustomToolsListResponse {
  /** Total tools */
  total: number;
  /** Tool list */
  tools: CustomToolSummary[];
}

export interface CustomToolDetailResponse extends CustomTool {
  /** Parsed schema */
  parsedSchema?: CustomToolInputSchema;
  /** Parsed settings */
  parsedSettings?: Record<string, unknown>;
  /** Parsed test args */
  lastTestArgsParsed?: Record<string, unknown>;
  /** Parsed test result */
  lastTestResultParsed?: CallToolResult;
}

export interface CreateCustomToolRequest {
  /** Tool name */
  name: string;
  /** Display name */
  displayName: string;
  /** Tool description */
  description: string;
  /** Input schema JSON */
  inputSchema: string;
  /** Handler code */
  handlerCode: string;
  /** Tool category */
  category?: string;
  /** Tool icon */
  icon?: string;
  /** Settings JSON */
  settings?: string;
}

export interface CreateCustomToolResponse {
  /** Response status */
  status: string;
  /** Tool summary */
  tool: CustomToolSummary;
}

export interface UpdateCustomToolRequest {
  /** Display name */
  displayName?: string;
  /** Tool description */
  description?: string;
  /** Input schema JSON */
  inputSchema?: string;
  /** Handler code */
  handlerCode?: string;
  /** Tool category */
  category?: string;
  /** Tool icon */
  icon?: string;
  /** Settings JSON */
  settings?: string;
}

export interface UpdateCustomToolResponse {
  /** Response status */
  status: string;
  /** Tool summary */
  tool: CustomToolSummary;
}

export interface DeleteCustomToolResponse {
  /** Response status */
  status: string;
  /** Deleted tool name */
  tool: string;
}

export interface TestCustomToolRequest {
  /** Test arguments */
  [key: string]: unknown;
}

export interface TestCustomToolResponse {
  /** Success flag */
  success: boolean;
  /** Test result */
  result: CallToolResult;
  /** Elapsed time */
  elapsedTime?: number;
}

export interface ToggleCustomToolRequest {
  /** Enabled flag */
  enabled: boolean;
}

export interface ToggleCustomToolResponse {
  /** Response status */
  status: string;
  /** Tool info */
  tool: {
    /** Tool ID */
    id: number;
    /** Tool name */
    name: string;
    /** Enabled flag */
    enabled: boolean;
  };
}

export interface CustomToolTemplate {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Template code */
  code: {
    /** Tool name */
    name: string;
    /** Display name */
    displayName: string;
    /** Tool description */
    description: string;
    /** Input schema JSON */
    inputSchema: string;
    /** Handler code */
    handlerCode: string;
    /** Tool category */
    category: string;
    /** Tool icon */
    icon: string;
  };
}

export interface CustomToolTemplatesResponse {
  /** Template list */
  templates: CustomToolTemplate[];
}

export interface BulkToggleCustomToolRequest {
  /** Tool IDs to toggle */
  ids: number[];
  /** Enabled flag */
  enabled: boolean;
}

export interface BulkToggleCustomToolResponse {
  /** Response status */
  status: string;
  /** Number of tools updated */
  updated: number;
}

export interface ValidateToolRequest {
  /** Input schema JSON */
  inputSchema?: string;
  /** Handler code */
  handlerCode?: string;
}

export interface ValidateToolResponse {
  /** Validation result */
  valid: boolean;
  /** Validation errors */
  errors?: string[];
}

// ─── MCP Server Management Types ─────────────────────────────────────────────────

/** Transport type for MCP servers */
export type MCPServerType = 'stdio' | 'sse' | 'streamable-http';

/** Connection status for MCP servers */
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** MCP server response from list endpoint */
export interface MCPServerResponse {
  /** Database ID */
  id: number;
  /** Server name */
  name: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** Command (for stdio type) */
  command?: string;
  /** Arguments (for stdio type) */
  args?: string[];
  /** Environment variables (for stdio type) */
  env?: Record<string, string>;
  /** URL (for HTTP-based types) */
  url?: string;
  /** Headers (for HTTP-based types) */
  headers?: Record<string, string>;
  /** Whether enabled */
  enabled: boolean;
  /** Current status */
  status: MCPServerStatus;
  /** Last error message */
  lastError?: string;
  /** Timeout in milliseconds */
  timeout: number;
  /** Auto-reconnect flag */
  autoReconnect: boolean;
  /** Max reconnection attempts (-1 for unlimited) */
  maxReconnectAttempts: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay: number;
  /** Server version */
  version?: string;
  /** Last connected timestamp */
  lastConnectedAt?: Date;
  /** Connection count */
  connectionCount: number;
  /** Failure count */
  failureCount: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Update timestamp */
  updatedAt: Date;
}

/** Response from listing MCP servers */
export interface MCPServersListResponse {
  /** Pagination info */
  pagination: {
    /** Total number of servers */
    total: number;
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of pages */
    totalPages: number;
  };
  /** Server list */
  servers: MCPServerResponse[];
}

/** Request body for creating an MCP server */
export interface CreateMCPServerRequest {
  /** Unique server name */
  name: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** Command (for stdio) */
  command?: string;
  /** Arguments as array (for stdio) */
  args?: string[];
  /** Environment variables (for stdio) */
  env?: Record<string, string>;
  /** URL (for sse/streamable-http) */
  url?: string;
  /** Headers (for sse/streamable-http) */
  headers?: Record<string, string>;
  /** Whether to enable immediately */
  enabled?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Auto-reconnect flag */
  autoReconnect?: boolean;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay */
  reconnectDelay?: number;
  /** Additional settings */
  settings?: Record<string, unknown>;
}

/** Request body for updating an MCP server */
export interface UpdateMCPServerRequest {
  /** Display name */
  name: string;
  /** Display name */
  displayName?: string;
  /** Description */
  description?: string;
  /** Transport type */
  type?: MCPServerType;
  /** Command */
  command?: string;
  /** Arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** URL */
  url?: string;
  /** Headers */
  headers?: Record<string, string>;
  /** Timeout */
  timeout?: number;
  /** Auto-reconnect */
  autoReconnect?: boolean;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay */
  reconnectDelay?: number;
  /** Additional settings */
  settings?: Record<string, unknown>;
  enabled?: boolean;
}

/** Response from deleting an MCP server */
export interface MCPServerDeleteResponse {
  /** Status */
  status: 'deleted';
  /** Server name */
  server: string;
}

/** Response from starting an MCP server */
export interface MCPServerStartResponse {
  /** Status */
  status: 'started';
  /** Server info */
  server: {
    id: number;
    name: string;
    displayName: string;
  };
}

/** Response from stopping an MCP server */
export interface MCPServerStopResponse {
  /** Status */
  status: 'stopped';
  /** Server info */
  server: {
    id: number;
    name: string;
    displayName: string;
  };
}

/** Response from restarting an MCP server */
export interface MCPServerRestartResponse {
  /** Status */
  status: 'restarted';
  /** Server info */
  server: {
    id: number;
    name: string;
    displayName: string;
  };
}

/** Response from getting server status */
export interface MCPServerStatusResponse {
  /** ID */
  id: number;
  /** Name */
  name: string;
  /** Display name */
  displayName: string;
  /** Type */
  type: MCPServerType;
  /** Status */
  status: MCPServerStatus;
  /** Last error */
  lastError?: string;
  /** Version */
  version?: string;
  /** Connected at */
  connectedAt?: Date;
  /** Connection count */
  connectionCount: number;
  /** Failure count */
  failureCount: number;
}

/** Response from health check */
export interface MCPServerHealthResponse {
  /** ID */
  id: number;
  /** Name */
  name: string;
  /** Health status */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** Connection status */
  connectionStatus: MCPServerStatus;
  /** Uptime in seconds */
  uptime?: number;
  /** Last error */
  lastError?: string;
  /** Checked at */
  checkedAt: Date;
}

/** Response from testing server connection */
export interface MCPServerTestResponse {
  /** Whether test was successful */
  success: boolean;
  /** Status */
  status: string;
  /** Message */
  message: string;
  /** Last error */
  lastError?: string;
}

/** MCP server template */
export interface MCPServerTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** Example command */
  command?: string;
  /** Example arguments */
  args?: string[];
  /** Example URL */
  url?: string;
  /** Example environment variables */
  env?: Record<string, string>;
  /** Example headers */
  headers?: Record<string, string>;
  /** Additional notes */
  notes?: string;
  /** Documentation URL */
  documentationUrl?: string;
  /** Template category */
  category?: string;
  /** Template icon (emoji) */
  icon?: string;
  /** Template tags */
  tags?: string[];
  /** Required runtime */
  runtime?: string;
  /** Homepage URL */
  homepage?: string;
  /** Template variables */
  variables?: Array<{
    key: string;
    description?: string;
    required?: boolean;
    default?: string;
    example?: string;
  }>;
}

/** Response from getting server templates */
export interface MCPServerTemplatesResponse {
  /** Template list */
  templates: MCPServerTemplate[];
}

// ============================================
// Metrics Trends API Types
// ============================================

export interface MetricsTrendsResponse {
  /** Time period information */
  period: {
    /** Duration in hours */
    lengthHours: number;
    /** Current period timestamps */
    current: {
      start: string;
      end: string;
    };
    /** Previous period timestamps */
    previous: {
      start: string;
      end: string;
    };
  };
  /** Comparison between current and previous periods */
  comparison: {
    requests: {
      current: number;
      previous: number;
      changePercent: number;
    };
    errors: {
      current: number;
      previous: number;
      changePercent: number;
    };
    latency: {
      current: number;
      previous: number;
      changePercent: number;
    };
  };
}

// ============================================
// Metrics Anomalies API Types
// ============================================

export interface MetricsAnomaliesResponse {
  /** Analysis statistics */
  analysis: {
    /** Mean latency in milliseconds */
    meanLatencyMs: number;
    /** Standard deviation */
    standardDeviation: number;
    /** Z-score threshold used */
    threshold: number;
  };
  /** Number of anomalies detected */
  count: number;
  /** List of detected anomalies */
  anomalies: Array<{
    /** Timestamp of the anomaly */
    timestamp: string;
    /** Request path */
    path: string;
    /** HTTP method */
    method: string;
    /** Latency in milliseconds */
    latencyMs: number;
    /** Z-score */
    zScore: number;
  }>;
}

// ============================================
// Deep Health Check API Types
// ============================================

export interface DeepHealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Overall health score (0-100) */
  score: number;
  /** Score breakdown */
  breakdown: {
    system: {
      score: number;
      memUsagePercent: number;
    };
    providers: {
      score: number;
      total: number;
    };
    stability: {
      score: number;
      errorRate: number;
    };
  };
  /** Timestamp of the check */
  timestamp: string;
}
