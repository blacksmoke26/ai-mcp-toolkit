/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/schemas
 * @description Centralized Zod validation schemas for all WebSocket events.
 *
 * This module extracts all Zod schemas from `events.ts` into a single,
 * well-organized file. Each schema validates the payload for a specific
 * event type. This keeps `events.ts` focused on event metadata while
 * schemas are maintained here.
 *
 * ## Organization
 *
 * - **Core Schemas** — Ping/pong, auth, reconnect
 * - **MCP Schemas** — Tools, resources, prompts, logging
 * - **Chat Schemas** — Send, stream, history, conversations
 * - **Tool Schemas** — Call, result, error
 * - **Provider Schemas** — List, health, switch
 * - **Simulation Schemas** — Scenarios, run, mocks
 * - **Metrics Schemas** — Live control, fetch, tick
 * - **System Schemas** — Health, info, shutdown
 * - **Notification Schemas** — Room/All broadcasts
 * - **Shared Schemas** — Generic request/response wrappers
 *
 * ## Usage Example
 *
 * ```typescript
 * import { ChatSendSchema, McpToolsCallSchema } from '@/websocket/schemas';
 *
 * // Validate a chat message payload
 * const result = ChatSendSchema.safeParse({
 *   message: 'Hello world',
 *   model: 'llama3.1',
 * });
 *
 * if (!result.success) {
 *   console.error('Invalid payload:', result.error.errors);
 * }
 * ```
 */

import {z} from 'zod';

// ════════════════════════════════════════════════════════════
// Core Event Schemas — Ping/Pong, Auth, Reconnect
// ════════════════════════════════════════════════════════════

/** Ping/pong event payload schema */
export const PingPongSchema = z.object({
  /** Client-provided timestamp for latency calculation */
  timestamp: z.number().positive().optional(),
  /** Server echo of the timestamp */
  echoed: z.number().positive().optional(),
});

/** Authentication event payload schema */
export const AuthSchema = z.object({
  /** Authentication token */
  token: z.string(),
  /** Authentication method */
  method: z.enum(['token', 'oauth', 'api-key']).optional(),
});

/** Reconnect request schema */
export const ReconnectSchema = z.object({
  /** Recommended interval between reconnect attempts */
  interval: z.number().positive().optional(),
  /** Maximum reconnect attempts (-1 for unlimited) */
  maxAttempts: z.number().int().min(-1).optional(),
});

// ════════════════════════════════════════════════════════════
// MCP Protocol Schemas — Tools, Resources, Prompts
// ════════════════════════════════════════════════════════════

/** MCP tools/list request schema */
export const McpToolsListSchema = z.object({
  /** Optional cursor for pagination */
  cursor: z.string().optional(),
  /** Filter tools by category */
  category: z.string().optional(),
});

/** MCP tools/call request schema */
export const McpToolsCallSchema = z.object({
  /** Tool name to invoke */
  name: z.string().min(1),
  /** Tool input arguments */
  arguments: z.record(z.unknown()).optional(),
});

/** MCP resources/list request schema */
export const McpResourcesListSchema = z.object({
  /** Optional cursor for pagination */
  cursor: z.string().optional(),
});

/** MCP resources/read request schema */
export const McpResourcesReadSchema = z.object({
  /** Resource URI to read */
  uri: z.string().min(1),
});

/** MCP prompts/list request schema */
export const McpPromptsListSchema = z.object({
  /** Optional cursor for pagination */
  cursor: z.string().optional(),
});

/** MCP prompts/get request schema */
export const McpPromptsGetSchema = z.object({
  /** Prompt name */
  name: z.string().min(1),
  /** Prompt argument values */
  arguments: z.record(z.string()).optional(),
});

