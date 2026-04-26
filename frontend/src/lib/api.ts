// noinspection ExceptionCaughtLocallyJS

/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module lib/api
 * @description API client service for all MCP Server endpoints.
 *
 * Provides a unified interface for all API endpoints with proper error handling
 * and type safety.
 *
 * ## MCP Server Management
 *
 * Includes comprehensive endpoints for managing external MCP servers:
 * - List, create, update, and delete MCP servers
 * - Start, stop, and restart server connections
 * - Test connectivity and health checks
 * - Get server templates for quick setup
 */

import type {
  // Health & Info
  HealthResponse,
  HealthReadyResponse,
  InfoResponse,

  // MCP Protocol
  JsonRpcRequest,
  JsonRpcResponse,
  ToolsListResponse,
  ToolsCallRequest,
  CallToolResult,

  // Chat
  ChatRequest,
  ChatResponse,
  ConversationsListResponse,
  ConversationWithMessages,
  ConversationDeleteResponse,

  // Admin - Providers
  ProvidersResponse,
  CreateProviderRequest,
  ProviderResponse,
  ProviderRemoveResponse,
  ProviderDefaultResponse,
  ModelsListResponse,

  // Admin - Tools
  ToolsResponse,
  ToolDetailResponse,
  UpdateToolRequest,
  UpdateToolResponse,

  // Metrics
  MetricsResponse,
  SystemMetricsResponse,
  MetricsTrendsResponse,
  MetricsAnomaliesResponse,
  DeepHealthCheckResponse,

  // Simulation
  MockResponse,
  Scenario,
  ScenarioResult,
  LoadConfig,
  LoadResults,
  SimulationStatus,
  MocksListResponse,
  ScenariosListResponse,
  HealthCheckResult,
  HealthChecks,
  SSEEventType,
  ToolMetric,
  RegisteredTool,
  ErrorMetric,
  ScenarioStep,
  SSEEvent,
  ToolCallEvent,
  ResultEvent,
  TokenMetric,
  RequestMetric,
  ToolSummary,
  Model,
  Provider,
  ProviderWithId,
  ToolDefinition,
  ChatMessage,
  TokenUsage,
  ToolCall,
  Conversation,
  ConversationMessage,
  ProviderMetric,
  SystemMetric,
  MetricsSummary,
  StepResult,
  // Configuration
  ApiConfig,
  CustomToolTemplatesResponse,
  ToggleCustomToolResponse,
  TestCustomToolResponse,
  TestCustomToolRequest,
  DeleteCustomToolResponse,
  UpdateCustomToolRequest,
  CreateCustomToolRequest,
  CreateCustomToolResponse,
  UpdateCustomToolResponse,
  CustomToolDetailResponse,
  CustomToolsListResponse,
  CustomTool,
  CustomToolSummary,
  ToggleCustomToolRequest,
  CustomToolTemplate,
  CustomToolInputSchema,
  BulkToggleCustomToolRequest,
  BulkToggleCustomToolResponse,
  ValidateToolRequest,
  ValidateToolResponse,
  // MCP Servers
  MCPServerResponse,
  MCPServersListResponse,
  CreateMCPServerRequest,
  UpdateMCPServerRequest,
  MCPServerDeleteResponse,
  MCPServerStartResponse,
  MCPServerStopResponse,
  MCPServerRestartResponse,
  MCPServerStatusResponse,
  MCPServerHealthResponse,
  MCPServerTestResponse,
  MCPServerTemplatesResponse, ProviderTestResponse, BatchToolUpdateRequest, BatchToolUpdateResponse,
  McpHealthResponse,
} from '../types/api';
import {DEFAULT_API_CONFIG} from '../types/api';

// ====== Configuration ======

export const config: ApiConfig = {
  baseUrl: (import.meta.env as any)?.VITE_API_BASE_URL || DEFAULT_API_CONFIG.baseUrl,
  timeout: DEFAULT_API_CONFIG.timeout,
};

// ====== Helper Functions ======

/**
 * Creates an AbortController with timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  controller.signal.addEventListener('abort', () => clearTimeout(id));
  return controller;
}

/**
 * Performs an HTTP request with error handling
 */
