/**
 * @module types/api
 * @description Type definitions for MCP Server API endpoints and data structures.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  status?: string;
  timestamp?: string;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Health & Info Endpoints
// ============================================================================

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

export interface HealthCheck {
  database: HealthCheck;
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

export interface HealthReadyResponse {
  status: 'ready' | 'degraded';
  timestamp: string;
  checks: {
    database: HealthCheck;
    [key: `provider:${string}`]: HealthCheck;
  };
}

export interface ServerInfo {
  name: string;
  version: string;
  protocol: string;
}

export interface ProviderInfo {
  available: string[];
  default: string;
}

export interface ToolInfo {
  total: number;
  enabled: number;
  categories: Record<string, string[]>;
}

export interface InfoResponse {
  server: ServerInfo;
  providers: ProviderInfo;
  tools: ToolInfo;
  resources: number;
  prompts: number;
  uptime: number;
}

// ============================================================================
// MCP Protocol Types (JSON-RPC 2.0)
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

// MCP Tool Definition
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

// MCP Call Tool Result
export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
}

// MCP Tools List Response
export interface ToolsListResponse {
  tools: ToolDefinition[];
}

// MCP Tools Call Request
export interface ToolsCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

// ============================================================================
// Chat API Types
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatRequest {
  messages?: ChatMessage[];
  message?: string;
  conversationId?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxIterations?: number;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface ChatResponse {
  conversationId: string;
  content: string;
  iterations: number;
  toolCalls: ToolCall[];
  tokens: TokenUsage;
  elapsedMs: number;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface ConversationMessage {
  role: string;
  content: string;
  toolName?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  lastMessage?: string;
  updatedAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
}

export interface ConversationsListResponse {
  conversations: Conversation[];
}

export interface ConversationDeleteResponse {
  status: string;
  id: string;
}

// ============================================================================
// Admin API - Providers
// ============================================================================

export interface Provider {
  id: string;
  name: string;
  type: 'ollama' | 'openai';
  baseUrl: string;
  defaultModel: string;
  apiKey?: string;
  isDefault: boolean;
  temperature?: number;
  maxTokens?: number;
}

// @ts-expect-error known issue
export interface ProviderWithId extends Provider {
  id: number;
  settings?: string;
}

export interface ProvidersResponse {
  active: Array<Provider & { id?: number }>;
  configured: ProviderWithId[];
  default: string;
}

export interface CreateProviderRequest {
  name: string;
  type: 'ollama' | 'openai';
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  isDefault?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderResponse {
  status: string;
  provider: ProviderWithId;
}

export interface ProviderRemoveResponse {
  status: string;
  provider: string;
}

export interface ProviderDefaultResponse {
  status: string;
  provider: string;
}

export interface Model {
  id: string;
  name?: string;
}

export interface ModelsListResponse {
  provider: string;
  models: Model[];
}

// ============================================================================
// Admin API - Tools
// ============================================================================

export interface RegisteredTool extends ToolDefinition {
  enabled: boolean;
  category?: string;
}

export interface ToolSummary {
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
  hasInputSchema: boolean;
}

export interface ToolsResponse {
  total: number;
  enabled: number;
  categories: Record<string, string[]>;
  tools: ToolSummary[];
}

export interface ToolDetailResponse {
  name: string;
  description: string;
  enabled: boolean;
  category?: string;
  inputSchema?: ToolDefinition['inputSchema'];
}

export interface UpdateToolRequest {
  enabled: boolean;
}

export interface UpdateToolResponse {
  status: string;
  tool: string;
  enabled: boolean;
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type SSEEventType = 'tool_call' | 'result' | 'done' | 'error';

export interface ToolCallEvent {
  iteration: number;
  tools: Array<{
    name: string;
    success: boolean;
  }>;
}

export interface ResultEvent {
  content: string;
  iterations: number;
  toolCalls: number;
  tokens: TokenUsage;
}

export interface ErrorEvent {
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
  baseUrl: string;
  timeout?: number;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: 'http://localhost:3100',
  timeout: 30000,
};

// ============================
// Metrics API Types
// ============================

export interface RequestMetric {
  endpoint: string;
  method: string;
  durationMs: number;
  statusCode: number;
  requestSize?: number;
  responseSize?: number;
  timestamp: string;
}

export interface ToolMetric {
  toolName: string;
  durationMs: number;
  success: boolean;
  error?: string;
  inputKeys?: string[];
  timestamp: string;
}

export interface TokenMetric {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEstimate?: number;
  timestamp: string;
}

export interface ProviderMetric {
  provider: string;
  model: string;
  latencyMs: number;
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
}

export interface ErrorMetric {
  type: string;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface SystemMetric {
  memoryUsedMb: number;
  memoryTotalMb: number;
  cpuUsage?: number;
  eventLoopLagMs: number;
  activeHandles?: number;
  timestamp: string;
}

export interface MetricsSummary {
  period: {
    start: string;
    end: string;
  };
  requests: {
    total: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    byEndpoint: Record<string, number>;
    byStatusCode: Record<string, number>;
  };
  tools: {
    totalCalls: number;
    successRate: number;
    avgDurationMs: number;
    byTool: Record<string, {
      calls: number;
      avgDurationMs: number;
      successRate: number;
    }>;
  };
  tokens: {
    totalInput: number;
    totalOutput: number;
    totalCostEstimate: number;
    byProvider: Record<string, {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      requests: number;
    }>;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
    recent: ErrorMetric[];
  };
  providers: {
    byProvider: Record<string, {
      avgLatencyMs: number;
      requestCount: number;
      successRate: number;
      lastStatus: 'ok' | 'degraded' | 'error';
    }>;
  };
}

export interface MetricsResponse {
  period: {
    hours: number;
    start: string;
    end: string;
  };
  summary: MetricsSummary;
}

export interface SystemMetricsResponse {
  system: SystemMetric;
  platform: {
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    uptime: number;
  };
  recentHistory: SystemMetric[];
}

// ============================
// Simulation API Types
// ============================

export interface MockResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  delayMs?: number;
  failureRate?: number;
}

export interface ScenarioStep {
  name: string;
  tool: string;
  args?: Record<string, unknown>;
  expects?: {
    contains?: string;
    notContains?: string;
    hasError?: boolean;
    maxDurationMs?: number;
  };
  description?: string;
}

export interface Scenario {
  name: string;
  description: string;
  steps: ScenarioStep[];
  setupMocks?: Record<string, MockResponse>;
  cleanupMocks?: boolean;
}

export interface StepResult {
  name: string;
  passed: boolean;
  durationMs: number;
  response?: CallToolResult;
  error?: string;
}

export interface ScenarioResult {
  name: string;
  passed: boolean;
  durationMs: number;
  steps: StepResult[];
  errors: string[];
  timestamp: string;
}

export interface LoadConfig {
  tools: string[];
  argsTemplates?: Record<string, Record<string, unknown>[]>;
  concurrentUsers: number;
  durationMs: number;
  requestsPerSecond?: number;
  recordMetrics?: boolean;
  useMocks?: boolean;
}

export interface LoadResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  rps: number;
  byTool: Record<string, {
    count: number;
    avgLatencyMs: number;
    errors: number;
  }>;
  startTime: string;
  endTime: string;
}

export interface SimulationStatus {
  mockModeEnabled: boolean;
  mocksCount: number;
  scenariosCount: number;
  availableTools: string[];
  mockModeDescription: string;
}

export interface MocksListResponse {
  total: number;
  mockModeEnabled: boolean;
  mocks: Record<string, {
    isError?: boolean;
    delayMs?: number;
    failureRate?: number;
  }>;
}

export interface ScenariosListResponse {
  total: number;
  scenarios: Array<{
    name: string;
    description: string;
    steps: number;
    hasMocks: boolean;
  }>;
}