/** MCP logging/setLevel request schema */
export const McpLoggingSetLevelSchema = z.object({
  /** Log level to set */
  level: z.enum(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency']),
});

// ════════════════════════════════════════════════════════════
// Chat Event Schemas — Send, Stream, History
// ════════════════════════════════════════════════════════════

/** Chat/send request schema */
export const ChatSendSchema = z.object({
  /** Message content */
  message: z.string().min(1),
  /** Optional conversation ID */
  conversationId: z.string().uuid().optional(),
  /** Optional provider name */
  provider: z.string().optional(),
  /** Optional model name */
  model: z.string().optional(),
  /** Optional temperature (0.0–2.0) */
  temperature: z.number().min(0).max(2).optional(),
  /** Optional max tokens */
  maxTokens: z.number().int().positive().optional(),
});

/** Chat/stream:start request schema */
export const ChatStreamStartSchema = z.object({
  /** Initial message to stream */
  message: z.string().min(1),
  /** Optional conversation ID */
  conversationId: z.string().uuid().optional(),
  /** Optional provider */
  provider: z.string().optional(),
  /** Optional model */
  model: z.string().optional(),
});

/** Chat/stream:chunk event payload schema */
export const ChatStreamChunkSchema = z.object({
  /** Content delta text */
  delta: z.string(),
  /** Optional tool call info */
  toolCall: z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.string(),
  }).optional(),
  /** Whether this is the final chunk */
  done: z.boolean().optional(),
  /** Optional stream identifier */
  streamId: z.string().optional(),
  /** Optional conversation ID */
  conversationId: z.string().uuid().optional(),
});

/** Chat/stream:error event payload schema */
export const ChatStreamErrorSchema = z.object({
  /** Error details */
  error: z.object({
    code: z.number(),
    message: z.string(),
    conversationId: z.string().uuid().optional(),
  }),
});

/** Chat/history request schema */
export const ChatHistorySchema = z.object({
  /** Conversation ID to retrieve history for */
  conversationId: z.string().uuid(),
  /** Maximum number of messages to return */
  limit: z.number().int().positive().default(50),
  /** Offset for pagination */
  offset: z.number().int().nonnegative().default(0),
});

/** Chat/conversations:list request schema */
export const ChatConversationsListSchema = z.object({
  /** Maximum number of conversations to return */
  limit: z.number().int().positive().default(20),
  /** Offset for pagination */
  offset: z.number().int().nonnegative().default(0),
});

/** Chat/conversations:get request schema */
export const ChatConversationsGetSchema = z.object({
  /** Conversation ID to retrieve */
  conversationId: z.string().uuid(),
});

/** Chat/conversations:delete request schema */
export const ChatConversationsDeleteSchema = z.object({
  /** Conversation ID to delete */
  conversationId: z.string().uuid(),
});

// Chat stream control schemas
export const ChatStreamPauseSchema = z.object({
  /** Stream ID to pause (if not attached to a session) */
  streamId: z.string().optional(),
  /** Optional conversation ID */
  conversationId: z.string().uuid().optional(),
});

export const ChatStreamResumeSchema = ChatStreamPauseSchema;

// ════════════════════════════════════════════════════════════
// Tool Event Schemas — Direct Invocation
// ════════════════════════════════════════════════════════════

/** Tool/call request schema */
export const ToolCallSchema = z.object({
  /** Tool name */
  name: z.string().min(1),
  /** Tool input arguments */
  arguments: z.record(z.unknown()).optional(),
});

/** Tool/result event payload schema */
export const ToolResultSchema = z.object({
  /** Content blocks */
  content: z.array(z.object({
    type: z.enum(['text', 'image', 'resource']),
    text: z.string().optional(),
    data: z.string().optional(),
    mimeType: z.string().optional(),
    resource: z.object({
      uri: z.string(),
      name: z.string().optional(),
      mimeType: z.string().optional(),
      text: z.string().optional(),
      blob: z.string().optional(),
    }).optional(),
  })),
  /** Whether this represents an error */
  isError: z.boolean().optional(),
});

/** Tool/error event payload schema */
export const ToolErrorSchema = z.object({
  /** Tool name that failed */
  name: z.string(),
  /** Error details */
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
});

// ════════════════════════════════════════════════════════════
// Provider Event Schemas — LLM Providers
// ════════════════════════════════════════════════════════════

/** Provider/list response schema */
export const ProviderListSchema = z.object({
  /** Provider information array */
  providers: z.array(z.object({
    name: z.string(),
    type: z.string(),
    isDefault: z.boolean(),
    model: z.string(),
    status: z.enum(['healthy', 'unhealthy', 'unknown']),
    latencyMs: z.number().optional(),
  })),
});

/** Provider/health request schema */
export const ProviderHealthSchema = z.object({
  /** Optional provider name (if omitted, checks all) */
  name: z.string().optional(),
});