export async function request<T>(
  endpoint: string,
  options: RequestInit & {noContentType?: boolean} = {},
  timeout?: number,
): Promise<T> {
  const timeoutValue = timeout ?? config.timeout;
  const controller = createTimeoutController(timeoutValue as number);

  const newOptions: RequestInit & {noContentType?: boolean} = {
    noContentType: false,
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (newOptions?.method === 'DELETE' || newOptions?.noContentType) {
    delete newOptions.headers['Content-Type'];
  }

  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, newOptions);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const text = await response.text();
    if (!text) return undefined as T;

    return JSON.parse(text);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request to ${endpoint} timed out`);
    }
    throw error;
  }
}

// ====== Health Endpoints ======

/**
 * GET /health - Basic server health check
 */
export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

/**
 * GET /health/ready - Readiness probe
 */
export async function getHealthReady(): Promise<HealthReadyResponse> {
  return request<HealthReadyResponse>('/health/ready');
}

/**
 * GET /info - Server information and capabilities
 */
export async function getServerInfo(): Promise<InfoResponse> {
  return request<InfoResponse>('/info');
}

/**
 * GET /info - Get MCP protocol information
 * Same as getServerInfo but with explicit naming for MCP info page
 */
export async function getMcpInfo(): Promise<InfoResponse> {
  return request<InfoResponse>('/info');
}

// ====== Diagnostics Endpoints ======

/**
 * GET /diagnostics/stats - Get real-time server statistics
 */
export async function getDiagnosticsStats(): Promise<{
  uptime: number;
  cpu: { user: number; system: number };
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  activeHandles: number;
}> {
  return request('/diagnostics/stats');
}

/**
 * POST /diagnostics/toggle - Toggle simulation states for testing
 */
export async function toggleDiagnostics(body?: {
  failDatabase?: boolean;
  failProvider?: string | null;
  addLatency?: number;
}): Promise<{
  message: string;
  currentState: {
    failDatabase: boolean;
    failProvider: string | null;
    latencyMs: number;
  };
}> {
  return request('/diagnostics/toggle', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ====== MCP Protocol Endpoints ======

/**
 * POST /mcp - Handle JSON-RPC requests
 */
export async function sendMcpRequest(
  rpcRequest: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  return request<JsonRpcResponse>('/mcp', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(rpcRequest),
  });
}

/**
 * POST /mcp - Handle batch JSON-RPC requests
 */
export async function sendMcpBatch(
  rpcRequests: JsonRpcRequest[],
): Promise<JsonRpcResponse[]> {
  return request<JsonRpcResponse[]>('/mcp', {
    method: 'POST',
    body: JSON.stringify(rpcRequests),
  });
}

/**
 * GET /mcp/sse - Get SSE connection for MCP streaming
 */
export function getMcpSSE(): EventSource {
  return new EventSource(`${config.baseUrl}/mcp/sse`, {
    withCredentials: true,
  });
}

// ====== MCP Health Endpoint ======

/**
 * GET /mcp/health - Check MCP server health status
 */
export async function getMcpHealth(): Promise<McpHealthResponse> {
  return request('/mcp/health');
}

/**
 * Re-export for convenience
 */
export type { McpHealthResponse } from '../types/api';

// ====== MCP Debug Endpoint ======

/**
 * POST /mcp/debug/echo - Debug endpoint for testing MCP structures
 * Echoes back the request payload wrapped in a valid JSON-RPC response
 */
export async function debugEcho(body: Record<string, unknown>): Promise<{
  jsonrpc: string;
  result: {
    echoed: Record<string, unknown>;
    meta: {
      receivedAt: string;
      clientIp: string;
    };
  };
  id: string;
}> {
  return request('/mcp/debug/echo', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ====== MCP Batch Request Helper ======

/**
 * Send a batch of JSON-RPC requests and return all responses
 * Handles individual request errors gracefully (per-item error handling)
 */
export async function sendMcpBatchRequests(
  rpcRequests: JsonRpcRequest[],
): Promise<Array<{ error?: { code: number; message: string; data?: unknown } | null; result?: unknown; id: number | string | null }>> {
  const responses = await request<JsonRpcResponse[]>('/mcp', {
    method: 'POST',
    body: JSON.stringify(rpcRequests),
  });

  return responses.map((resp) => {
    if (resp.error) {
      return {
        id: resp.id,
        error: resp.error,
        result: null,
      };
    }
    return {
      id: resp.id,
      result: resp.result,
      error: null,
    };
  });
}

/**
 * List all available tools via MCP protocol
 */
export async function listTools(): Promise<ToolsListResponse> {
  const response = await sendMcpRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.result as ToolsListResponse;
}

/**
 * Call a specific tool via MCP protocol
 */
export async function callTool(toolRequest: ToolsCallRequest): Promise<CallToolResult> {
  const response = await sendMcpRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: toolRequest,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.result as CallToolResult;
}

// ====== Chat Endpoints ======

/**
 * POST /chat - Send a message and get response
 */
export async function sendChat(params: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(params),
  }, 360 * 1000);
}

/**
 * POST /chat/stream - Stream chat response via SSE
 */
export function streamChat(request: ChatRequest): EventSource {
  // Send the message first
  fetch(`${config.baseUrl}/chat/stream`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(request),
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      throw new Error(`Stream failed: ${res.statusText}`);
    }
  });

  return new EventSource(`${config.baseUrl}/chat/stream`);
}

/**
 * GET /chat/conversations - List all conversations
 */
export async function listConversations(): Promise<ConversationsListResponse> {
  return request<ConversationsListResponse>('/chat/conversations');
}

/**
 * GET /chat/conversations/:id - Get a conversation with messages
 */
export async function getConversation(id: string): Promise<ConversationWithMessages> {
  return request<ConversationWithMessages>(`/chat/conversations/${encodeURIComponent(id)}`);
}

/**
 * DELETE /chat/conversations/:id - Delete a conversation
 */
export async function deleteConversation(id: string): Promise<ConversationDeleteResponse> {
  return request<ConversationDeleteResponse>(`/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ====== Admin - Provider Endpoints ======

/**
 * GET /admin/providers - List all providers
 */
export async function listProviders(): Promise<ProvidersResponse> {
  return request<ProvidersResponse>('/admin/providers');
}

/**
 * POST /admin/providers - Add a new provider
 */
export async function createProvider(provider: CreateProviderRequest): Promise<ProviderResponse> {
  return request<ProviderResponse>('/admin/providers', {
    method: 'POST',
    body: JSON.stringify(provider),
  });
}

/**
 * DELETE /admin/providers/:name - Remove a provider
 */
export async function removeProvider(name: string): Promise<ProviderRemoveResponse> {
  return request<ProviderRemoveResponse>(`/admin/providers/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

/**
 * POST /admin/providers/:name/default - Set provider as default
 */
export async function setDefaultProvider(name: string): Promise<ProviderDefaultResponse> {
  return request<ProviderDefaultResponse>(`/admin/providers/${encodeURIComponent(name)}/default`, {
    method: 'POST',
  });
}

/**
 * GET /admin/providers/:name/models - List models from a provider
 */
export async function listProviderModels(name: string): Promise<ModelsListResponse> {
  return request<ModelsListResponse>(`/admin/providers/${encodeURIComponent(name)}/models`);
}

/**
 * POST /admin/providers/:name/test - Test connectivity to a provider
 */
export async function testProviderConnection(name: string): Promise<ProviderTestResponse> {
  return request<ProviderTestResponse>(`/admin/providers/${encodeURIComponent(name)}/test`, {
    method: 'POST',
  });
}

// ====== Admin - Tool Endpoints ======

/**
 * GET /admin/tools - List all tools
 */
export async function listAdminTools(): Promise<ToolsResponse> {
  return request<ToolsResponse>('/admin/tools');
}

/**
 * GET /admin/tools/:name - Get tool details
 */
export async function getToolDetails(name: string): Promise<ToolDetailResponse> {
  return request<ToolDetailResponse>(`/admin/tools/${encodeURIComponent(name)}`);
}

/**
 * PATCH /admin/tools/:name - Enable/disable a tool
 */
export async function updateTool(
  name: string,
  update: UpdateToolRequest,
): Promise<UpdateToolResponse> {
  return request<UpdateToolResponse>(`/admin/tools/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
}

/**
 * POST /admin/tools/batch - Batch update tools status
 */
export async function batchUpdateTools(
  update: BatchToolUpdateRequest,
): Promise<BatchToolUpdateResponse> {
  return request<BatchToolUpdateResponse>('/admin/tools/batch', {
    method: 'POST',
    body: JSON.stringify(update),
  });
}

// ====== Export Configuration ======

/**
 * Set custom API configuration
 */
export function setApiConfig(customConfig: Partial<ApiConfig>): void {
  Object.assign(config, customConfig);
}

/**
 * Get current API configuration
 */
export function getApiConfig(): Readonly<ApiConfig> {
  return config;
}

/**
 * Update the base URL at runtime
 */
export function setApiBaseUrl(url: string): void {
  config.baseUrl = url;
}

// ====== Re-export Types for Convenience ======
export type {
  // Health & Info
  HealthResponse,
  HealthReadyResponse,
  InfoResponse,

  // MCP Protocol
  JsonRpcRequest,
  JsonRpcResponse,
  ToolsListResponse,
  ToolsCallRequest,
  CallToolResult,
  ToolDefinition,
  HealthCheckResult,
  HealthChecks,
  // Chat
  ChatRequest,
  ChatResponse,
  ChatMessage,
  TokenUsage,
  ToolCall,

  // Conversations
  Conversation,
  ConversationWithMessages,
  ConversationsListResponse,
  ConversationDeleteResponse,
  ConversationMessage,

  // Admin - Providers
  Provider,
  ProviderWithId,
  ProvidersResponse,
  CreateProviderRequest,
  ProviderResponse,
  ProviderRemoveResponse,
  ProviderDefaultResponse,
  Model,
  ModelsListResponse,

  // Admin - Tools
  ToolSummary,
  ToolsResponse,
  ToolDetailResponse,
  UpdateToolRequest,
  UpdateToolResponse,
  RegisteredTool,

  // Metrics
  MetricsResponse,
  SystemMetricsResponse,
  RequestMetric,
  ToolMetric,
  TokenMetric,
  ProviderMetric,
  ErrorMetric,
  SystemMetric,
  MetricsSummary,

  // Simulation
  MockResponse,
  Scenario,
  ScenarioStep,
  ScenarioResult,
  StepResult,
  LoadConfig,
  LoadResults,
  SimulationStatus,
  MocksListResponse,
  ScenariosListResponse,

  // SSE
  SSEEventType,
  SSEEvent,
  ToolCallEvent,
  ResultEvent,

  // API Config
  ApiConfig,

  // Custom Tools
  CustomTool,
  CustomToolSummary,
  CustomToolsListResponse,
  CustomToolDetailResponse,
  CreateCustomToolRequest,
  CreateCustomToolResponse,
  UpdateCustomToolRequest,
  UpdateCustomToolResponse,
  DeleteCustomToolResponse,
  TestCustomToolRequest,
  TestCustomToolResponse,
  ToggleCustomToolRequest,
  ToggleCustomToolResponse,
  BulkToggleCustomToolRequest,
  BulkToggleCustomToolResponse,
  ValidateToolRequest,
  ValidateToolResponse,
  CustomToolTemplate,
  CustomToolTemplatesResponse,
  CustomToolInputSchema,
};

// ====== Metrics Endpoints ======

/**
 * GET /metrics - Get metrics summary
 */
export async function getMetrics(hours?: number): Promise<MetricsResponse> {
  const query = hours ? `?hours=${hours}` : '';
  return request<MetricsResponse>(`/metrics${query}`);
}

/**
 * GET /metrics/requests - Get request metrics
 */
export async function getRequestMetrics(): Promise<{
  total: number;
  avgLatencyMs: number;
  percentiles: { p50: number; p95: number; p99: number };
  byEndpoint: Record<string, number>;
  byStatusCode: Record<string, number>;
  recentRequests: Array<Record<string, unknown>>;
}> {
  return request('/metrics/requests');
}

/**
 * GET /metrics/tools - Get tool execution metrics
 */
export async function getToolMetrics(): Promise<{
  totalCalls: number;
  successRate: number;
  avgDurationMs: number;
  byTool: Record<string, { calls: number; avgDurationMs: number; successRate: number }>;
  recentExecutions: Array<Record<string, unknown>>;
}> {
  return request('/metrics/tools');
}

/**
 * GET /metrics/tokens - Get token usage metrics
 */
export async function getTokenMetrics(): Promise<{
  totalInput: number;
  totalOutput: number;
  totalTokens: number;
  estimatedCost: number;
  byProvider: Record<string, { inputTokens: number; outputTokens: number; totalTokens: number; requests: number }>;
  recentUsage: Array<Record<string, unknown>>;
}> {
  return request('/metrics/tokens');
}

/**
 * GET /metrics/providers - Get provider performance metrics
 */
export async function getProviderMetrics(): Promise<{
  byProvider: Record<string, { avgLatencyMs: number; requestCount: number; successRate: number; lastStatus: string }>;
  liveStatus: Record<string, { status: string; latencyMs?: number; message?: string }>;
  registeredProviders: string[];
  defaultProvider: string;
}> {
  return request('/metrics/providers');
}

/**
 * GET /metrics/errors - Get error metrics
 */
export async function getErrorMetrics(): Promise<{
  total: number;
  byType: Record<string, number>;
  recentErrors: Array<Record<string, unknown>>;
}> {
  return request('/metrics/errors');
}

/**
 * GET /metrics/system - Get system resource metrics
 */
export async function getSystemMetrics(): Promise<SystemMetricsResponse> {
  return request<SystemMetricsResponse>('/metrics/system');
}

// ============================================
// Metrics Trends API Functions
// ============================================

/**
 * GET /metrics/trends - Compare metrics between current and previous periods
 */
export async function getMetricsTrends(hours?: number): Promise<MetricsTrendsResponse> {
  const query = hours ? `?hours=${hours}` : '';
  return request<MetricsTrendsResponse>(`/metrics/trends${query}`);
}

// ============================================
// Metrics Anomalies API Functions
// ============================================

/**
 * GET /metrics/anomalies - Detect anomalies based on standard deviation
 */
export async function getMetricsAnomalies(
  hours?: number,
  threshold?: number,
): Promise<MetricsAnomaliesResponse> {
  const params = new URLSearchParams();
  if (hours) params.set('hours', hours.toString());
  if (threshold) params.set('threshold', threshold.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<MetricsAnomaliesResponse>(`/metrics/anomalies${query}`);
}

// ============================================
// Deep Health Check API Functions
// ============================================

/**
 * GET /metrics/health/deep - Deep health check with score
 */
export async function getDeepHealthCheck(): Promise<DeepHealthCheckResponse> {
  return request<DeepHealthCheckResponse>('/metrics/health/deep');
}

// ============================================
// Metrics Clear API Functions
// ============================================

/**
 * DELETE /metrics/clear - Clear all metrics (dev only)
 */
export async function clearMetrics(): Promise<{ status: string; timestamp: string }> {
  return request('/metrics/clear?confirm=yes', { method: 'DELETE' });
}

// ====== Simulation Endpoints ======

/**
 * GET /simulate/scenarios - List all scenarios
 */
export async function listScenarios(): Promise<ScenariosListResponse> {
  return request<ScenariosListResponse>('/simulate/scenarios');
}

/**
 * GET /simulate/scenarios/:name - Get scenario details
 */
export async function getScenario(name: string): Promise<Scenario> {
  return request<Scenario>(`/simulate/scenarios/${encodeURIComponent(name)}`);
}

/**
 * POST /simulate/scenarios/:name/run - Run a scenario
 */
export async function runScenario(name: string, options?: { useMocks?: boolean }): Promise<{
  scenario: string;
  result: ScenarioResult;
}> {
  return request(`/simulate/scenarios/${encodeURIComponent(name)}/run`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

/**
 * POST /simulate/scenarios - Register a new scenario
 */
export async function setScenario(scenario: Scenario): Promise<{ status: string; name: string }> {
  return request('/simulate/scenarios', {
    method: 'POST',
    body: JSON.stringify(scenario),
  });
}

/**
 * GET /simulate/mocks - List all mock configurations
 */
export async function listMocks(): Promise<MocksListResponse> {
  return request<MocksListResponse>('/simulate/mocks');
}

/**
 * POST /simulate/mocks - Set a mock response
 */
export async function setMock(mock: {
  tool: string;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  delayMs?: number;
  failureRate?: number;
}): Promise<{ status: string; tool: string }> {
  return request('/simulate/mocks', {
    method: 'POST',
    body: JSON.stringify(mock),
  });
}

/**
 * DELETE /simulate/mocks/:tool - Remove a mock
 */
export async function removeMock(tool: string): Promise<{ status: string; tool: string }> {
  return request(`/simulate/mocks/${encodeURIComponent(tool)}`, {
    method: 'DELETE',
  });
}

/**
 * POST /simulate/mocks/clear - Clear all mocks
 */
export async function clearMocks(): Promise<{ status: string; clearedCount: number }> {
  return request('/simulate/mocks/clear', {
    method: 'POST',
  });
}

/**
 * GET /simulate/mode - Get mock mode status
 */
export async function getMockMode(): Promise<{ mockModeEnabled: boolean }> {
  return request<{ mockModeEnabled: boolean }>('/simulate/mode');
}

/**
 * PATCH /simulate/mode - Set mock mode
 */
export async function setMockMode(enabled: boolean): Promise<{ status: string; mockModeEnabled: boolean }> {
  return request('/simulate/mode', {
    method: 'PATCH',
    body: JSON.stringify({enabled}),
  });
}

/**
 * POST /simulate/load - Run load simulation
 */
export async function runLoadSimulation(config: LoadConfig): Promise<{
  status: string;
  results: LoadResults;
}> {
  return request('/simulate/load', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/**
 * POST /simulate/tool - Execute a single tool for testing
 */
export async function executeTool(test: {
  name: string;
  args?: Record<string, unknown>;
  useMock?: boolean;
}): Promise<{
  success: boolean;
  tool: string;
  args: Record<string, unknown>;
  result?: CallToolResult;
  error?: string;
  durationMs: number;
  timestamp: string;
}> {
  return request('/simulate/tool', {
    method: 'POST',
    body: JSON.stringify(test),
  });
}

/**
 * GET /simulate/status - Get simulation framework status
 */
export async function getSimulationStatus(): Promise<SimulationStatus> {
  return request<SimulationStatus>('/simulate/status');
}

// ========== Custom Tools Endpoints ==========

/**
 * GET /api/custom-tools - List all custom tools
 */
export async function listCustomTools(params?: {
  enabled?: boolean;
  category?: string;
  search?: string;
}): Promise<CustomToolsListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.enabled !== undefined) queryParams.append('enabled', String(params.enabled));
  if (params?.category) queryParams.append('category', params.category);
  if (params?.search) queryParams.append('search', params.search);

  const query = queryParams.toString();
  const endpoint = query ? `/api/custom-tools?${query}` : '/api/custom-tools';
  return request<CustomToolsListResponse>(endpoint);
}

/**
 * GET /api/custom-tools/:id - Get a specific custom tool
 */
export async function getCustomTool(id: number): Promise<CustomToolDetailResponse> {
  return request<CustomToolDetailResponse>(`/api/custom-tools/${id}`);
}

/**
 * POST /api/custom-tools - Create a new custom tool
 */
export async function createCustomTool(tool: CreateCustomToolRequest): Promise<CreateCustomToolResponse> {
  return request<CreateCustomToolResponse>('/api/custom-tools', {
    method: 'POST',
    body: JSON.stringify(tool),
  });
}

/**
 * PUT /api/custom-tools/:id - Update a custom tool
 */
export async function updateCustomTool(
  id: number,
  updates: UpdateCustomToolRequest,
): Promise<UpdateCustomToolResponse> {
  return request<UpdateCustomToolResponse>(`/api/custom-tools/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * DELETE /api/custom-tools/:id - Delete a custom tool
 */
export async function deleteCustomTool(id: number): Promise<DeleteCustomToolResponse> {
  return request<DeleteCustomToolResponse>(`/api/custom-tools/${id}`, {
    method: 'DELETE',
  });
}

/**
 * POST /api/custom-tools/:id/test - Test a custom tool
 */
export async function testCustomTool(
  id: number,
  args: TestCustomToolRequest,
): Promise<TestCustomToolResponse> {
  return request<TestCustomToolResponse>(`/api/custom-tools/${id}/test`, {
    method: 'POST',
    body: JSON.stringify(args),
  });
}

/**
 * POST /api/custom-tools/:id/toggle - Toggle custom tool enabled state
 */
export async function toggleCustomTool(
  id: number,
  enabled: boolean,
): Promise<ToggleCustomToolResponse> {
  return request<ToggleCustomToolResponse>(`/api/custom-tools/${id}/toggle`, {
    method: 'POST',
    body: JSON.stringify({enabled}),
  });
}

/**
 * GET /api/custom-tools/templates - Get example tool templates
 */
export async function getCustomToolTemplates(): Promise<CustomToolTemplatesResponse> {
  return request<CustomToolTemplatesResponse>('/api/custom-tools/templates');
}

/**
 * POST /api/custom-tools/bulk/toggle - Bulk enable/disable multiple custom tools
 */
export async function bulkToggleCustomTool(
  ids: number[],
  enabled: boolean,
): Promise<BulkToggleCustomToolResponse> {
  return request<BulkToggleCustomToolResponse>('/api/custom-tools/bulk/toggle', {
    method: 'POST',
    body: JSON.stringify({ids, enabled}),
  });
}

/**
 * POST /api/custom-tools/validate - Validate tool code and schema without saving
 */
export async function validateCustomTool(
  inputSchema?: string,
  handlerCode?: string,
): Promise<ValidateToolResponse> {
  return request<ValidateToolResponse>('/api/custom-tools/validate', {
    method: 'POST',
    body: JSON.stringify({inputSchema, handlerCode}),
  });
}

// ─── MCP Server Management ────────────────────────────────────────────────────────

/**
 * GET /api/mcp-servers - List all MCP servers
 * @param [params] - Filter by enabled status (optional)
 * @param [params.enabled] - Filter by enabled status (optional)
 * @param [params.status] - Filter by status (optional)
 * @param [params.search] - Search query (optional)
 * @param [params.page] - The page no (optional)
 * @param [params.limit] - No. of records per page (optional)
 */
export async function listMCPServers(params?: {
  enabled?: boolean;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<MCPServersListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.enabled !== undefined) queryParams.append('enabled', String(params.enabled));
  if (params?.status) queryParams.append('status', params.status);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  const endpoint = `${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
  return request<MCPServersListResponse>(`/api/mcp-servers${endpoint}`);
}

/**
 * GET /api/mcp-servers/:id - Get a specific MCP server
 */
export async function getMCPServer(id: number): Promise<MCPServerResponse> {
  return request<MCPServerResponse>(`/api/mcp-servers/${id}`);
}

/**
 * POST /api/mcp-servers - Create a new MCP server
 */
export async function createMCPServer(data: CreateMCPServerRequest): Promise<CreateCustomToolResponse> {
  return request<CreateCustomToolResponse>('/api/mcp-servers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT /api/mcp-servers/:id - Update an MCP server
 */
export async function updateMCPServer(id: number, data: UpdateMCPServerRequest): Promise<UpdateCustomToolResponse> {
  return request<UpdateCustomToolResponse>(`/api/mcp-servers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE /api/mcp-servers/:id - Delete an MCP server
 */
export async function deleteMCPServer(id: number): Promise<MCPServerDeleteResponse> {
  return request<MCPServerDeleteResponse>(`/api/mcp-servers/${id}`, {
    method: 'DELETE',
  });
}

/**
 * POST /api/mcp-servers/:id/start - Start an MCP server
 */
export async function startMCPServer(id: number): Promise<MCPServerStartResponse> {
  return request<MCPServerStartResponse>(`/api/mcp-servers/${id}/start`, {
    method: 'POST',
  });
}

/**
 * POST /api/mcp-servers/:id/stop - Stop an MCP server
 */
export async function stopMCPServer(id: number, force: boolean = false): Promise<MCPServerStopResponse> {
  return request<MCPServerStopResponse>(`/api/mcp-servers/${id}/stop`, {
    method: 'POST',
    body: JSON.stringify({force}),
  });
}

/**
 * POST /api/mcp-servers/:id/restart - Restart an MCP server
 */
export async function restartMCPServer(id: number): Promise<MCPServerRestartResponse> {
  return request<MCPServerRestartResponse>(`/api/mcp-servers/${id}/restart`, {
    method: 'POST',
  });
}

/**
 * GET /api/mcp-servers/:id/status - Get server status
 */
export async function getMCPServerStatus(id: number): Promise<MCPServerStatusResponse> {
  return request<MCPServerStatusResponse>(`/api/mcp-servers/${id}/status`);
}

/**
 * GET /api/mcp-servers/:id/health - Health check
 */
export async function getMCPServerHealth(id: number): Promise<MCPServerHealthResponse> {
  return request<MCPServerHealthResponse>(`/api/mcp-servers/${id}/health`);
}

/**
 * POST /api/mcp-servers/:id/test - Test connectivity
 */
export async function testMCPServerConnection(id: number): Promise<MCPServerTestResponse> {
  return request<MCPServerTestResponse>(`/api/mcp-servers/${id}/test`, {
    method: 'POST',
    noContentType: true,
  });
}

/**
 * GET /api/mcp-servers/templates - Get server templates
 */
export async function getMCPServerTemplates(): Promise<MCPServerTemplatesResponse> {
  return request<MCPServerTemplatesResponse>('/api/mcp-servers/templates');
}