/** Provider/health response item schema */
export const ProviderHealthResultSchema = z.object({
  name: z.string(),
  status: z.enum(['healthy', 'unhealthy']),
  latencyMs: z.number().optional(),
});

/** Provider/switch request schema */
export const ProviderSwitchSchema = z.object({
  /** Provider name to switch to */
  name: z.string().min(1),
});

// Provider status change notification schema
export const ProviderStatusChangeSchema = z.object({
  name: z.string(),
  previousStatus: z.enum(['healthy', 'unhealthy', 'unknown']),
  newStatus: z.enum(['healthy', 'unhealthy', 'unknown']),
  isDefault: z.boolean().optional(),
});

// ════════════════════════════════════════════════════════════
// Simulation Event Schemas
// ════════════════════════════════════════════════════════════

/** Simulate/scenarios:list response schema */
export const SimulateScenariosListSchema = z.object({
  /** Available simulation scenarios */
  scenarios: z.array(z.object({
    name: z.string(),
    description: z.string(),
    steps: z.number(),
    hasMocks: z.boolean(),
  })),
  total: z.number(),
});

/** Simulate/run request schema */
export const SimulateRunSchema = z.object({
  /** Scenario name to run */
  name: z.string().min(1),
  /** Optional scenario description */
  description: z.string().optional(),
  /** Optional steps to run (overrides scenario default) */
  steps: z.array(z.object({
    name: z.string(),
    tool: z.string(),
    args: z.record(z.unknown()).optional(),
    expects: z.object({
      contains: z.string().optional(),
      notContains: z.string().optional(),
      hasError: z.boolean().optional(),
    }).optional(),
    description: z.string().optional(),
  })).min(1).optional(),
  /** Whether to set up mocks before running */
  setupMocks: z.boolean().optional(),
  /** Whether to clear mocks after running */
  cleanupMocks: z.boolean().optional(),
});

/** Simulate/progress event payload schema */
export const SimulateProgressSchema = z.object({
  /** Scenario name */
  name: z.string(),
  /** Current step number */
  currentStep: z.number(),
  /** Total number of steps */
  totalSteps: z.number(),
  /** Current status */
  status: z.enum(['running', 'passed', 'failed', 'skipped', 'paused']),
  /** Tool being executed */
  tool: z.string().optional(),
  /** Duration in milliseconds */
  durationMs: z.number().optional(),
});

/** Simulate/result event payload schema */
export const SimulateResultSchema = z.object({
  /** Scenario name */
  name: z.string(),
  /** Whether all steps passed */
  passed: z.boolean(),
  /** Total number of steps */
  totalSteps: z.number(),
  /** Number of steps that passed */
  passedSteps: z.number(),
  /** Number of steps that failed */
  failedSteps: z.number(),
  /** Total duration in milliseconds */
  durationMs: z.number(),
  /** Optional list of failed step errors */
  errors: z.array(z.object({
    step: z.number(),
    tool: z.string(),
    error: z.string(),
  })).optional(),
});

/** Simulate/mocks:list request schema */
export const SimulateMocksListSchema = z.object({
  /** Optional tool name to filter mocks */
  tool: z.string().optional(),
});

/** Simulate/mocks:list response schema */
export const SimulateMocksListResponseSchema = z.object({
  mocks: z.array(z.object({
    tool: z.string(),
    content: z.unknown(),
    isError: z.boolean().optional(),
    delayMs: z.number().optional(),
    failureRate: z.number().optional(),
  })),
  total: z.number(),
});

/** Simulate/mocks:set request schema */
export const SimulateMocksSetSchema = z.object({
  /** Tool name to mock */
  tool: z.string().min(1),
  /** Mock content */
  content: z.array(z.object({
    type: z.enum(['text', 'image', 'resource']),
    text: z.string().optional(),
  })).min(1),
  /** Whether the mock simulates an error */
  isError: z.boolean().optional(),
  /** Optional delay in milliseconds */
  delayMs: z.number().int().min(0).optional(),
  /** Optional failure rate (0.0–1.0) */
  failureRate: z.number().min(0).max(1).optional(),
});

/** Simulate/mocks:clear request schema */
export const SimulateMocksClearSchema = z.object({
  /** Optional tool name to clear (if omitted, clears all) */
  tool: z.string().optional(),
});

// Simulation control schemas
export const SimulatePauseSchema = z.object({
  /** Scenario name to pause */
  name: z.string().min(1),
});

export const SimulateResumeSchema = SimulatePauseSchema;

export const SimulateAbortSchema = z.object({
  /** Scenario name to abort */
  name: z.string().min(1),
  /** Optional reason for aborting */
  reason: z.string().optional(),
});

export const SimulateStatusSchema = z.object({
  /** Scenario name */
  name: z.string().min(1),
});

// ════════════════════════════════════════════════════════════
// Metrics Event Schemas
// ════════════════════════════════════════════════════════════

/** Metrics/live:start request schema */
export const MetricsLiveControlSchema = z.object({
  /** Stream interval in milliseconds */
  interval: z.number().int().positive().default(1000),
});

/** Metrics/live:tick event payload schema */
export const MetricsLiveTickSchema = z.object({
  /** Optional request correlation ID */
  requestId: z.string().optional(),
  /** Request statistics */
  requests: z.object({
    total: z.number(),
    perSecond: z.number(),
    active: z.number(),
  }),
  /** Latency percentiles */
  latencies: z.object({
    avg: z.number(),
    p50: z.number(),
    p95: z.number(),
    p99: z.number(),
  }),
  /** System information */
  system: z.object({
    memoryUsage: z.object({
      rss: z.number(),
      heapTotal: z.number(),
      heapUsed: z.number(),
    }),
    uptime: z.number(),
  }),
  /** Timestamp of this tick */
  timestamp: z.string(),
});

/** Metrics/fetch request schema */
export const MetricsFetchSchema = z.object({
  /** Optional metrics labels to filter */
  labels: z.array(z.string()).optional(),
});

// ════════════════════════════════════════════════════════════
// System Event Schemas
// ════════════════════════════════════════════════════════════

/** System/health request schema */
export const SystemHealthSchema = z.object({
  /** Whether to include verbose details */
  verbose: z.boolean().optional(),
});

/** System/health response schema */
export const SystemHealthResultSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  checks: z.record(z.object({
    status: z.enum(['healthy', 'unhealthy', 'unknown']),
    latencyMs: z.number().optional(),
  })),
  uptime: z.number(),
  timestamp: z.string(),
});

/** System/info request schema (no parameters) */
export const SystemInfoRequestSchema = z.object({});

/** System/info response schema */
export const SystemInfoResultSchema = z.object({
  name: z.string(),
  version: z.string(),
  protocol: z.string(),
  tools: z.number(),
  providers: z.array(z.string()),
  uptime: z.number(),
  memoryUsage: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
  }),
  platform: z.object({
    arch: z.string(),
    platform: z.string(),
    nodeVersion: z.string(),
  }),
  timestamp: z.string(),
});

/** System/shutdown request schema */
export const SystemShutdownSchema = z.object({
  /** Optional reason for shutdown */
  reason: z.string().optional(),
});

/** System/uptime request schema (no parameters) */
export const SystemUptimeSchema = z.object({});

/** System/uptime response schema */
export const SystemUptimeResultSchema = z.object({
  uptime: z.number(),
  uptimeHuman: z.string(),
  timestamp: z.string(),
});

/** System/version request schema (no parameters) */
export const SystemVersionSchema = z.object({});

/** System/version response schema */
export const SystemVersionResultSchema = z.object({
  name: z.string(),
  version: z.string(),
  protocol: z.string(),
  timestamp: z.string(),
});

// ════════════════════════════════════════════════════════════
// Notification Event Schemas
// ════════════════════════════════════════════════════════════

/** Notify/to:room request schema */
export const NotifyToRoomSchema = z.object({
  /** Target room name */
  room: z.string().min(1),
  /** Event name to broadcast */
  event: z.string().min(1),
  /** Optional event payload */
  payload: z.record(z.unknown()).optional(),
});

/** Notify/to:all request schema */
export const NotifyToAllSchema = z.object({
  /** Event name to broadcast */
  event: z.string().min(1),
  /** Optional event payload */
  payload: z.record(z.unknown()).optional(),
});

/** Notify/room_entered event payload schema */
export const NotifyRoomEnteredSchema = z.object({
  room: z.string(),
  clientId: z.string(),
  clientCount: z.number(),
});

/** Notify/room_exited event payload schema */
export const NotifyRoomExitedSchema = z.object({
  room: z.string(),
  clientId: z.string(),
  clientCount: z.number(),
});

/** Room join/leave request schema */
export const RoomControlSchema = z.object({
  /** Room name */
  room: z.string().min(1),
  /** Action: join or leave */
  action: z.enum(['join', 'leave']),
});

// Connection presence schemas
export const ConnectionCloseSchema = z.object({
  /** Optional close reason */
  reason: z.string().optional(),
  /** Whether to close immediately */
  immediate: z.boolean().optional(),
});

// ════════════════════════════════════════════════════════════
// Shared/Common Schemas
// ════════════════════════════════════════════════════════════

/** Generic client → server request wrapper schema */
export const ClientRequestSchema = z.object({
  /** Optional request ID for correlation */
  id: z.string().uuid().optional(),
  /** Event name */
  event: z.enum([
    'ws:connect', 'ws:disconnect', 'ws:error', 'ws:ping', 'ws:pong', 'ws:auth', 'ws:reconnect',
    'ws:room:control', 'ws:connection:close',
    'mcp:tools:list', 'mcp:tools:call',
    'mcp:resources:list', 'mcp:resources:read',
    'mcp:prompts:list', 'mcp:prompts:get', 'mcp:logging:set_level',
    'chat:send', 'chat:stream:start', 'chat:stream:pause', 'chat:stream:resume',
    'chat:history', 'chat:conversations:list',
    'chat:conversations:get', 'chat:conversations:delete',
    'tool:call',
    'provider:list', 'provider:health', 'provider:switch',
    'simulate:scenarios:list', 'simulate:run', 'simulate:pause', 'simulate:resume',
    'simulate:abort', 'simulate:status', 'simulate:mocks:list', 'simulate:mocks:set',
    'simulate:mocks:clear',
    'metrics:live:start', 'metrics:live:stop', 'metrics:fetch',
    'system:health', 'system:info', 'system:shutdown', 'system:uptime', 'system:version',
    'notify:to:room', 'notify:to:all',
    'request',
  ]),
  /** Event payload */
  payload: z.record(z.unknown()).optional(),
  /** Optional room to join */
  room: z.string().optional(),
  /** Optional authentication token */
  token: z.string().optional(),
});

/** Generic server → client response wrapper schema */
export const ServerResponseSchema = z.object({
  /** Correlated request ID */
  id: z.string().uuid().optional(),
  /** Event name */
  event: z.enum([
    'ws:connect', 'ws:disconnect', 'ws:error', 'ws:pong',
    'ws:room:control',
    'mcp:tools:list', 'mcp:tools:call', 'mcp:tools:list_changed',
    'mcp:resources:list', 'mcp:resources:read', 'mcp:resources:list_changed',
    'mcp:prompts:list', 'mcp:prompts:get',
    'chat:stream:chunk', 'chat:stream:done', 'chat:stream:error',
    'chat:history', 'chat:conversations:list', 'chat:conversations:get',
    'tool:result', 'tool:error',
    'provider:list', 'provider:health', 'provider:status:change',
    'simulate:scenarios:list', 'simulate:progress', 'simulate:result',
    'simulate:mocks:list',
    'metrics:live:tick',
    'system:health', 'system:info', 'system:uptime', 'system:version',
    'notify:room_entered', 'notify:room_exited',
    'request',
  ]),
  /** Response or notification payload */
  payload: z.record(z.unknown()).optional(),
});

// ════════════════════════════════════════════════════════════
// Export All Schemas
// ════════════════════════════════════════════════════════════

/** All schemas as a map for runtime lookup by event name */
export const EVENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Core
  'ws:ping': PingPongSchema,
  'ws:pong': PingPongSchema,
  'ws:auth': AuthSchema,
  'ws:reconnect': ReconnectSchema,
  'ws:room:control': RoomControlSchema,
  'ws:connection:close': ConnectionCloseSchema,

  // MCP
  'mcp:tools:list': McpToolsListSchema,
  'mcp:tools:call': McpToolsCallSchema,
  'mcp:resources:list': McpResourcesListSchema,
  'mcp:resources:read': McpResourcesReadSchema,
  'mcp:prompts:list': McpPromptsListSchema,
  'mcp:prompts:get': McpPromptsGetSchema,
  'mcp:logging:set_level': McpLoggingSetLevelSchema,

  // Chat
  'chat:send': ChatSendSchema,
  'chat:stream:start': ChatStreamStartSchema,
  'chat:stream:pause': ChatStreamPauseSchema,
  'chat:stream:resume': ChatStreamResumeSchema,
  'chat:history': ChatHistorySchema,
  'chat:conversations:list': ChatConversationsListSchema,
  'chat:conversations:get': ChatConversationsGetSchema,
  'chat:conversations:delete': ChatConversationsDeleteSchema,

  // Tool
  'tool:call': ToolCallSchema,

  // Provider
  'provider:list': ProviderListSchema,
  'provider:health': ProviderHealthSchema,
  'provider:switch': ProviderSwitchSchema,

  // Simulation
  'simulate:scenarios:list': SimulateScenariosListSchema,
  'simulate:run': SimulateRunSchema,
  'simulate:pause': SimulatePauseSchema,
  'simulate:resume': SimulateResumeSchema,
  'simulate:abort': SimulateAbortSchema,
  'simulate:status': SimulateStatusSchema,
  'simulate:mocks:list': SimulateMocksListSchema,
  'simulate:mocks:set': SimulateMocksSetSchema,
  'simulate:mocks:clear': SimulateMocksClearSchema,

  // Metrics
  'metrics:live:start': MetricsLiveControlSchema,
  'metrics:live:stop': MetricsLiveControlSchema,
  'metrics:fetch': MetricsFetchSchema,

  // System
  'system:health': SystemHealthSchema,
  'system:info': SystemInfoRequestSchema,
  'system:shutdown': SystemShutdownSchema,
  'system:uptime': SystemUptimeSchema,
  'system:version': SystemVersionSchema,

  // Notification
  'notify:to:room': NotifyToRoomSchema,
  'notify:to:all': NotifyToAllSchema,

  // Generic
  'request': ClientRequestSchema,
};

export default {
  // Core
  PingPongSchema,
  AuthSchema,
  ReconnectSchema,
  // MCP
  McpToolsListSchema,
  McpToolsCallSchema,
  McpResourcesListSchema,
  McpResourcesReadSchema,
  McpPromptsListSchema,
  McpPromptsGetSchema,
  McpLoggingSetLevelSchema,
  // Chat
  ChatSendSchema,
  ChatStreamStartSchema,
  ChatStreamChunkSchema,
  ChatStreamErrorSchema,
  ChatHistorySchema,
  ChatConversationsListSchema,
  ChatConversationsGetSchema,
  ChatConversationsDeleteSchema,
  ChatStreamPauseSchema,
  ChatStreamResumeSchema,
  // Tool
  ToolCallSchema,
  ToolResultSchema,
  ToolErrorSchema,
  // Provider
  ProviderListSchema,
  ProviderHealthSchema,
  ProviderHealthResultSchema,
  ProviderSwitchSchema,
  ProviderStatusChangeSchema,
  // Simulation
  SimulateScenariosListSchema,
  SimulateRunSchema,
  SimulateProgressSchema,
  SimulateResultSchema,
  SimulateMocksListSchema,
  SimulateMocksListResponseSchema,
  SimulateMocksSetSchema,
  SimulateMocksClearSchema,
  SimulatePauseSchema,
  SimulateResumeSchema,
  SimulateAbortSchema,
  SimulateStatusSchema,
  // Metrics
  MetricsLiveControlSchema,
  MetricsLiveTickSchema,
  MetricsFetchSchema,
  // System
  SystemHealthSchema,
  SystemHealthResultSchema,
  SystemInfoRequestSchema,
  SystemInfoResultSchema,
  SystemShutdownSchema,
  SystemUptimeSchema,
  SystemUptimeResultSchema,
  SystemVersionSchema,
  SystemVersionResultSchema,
  // Notification
  NotifyToRoomSchema,
  NotifyToAllSchema,
  NotifyRoomEnteredSchema,
  NotifyRoomExitedSchema,
  RoomControlSchema,
  ConnectionCloseSchema,
  // Shared
  ClientRequestSchema,
  ServerResponseSchema,
  // Schema map
  EVENT_SCHEMAS,
};
