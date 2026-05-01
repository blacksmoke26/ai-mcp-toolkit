/**
 * WebSocket System Type Definitions
 * Comprehensive types for all WebSocket events, connections, and UI state management
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import React from 'react';

// ============================================================================
// Connection States
// ============================================================================

/** Represents the current status of the WebSocket connection. */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/** Represents the direction of a message (sent, received, or system notification). */
export type MessageDirection = 'sent' | 'received' | 'notification';

/** Represents the direction of an event relative to the client (inbound, outbound, or system). */
export type EventDirection = 'inbound' | 'outbound' | 'system';

// ============================================================================
// WebSocket Room Definitions
// ============================================================================

/** Valid WebSocket room identifiers. */
export type WsRoom =
  | 'general'
  | 'mcp'
  | 'chat'
  | 'chat-stream'
  | 'providers'
  | 'simulate'
  | 'metrics'
  | 'admin';

/** A constant array containing all available WebSocket rooms. */
export const ALL_ROOMS: WsRoom[] = [
  'general',
  'mcp',
  'chat',
  'chat-stream',
  'providers',
  'simulate',
  'metrics',
  'admin',
];

// ============================================================================
// Event Categories
// ============================================================================

/** High-level categories for classifying WebSocket events. */
export type EventCategory =
  | 'CORE'
  | 'MCP'
  | 'CHAT'
  | 'TOOL'
  | 'PROVIDER'
  | 'SIMULATION'
  | 'METRICS'
  | 'SYSTEM'
  | 'NOTIFICATION'
  | 'GENERIC';

// ============================================================================
// Category Color Palette
// ============================================================================

/** Mapping of event categories to their representative hex colors. */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  CORE: '#3b82f6',
  MCP: '#8b5cf6',
  CHAT: '#10b981',
  TOOL: '#f59e0b',
  PROVIDER: '#06b6d4',
  SIMULATION: '#ef4444',
  METRICS: '#8b5cf6',
  SYSTEM: '#6b7280',
  NOTIFICATION: '#ec4899',
  GENERIC: '#a78bfa',
};

/** Mapping of event categories to UI badge variants (e.g., for shadcn/ui). */
export const CATEGORY_BADGE_VARIANTS: Record<EventCategory, string> = {
  CORE: 'info',
  MCP: 'default',
  CHAT: 'success',
  TOOL: 'warning',
  PROVIDER: 'info',
  SIMULATION: 'destructive',
  METRICS: 'default',
  SYSTEM: 'secondary',
  NOTIFICATION: 'warning',
  GENERIC: 'info',
};

/** Mapping of event categories to representative emojis. */
export const CATEGORY_EMOJI: Record<EventCategory, string> = {
  CORE: '🔌',
  MCP: '🤖',
  CHAT: '💬',
  TOOL: '🔧',
  PROVIDER: '🔗',
  SIMULATION: '🎭',
  METRICS: '📊',
  SYSTEM: '⚙️',
  NOTIFICATION: '🔔',
  GENERIC: '📦',
};

// ============================================================================
// Event Type Names (all 80+ events)
// ============================================================================

/** Events related to the WebSocket connection lifecycle. */
export type CoreEvent =
  | 'ws:connect'
  | 'ws:disconnect'
  | 'ws:error'
  | 'ws:ping'
  | 'ws:pong'
  | 'ws:auth'
  | 'ws:reconnect'
  | 'ws:room:control'
  | 'ws:connection:close';

/** Events related to the Model Context Protocol (MCP). */
export type McpEvent =
  | 'mcp:tools:list'
  | 'mcp:tools:call'
  | 'mcp:tools:list_changed'
  | 'mcp:resources:list'
  | 'mcp:resources:read'
  | 'mcp:resources:list_changed'
  | 'mcp:prompts:list'
  | 'mcp:prompts:get'
  | 'mcp:logging:set_level';

/** Events related to chat functionality. */
export type ChatEvent =
  | 'chat:send'
  | 'chat:stream:start'
  | 'chat:stream:chunk'
  | 'chat:stream:done'
  | 'chat:stream:error'
  | 'chat:stream:pause'
  | 'chat:stream:resume'
  | 'chat:history'
  | 'chat:conversations:list'
  | 'chat:conversations:get'
  | 'chat:conversations:delete';

/** Events related to tool execution. */
export type ToolEvent =
  | 'tool:call'
  | 'tool:result'
  | 'tool:error'
  | 'tool:list_changed';

/** Events related to LLM providers. */
export type ProviderEvent =
  | 'provider:list'
  | 'provider:health'
  | 'provider:status:change'
  | 'provider:switch';

/** Events related to simulation scenarios. */
export type SimulationEvent =
  | 'simulate:scenarios:list'
  | 'simulate:run'
  | 'simulate:progress'
  | 'simulate:result'
  | 'simulate:pause'
  | 'simulate:resume'
  | 'simulate:abort'
  | 'simulate:status'
  | 'simulate:mocks:list'
  | 'simulate:mocks:set'
  | 'simulate:mocks:clear';

/** Events related to system metrics. */
export type MetricsEvent =
  | 'metrics:live:start'
  | 'metrics:live:tick'
  | 'metrics:live:stop'
  | 'metrics:fetch';

/** Events related to system status and information. */
export type SystemEvent =
  | 'system:health'
  | 'system:info'
  | 'system:shutdown'
  | 'system:uptime'
  | 'system:version';

/** Events related to notifications. */
export type NotificationEvent =
  | 'notify:to:room'
  | 'notify:to:all'
  | 'notify:room_entered'
  | 'notify:room_exited';

/** Generic request event type. */
export type GenericEvent = 'request';

/** Union type of all possible WebSocket event types. */
export type WsEventType =
  | CoreEvent
  | McpEvent
  | ChatEvent
  | ToolEvent
  | ProviderEvent
  | SimulationEvent
  | MetricsEvent
  | SystemEvent
  | NotificationEvent
  | GenericEvent;

// ============================================================================
// Event Category Mapping
// ============================================================================

/**
 * Determines the category of an event based on its type string prefix.
 * @param type - The event type string.
 * @returns The corresponding EventCategory.
 */
export function getEventCategory(type: WsEventType): EventCategory {
  if (type.startsWith('ws:')) return 'CORE';
  if (type.startsWith('mcp:')) return 'MCP';
  if (type.startsWith('chat:')) return 'CHAT';
  if (type.startsWith('tool:')) return 'TOOL';
  if (type.startsWith('provider:')) return 'PROVIDER';
  if (type.startsWith('simulate:')) return 'SIMULATION';
  if (type.startsWith('metrics:')) return 'METRICS';
  if (type.startsWith('system:')) return 'SYSTEM';
  if (type.startsWith('notify:')) return 'NOTIFICATION';
  return 'GENERIC';
}

// ============================================================================
// WebSocket Message Structure
// ============================================================================

/** Standard header included in every WebSocket message. */
export interface WsMessageHeader {
  /** Unique message ID for tracking and correlation */
  id: string;
  /** Event type identifier */
  type: WsEventType;
  /** Source room */
  room?: WsRoom;
  /** Target room (for broadcast messages) */
  targetRoom?: WsRoom;
  /** Message priority level (1-10, default 5) */
  priority?: number;
  /** Timestamp in ISO format */
  timestamp: string;
  /** Sender client ID */
  clientId?: string;
  /** Whether this is a system/internal message */
  isSystem?: boolean;
  /** Sequence number for ordering */
  seq?: number;
}

/**
 * The complete payload structure for a WebSocket message.
 * @template T - The type of the data payload.
 */
export interface WsMessagePayload<T = unknown> {
  /** Standard header for every message */
  header: WsMessageHeader;
  /** Event-specific data payload */
  data: T;
  /** Optional error context */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Additional error details */
    details?: unknown;
  };
  /** Metadata attached to the message */
  meta?: {
    /** Request ID */
    requestId?: string;
    /** Correlation ID */
    correlationId?: string;
    /** Version */
    version?: string;
    /** Custom metadata key-value pairs */
    custom?: Record<string, unknown>;
  };
}

// ============================================================================
// Core Events Payloads
// ============================================================================

/**
 * Payload for the 'ws:connect' event.
 */
export interface WsConnectPayload {
  /** Protocol version string */
  protocol: string;
  /** Server version string */
  version: string;
  /** List of supported features */
  features: string[];
}

/**
 * Payload for the 'ws:disconnect' event.
 */
export interface WsDisconnectPayload {
  /** Reason for disconnection */
  reason: string;
  /** Close code */
  code?: number;
}

/**
 * Payload for the 'ws:error' event.
 */
export interface WsErrorPayload {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Stack trace if available */
  stack?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Payload for the 'ws:auth' event.
 */
export interface WsAuthPayload {
  /** Authentication token */
  token: string;
  /** Authentication method used */
  method: 'jwt' | 'api_key' | 'oauth2' | 'basic';
}

/**
 * Payload for the 'ws:reconnect' event.
 */
export interface WsReconnectPayload {
  /** Current attempt number */
  attempt: number;
  /** Maximum allowed attempts */
  maxAttempts: number;
  /** Delay before next attempt in ms */
  delay: number;
  /** Reason for reconnection */
  reason: string;
}

/**
 * Payload for the 'ws:room:control' event.
 */
export interface WsRoomControlPayload {
  /** Action to perform */
  action: 'join' | 'leave' | 'create' | 'destroy';
  /** Target room */
  room: WsRoom;
  /** Number of members in the room */
  memberCount?: number;
}

/**
 * Payload for the 'ws:ping' event.
 */
export interface WsPingPayload {
  /** Client timestamp */
  timestamp: string;
  /** Server timestamp (optional) */
  serverTime?: string;
}

/**
 * Payload for the 'ws:pong' event.
 */
export interface WsPongPayload {
  /** Server timestamp */
  serverTimestamp: string;
  /** Calculated latency in ms */
  latency: number;
}

/**
 * Payload for the 'ws:connection:close' event.
 */
export interface WsConnectionClosePayload {
  /** Close code */
  code: number;
  /** Close reason */
  reason: string;
}

// ============================================================================
// MCP Events Payloads
// ============================================================================

/**
 * Payload for the 'mcp:tools:list' event.
 */
export interface McpToolsListPayload {
  /** List of available tools */
  tools: {
    /** Tool name */
    name: string;
    /** Tool description */
    description: string;
    /** JSON Schema for parameters */
    parameters: {
      /** Parameter type */
      type: string;
      /** List of required parameters */
      required?: string[];
      /** Parameter properties */
      properties: Record<string, {
        /** Property type */
        type: string;
        /** Property description */
        description: string;
        /** Enum values if applicable */
        enum?: string[];
      }>;
    };
  }[];
  /** Total number of tools */
  total: number;
}

/**
 * Payload for the 'mcp:tools:call' event.
 */
export interface McpToolsCallPayload {
  /** Name of the tool to call */
  name: string;
  /** Arguments to pass to the tool */
  arguments?: Record<string, unknown>;
}

/**
 * Payload for the 'mcp:tools:list_changed' event.
 */
export interface McpToolsListChangedPayload {
  /** List of added tool names */
  added: string[];
  /** List of removed tool names */
  removed: string[];
  /** List of updated tool names */
  updated: string[];
}

/**
 * Payload for the 'mcp:resources:list' event.
 */
export interface McpResourcesListPayload {
  /** List of available resources */
  resources: {
    /** Resource URI */
    uri: string;
    /** Resource name */
    name: string;
    /** MIME type */
    mimeType?: string;
    /** Resource description */
    description?: string;
  }[];
  /** Total number of resources */
  total: number;
}

/**
 * Payload for the 'mcp:resources:read' event.
 */
export interface McpResourcesReadPayload {
  /** URI of the resource to read */
  uri: string;
}

/**
 * Payload for the 'mcp:resources:list_changed' event.
 */
export interface McpResourcesListChangedPayload {
  /** List of added resource URIs */
  added: string[];
  /** List of removed resource URIs */
  removed: string[];
  /** List of updated resource URIs */
  updated: string[];
}

/**
 * Payload for the 'mcp:prompts:list' event.
 */
export interface McpPromptsListPayload {
  /** List of available prompts */
  prompts: {
    /** Prompt name */
    name: string;
    /** Prompt description */
    description: string;
    /** Prompt arguments */
    arguments?: {
      /** Argument name */
      name: string;
      /** Whether argument is required */
      required: boolean;
      /** Argument description */
      description: string;
    }[];
  }[];
  /** Total number of prompts */
  total: number;
}

/**
 * Payload for the 'mcp:prompts:get' event.
 */
export interface McpPromptsGetPayload {
  /** Name of the prompt to get */
  name: string;
  /** Arguments for the prompt */
  arguments?: Record<string, string>;
}

/**
 * Payload for the 'mcp:logging:set_level' event.
 */
export interface McpLoggingSetLevelPayload {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Target scope for the log level */
  target?: string;
}

// ============================================================================
// Chat Events Payloads
// ============================================================================

/**
 * Payload for the 'chat:send' event.
 */
export interface ChatSendPayload {
  /** Message content */
  content: string;
  /** Conversation ID */
  conversationId?: string;
  /** List of attachments */
  attachments?: {
    /** Attachment type */
    type: string;
    /** Attachment data */
    data: unknown;
  }[];
}

/**
 * Payload for the 'chat:stream:start' event.
 */
export interface ChatStreamStartPayload {
  /** Conversation ID */
  conversationId: string;
  /** Message ID */
  messageId: string;
  /** Model used */
  model?: string;
  /** Provider used */
  provider?: string;
}

/**
 * Payload for the 'chat:stream:chunk' event.
 */
export interface ChatStreamChunkPayload {
  /** Message ID */
  messageId: string;
  /** Content chunk */
  content: string;
  /** Whether the message is partial */
  partial: boolean;
  /** Delta content (new text) */
  delta: string;
}

/**
 * Payload for the 'chat:stream:done' event.
 */
export interface ChatStreamDonePayload {
  /** Message ID */
  messageId: string;
  /** Token usage statistics */
  usage?: {
    /** Total tokens */
    tokens: number;
    /** Prompt tokens */
    promptTokens: number;
    /** Completion tokens */
    completionTokens: number;
  };
  /** Reason for stopping */
  stopReason?: string;
}

/** Payload for the 'chat:stream:error' event. */
export interface ChatStreamErrorPayload {
  /** Message ID */
  messageId: string;
  /** Error message */
  error: string;
  /** Whether the error is recoverable */
  recoverable?: boolean;
}

/** Payload for the 'chat:stream:pause' event. */
export interface ChatStreamPausePayload {
  /** Message ID */
  messageId: string;
}

/** Payload for the 'chat:stream:resume' event. */
export interface ChatStreamResumePayload {
  /** Message ID */
  messageId: string;
}

/** Payload for the 'chat:history' event. */
export interface ChatHistoryPayload {
  /** Conversation ID */
  conversationId?: string;
  /** Limit number of messages */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Payload for the 'chat:conversations:list' event. */
export interface ChatConversationsListPayload {
  /** Limit number of conversations */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: 'created_at' | 'updated_at';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/** Payload for the 'chat:conversations:get' event. */
export interface ChatConversationsGetPayload {
  /** Conversation ID */
  id: string;
}

/** Payload for the 'chat:conversations:delete' event. */
export interface ChatConversationsDeletePayload {
  /** Conversation ID */
  id: string;
}

// ============================================================================
// Tool Events Payloads
// ============================================================================

/** Payload for the 'tool:call' event. */
export interface ToolCallPayload {
  /** Tool name */
  name: string;
  /** Tool arguments */
  arguments: Record<string, unknown>;
  /** Request ID */
  requestId?: string;
}

/** Payload for the 'tool:result' event. */
export interface ToolResultPayload {
  /** Tool name */
  name: string;
  /** Request ID */
  requestId: string;
  /** Result data */
  result: unknown;
  /** Execution time in ms */
  executionTime: number;
}

/** Payload for the 'tool:error' event. */
export interface ToolErrorPayload {
  /** Tool name */
  name: string;
  /** Request ID */
  requestId: string;
  /** Error details */
  error: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Stack trace */
    stack?: string;
  };
}

/** Payload for the 'tool:list_changed' event. */
export interface ToolListChangedPayload {
  /** Added tool names */
  added: string[];
  /** Removed tool names */
  removed: string[];
  /** Updated tool names */
  updated: string[];
}

// ============================================================================
// Provider Events Payloads
// ============================================================================

/** Payload for the 'provider:list' event. */
export interface ProviderListPayload {
  /** List of providers */
  providers: {
    /** Provider ID */
    id: string;
    /** Provider name */
    name: string;
    /** Provider type */
    type: string;
    /** Provider status */
    status: 'online' | 'offline' | 'degraded' | 'unknown';
    /** Available models */
    models?: string[];
    /** Provider configuration */
    config?: Record<string, unknown>;
  }[];
  /** Total number of providers */
  total: number;
}

/** Payload for the 'provider:health' event. */
export interface ProviderHealthPayload {
  /** Provider ID */
  id: string;
  /** Provider name */
  name: string;
  /** Health status */
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  /** Latency in ms */
  latency: number;
  /** Health check results */
  checks: {
    /** Check name */
    name: string;
    /** Check status */
    status: 'pass' | 'fail';
    /** Check message */
    message?: string;
  }[];
  /** Last checked timestamp */
  lastChecked: string;
}

/** Payload for the 'provider:status:change' event. */
export interface ProviderStatusChangePayload {
  /** Provider ID */
  id: string;
  /** Provider name */
  name: string;
  /** Previous status */
  oldStatus: string;
  /** New status */
  newStatus: string;
  /** Timestamp of change */
  timestamp: string;
}

/**
 * Payload for the 'provider:switch' event.
 */
export interface ProviderSwitchPayload {
  /** Previous provider ID */
  from: string;
  /** New provider ID */
  to: string;
  /** Reason for switch */
  reason?: string;
}

// ============================================================================
// Simulation Events Payloads
// ============================================================================

/** Payload for the 'simulate:scenarios:list' event. */
export interface SimulateScenariosListPayload {
  /** List of scenarios */
  scenarios: {
    /** Scenario ID */
    id: string;
    /** Scenario name */
    name: string;
    /** Scenario description */
    description: string;
    /** Number of steps */
    steps: number;
    /** Estimated duration */
    duration?: string;
    /** Scenario status */
    status: 'pending' | 'running' | 'completed' | 'failed' | 'aborted';
  }[];
  /** Total number of scenarios */
  total: number;
}

/** Payload for the 'simulate:run' event. */
export interface SimulateRunPayload {
  /** Scenario ID */
  scenarioId: string;
  /** Simulation parameters */
  parameters?: Record<string, unknown>;
}

/** Payload for the 'simulate:progress' event. */
export interface SimulateProgressPayload {
  /** Scenario ID */
  scenarioId: string;
  /** Current step number */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Status string */
  status: string;
  /** Elapsed time in ms */
  elapsed?: number;
}

/** Payload for the 'simulate:result' event. */
export interface SimulateResultPayload {
  /** Scenario ID */
  scenarioId: string;
  /** Overall success status */
  success: boolean;
  /** Detailed results */
  results: {
    /** Step number */
    step: number;
    /** Step status */
    status: 'success' | 'failed' | 'skipped';
    /** Step duration in ms */
    duration: number;
    /** Step response */
    response?: unknown;
    /** Step error message */
    error?: string;
  }[];
  /** Summary statistics */
  summary: {
    /** Total steps */
    totalSteps: number;
    /** Number of successful steps */
    successCount: number;
    /** Number of failed steps */
    failedCount: number;
    /** Number of skipped steps */
    skippedCount: number;
    /** Total time in ms */
    totalTime: number;
  };
}

/** Payload for the 'simulate:pause' event. */
export interface SimulatePausePayload {
  /** Scenario ID */
  scenarioId: string;
}

/** Payload for the 'simulate:resume' event. */
export interface SimulateResumePayload {
  /** Scenario ID */
  scenarioId: string;
}

/** Payload for the 'simulate:abort' event. */
export interface SimulateAbortPayload {
  /** Scenario ID */
  scenarioId: string;
  /** Reason for aborting */
  reason?: string;
}

/** Payload for the 'simulate:status' event. */
export interface SimulateStatusPayload {
  /** Scenario ID */
  scenarioId: string;
  /** Status string */
  status: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step number */
  currentStep?: number;
}

/** Payload for the 'simulate:mocks:list' event. */
export interface SimulateMocksListPayload {
  /** List of mocks */
  mocks: {
    /** Mock ID */
    id: string;
    /** Mock name */
    name: string;
    /** Mock endpoint */
    endpoint: string;
    /** HTTP method */
    method: string;
    /** Mock status */
    status: 'active' | 'paused' | 'deleted';
    /** Creation timestamp */
    createdAt: string;
  }[];
  /** Total number of mocks */
  total: number;
}

/** Payload for the 'simulate:mocks:set' event. */
export interface SimulateMocksSetPayload {
  /** Mock ID (optional for new mocks) */
  mockId?: string;
  /** Mock name */
  name: string;
  /** Mock endpoint */
  endpoint: string;
  /** HTTP method */
  method: string;
  /** Mock response data */
  response: unknown;
  /** Artificial delay in ms */
  delay?: number;
}

/**
 * Payload for the 'simulate:mocks:clear' event.
 */
export interface SimulateMocksClearPayload {
  /** Specific Mock ID to clear */
  mockId?: string;
  /** Clear all mocks if true */
  all?: boolean;
}

// ============================================================================
// Metrics Events Payloads
// ============================================================================

/** Payload for the 'metrics:live:start' event. */
export interface MetricsLiveStartPayload {
  /** Interval in milliseconds */
  interval: number;
  /** List of metrics to track */
  metrics: string[];
}

/** Payload for the 'metrics:live:tick' event. */
export interface MetricsLiveTickPayload {
  /** Timestamp of the tick */
  timestamp: string;
  /** Metrics data */
  metrics: {
    /** Request metrics */
    requests: {
      /** Total requests */
      total: number;
      /** Active requests */
      active: number;
      /** Successful requests */
      success: number;
      /** Failed requests */
      failed: number;
      /** Latency percentiles */
      latency: {
        /** 50th percentile */
        p50: number;
        /** 95th percentile */
        p95: number;
        /** 99th percentile */
        p99: number;
        /** Average latency */
        average: number;
      };
    };
    /** Memory metrics */
    memory: {
      /** Resident Set Size */
      rss: number;
      /** Heap Used */
      heapUsed: number;
      /** Total Heap Size */
      heapTotal: number;
      /** External memory */
      external: number;
    };
    /** System metrics */
    system: {
      /** CPU usage */
      cpu: number;
      /** Load average */
      loadAvg: number[];
      /** System uptime */
      uptime: number;
    };
  };
}

/** Payload for the 'metrics:live:stop' event. */
export interface MetricsLiveStopPayload {
  /** Duration of streaming in ms */
  duration: number;
  /** Total metrics collected */
  metricsCollected: number;
}

/** Payload for the 'metrics:fetch' event. */
export interface MetricsFetchPayload {
  /** Type of metrics to fetch */
  type: 'requests' | 'latency' | 'memory' | 'system' | 'all';
  /** Start time (ISO string) */
  startTime: string;
  /** End time (ISO string) */
  endTime: string;
  /** Interval in ms */
  interval: number;
}

// ============================================================================
// System Events Payloads
// ============================================================================

/**
 * Payload for the 'system:health' event.
 */
export interface SystemHealthPayload {
  /** Overall health status */
  status: 'healthy' | 'unhealthy' | 'degraded';
  /** Uptime in seconds */
  uptime: number;
  /** System version */
  version: string;
  /** Environment name */
  environment: string;
  /** List of health checks */
  checks: {
    /** Check name */
    name: string;
    /** Check status */
    status: 'pass' | 'fail' | 'warn';
    /** Check message */
    message?: string;
  }[];
  /** Timestamp of check */
  timestamp: string;
}

/**
 * Payload for the 'system:info' event.
 */
export interface SystemInfoPayload {
  /** System name */
  name: string;
  /** System version */
  version: string;
  /** System description */
  description: string;
  /** List of features */
  features: string[];
  /** List of capabilities */
  capabilities: string[];
  /** Configuration object */
  config: Record<string, unknown>;
}

/**
 * Payload for the 'system:shutdown' event.
 */
export interface SystemShutdownPayload {
  /** Reason for shutdown */
  reason: string;
  /** Grace period in seconds */
  gracePeriod: number;
  /** Shutdown timestamp */
  timestamp: string;
}

/**
 * Payload for the 'system:uptime' event.
 */
export interface SystemUptimePayload {
  /** Uptime in seconds */
  uptime: number;
  /** Formatted uptime string */
  formatted: string;
  /** Start time (ISO string) */
  since: string;
}

/**
 * Payload for the 'system:version' event.
 */
export interface SystemVersionPayload {
  /** Version string */
  version: string;
  /** Build string */
  build: string;
  /** Git commit hash */
  commit?: string;
  /** Release date */
  releaseDate?: string;
}

// ============================================================================
// Notification Events Payloads
// ============================================================================

/** Payload for the 'notify:to:room' event. */
export interface NotifyToRoomPayload {
  /** Target room */
  room: WsRoom;
  /** Notification message */
  message: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Payload for the 'notify:to:all' event. */
export interface NotifyToAllPayload {
  /** Notification message */
  message: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Payload for the 'notify:room_entered' event. */
export interface NotifyRoomEnteredPayload {
  /** Room entered */
  room: WsRoom;
  /** User ID */
  userId: string;
  /** User name */
  userName?: string;
  /** Total member count */
  memberCount: number;
}

/** Payload for the 'notify:room_exited' event. */
export interface NotifyRoomExitedPayload {
  /** Room exited */
  room: WsRoom;
  /** User ID */
  userId: string;
  /** User name */
  userName?: string;
  /** Total member count */
  memberCount: number;
}

// ============================================================================
// All Payload Union Types
// ============================================================================

/** Union type of all possible WebSocket payload structures. */
export type WsPayload =
  | WsConnectPayload
  | WsDisconnectPayload
  | WsErrorPayload
  | WsAuthPayload
  | WsReconnectPayload
  | WsRoomControlPayload
  | WsPingPayload
  | WsPongPayload
  | WsConnectionClosePayload
  | McpToolsListPayload
  | McpToolsCallPayload
  | McpToolsListChangedPayload
  | McpResourcesListPayload
  | McpResourcesReadPayload
  | McpResourcesListChangedPayload
  | McpPromptsListPayload
  | McpPromptsGetPayload
  | McpLoggingSetLevelPayload
  | ChatSendPayload
  | ChatStreamStartPayload
  | ChatStreamChunkPayload
  | ChatStreamDonePayload
  | ChatStreamErrorPayload
  | ChatStreamPausePayload
  | ChatStreamResumePayload
  | ChatHistoryPayload
  | ChatConversationsListPayload
  | ChatConversationsGetPayload
  | ChatConversationsDeletePayload
  | ToolCallPayload
  | ToolResultPayload
  | ToolErrorPayload
  | ToolListChangedPayload
  | ProviderListPayload
  | ProviderHealthPayload
  | ProviderStatusChangePayload
  | ProviderSwitchPayload
  | SimulateScenariosListPayload
  | SimulateRunPayload
  | SimulateProgressPayload
  | SimulateResultPayload
  | SimulatePausePayload
  | SimulateResumePayload
  | SimulateAbortPayload
  | SimulateStatusPayload
  | SimulateMocksListPayload
  | SimulateMocksSetPayload
  | SimulateMocksClearPayload
  | MetricsLiveStartPayload
  | MetricsLiveTickPayload
  | MetricsLiveStopPayload
  | MetricsFetchPayload
  | SystemHealthPayload
  | SystemInfoPayload
  | SystemShutdownPayload
  | SystemUptimePayload
  | SystemVersionPayload
  | NotifyToRoomPayload
  | NotifyToAllPayload
  | NotifyRoomEnteredPayload
  | NotifyRoomExitedPayload
  | Record<string, unknown>;

// ============================================================================
// Event Log Entry
// ============================================================================

export interface EventLogEntry {
  /** Unique ID for this log entry */
  id: string;
  /** Full message object */
  message: WsMessagePayload;
  /** The event type string */
  type: WsEventType;
  /** Event category (auto-derived from type) */
  category: EventCategory;
  /** Direction of the event */
  direction: EventDirection;
  /** Whether this event was highlighted */
  highlighted: boolean;
  /** Timestamp when the event was received/queued */
  loggedAt: string;
  /** Optional raw JSON string */
  rawJson?: string;
}

// ============================================================================
// WebSocket Connection State
// ============================================================================

export interface WsConnectionState {
  /** Current connection status */
  status: ConnectionStatus;
  /** WebSocket instance URL */
  url: string;
  /** Current active rooms */
  rooms: Set<WsRoom>;
  /** Number of connected clients */
  connectedClients: number;
  /** Last ping timestamp */
  lastPing: number | null;
  /** Last pong timestamp */
  lastPong: number | null;
  /** Last measured latency in ms */
  latency: number;
  /** Authentication status */
  isAuthenticated: boolean;
  /** Auth token */
  authToken: string | null;
  /** Reconnection attempts */
  reconnectAttempts: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Reconnection delay in ms */
  reconnectDelay: number;
  /** Message queue for offline messages */
  messageQueue: WsMessagePayload[];
  /** Last error message */
  lastError: string | null;
  /** Connected client IDs */
  clientIds: Set<string>;
  /** Server metadata */
  /**
   * Metadata about the connected WebSocket server, including its name, version, supported features, and current uptime.
   * This value is `null` when the connection is not established or server metadata is unavailable.
   */
  serverMeta: {
    /** Human-readable name of the server */
    name: string;
    /** Server version string (e.g., "1.0.0") */
    version: string;
    /** List of supported protocol features or capabilities */
    features: string[];
    /** Server uptime in seconds */
    uptime: number;
  } | null;
}

// ============================================================================
// WebSocket Hook Return Type
// ============================================================================

export interface UseWebSocketReturn {
  /** Connection state */
  state: WsConnectionState;
  /** Connect to WebSocket server */
  connect(): void;
  /** Disconnect from WebSocket server */
  disconnect(code?: number, reason?: string): void;
  /** Send a message to a room or all */
  send(type: WsEventType, payload: WsPayload, room?: WsRoom): void;
  /** Send to specific room */
  sendToRoom(type: WsEventType, payload: WsPayload, room: WsRoom): void;
  /** Send to all rooms */
  sendToAll(type: WsEventType, payload: WsPayload): void;
  /** Join a room */
  joinRoom(room: WsRoom): void;
  /** Leave a room */
  leaveRoom(room: WsRoom): void;
  /** Leave all rooms */
  leaveAllRooms(): void;
  /** Authenticate the connection */
  authenticate(token: string, method?: WsAuthPayload['method']): void;
  /** Ping the server */
  ping(): number | null;
  /** Check if connected */
  isConnected: boolean;
  /** Check if connecting */
  isConnecting: boolean;
  /** Check if disconnected */
  /** Indicates whether the WebSocket connection is in a disconnected state. */
  isDisconnected: boolean;
  /** Array of all logged WebSocket event entries. */
  eventLog: EventLogEntry[];
  /** Version counter to signal eventLog changes to consumers without triggering cascade re-renders. */
  eventLogVersion: number;
  /** Array of events filtered based on current filter state. */
  filteredEvents: EventLogEntry[];
  /** The current state of all active event filters. */
  filters: EventFiltersState;
  /** React state setter function for updating the event filters state. */
  setFilters: React.Dispatch<React.SetStateAction<EventFiltersState>>;
  /** Clears the current event log history. */
  clearEventLog(): void;
  /** Forces an immediate reconnection attempt to the WebSocket server. */
  forceReconnect(): void;
  /** Updates the WebSocket server URL. */
  updateUrl(newUrl: string): void;
  /** Flushes any queued messages currently waiting for connection. */
  flushMessageQueue(): void;
  /**
   * Subscribes a callback to be invoked when a specific event type is logged.
   * @param type - The specific WebSocket event type to listen for.
   * @param callback - The function to execute upon receiving the event.
   * @returns A function that, when called, unsubscribes the callback.
   */
  subscribe: (type: WsEventType, callback: (entry: EventLogEntry) => void) => () => void;
  /**
   * Unsubscribes a callback from receiving specific event types.
   * @param type - The specific WebSocket event type to stop listening for.
   * @param callback - The callback function previously registered.
   */
  unsubscribe: (type: WsEventType, callback: (entry: EventLogEntry) => void) => void;
  /** A mutable reference to the current connection status, kept in sync with state. */
  isConnectedRef: React.RefObject<boolean>;
  /** Aggregated dashboard statistics for monitoring system health and activity. */
  dashboardStats: {
    /** The number of currently connected clients. */
    connectedClients: number;
    /** The number of rooms currently active for the local client. */
    activeRooms: number;
    /** The total number of available rooms. */
    totalRooms: number;
    /** The calculated rate of events per second. */
    eventsPerSecond: number;
    /** The average latency of the connection in milliseconds. */
    averageLatency: number;
    /** The total count of events processed since connection or reset. */
    totalEvents: number;
    /** The number of messages currently queued for delivery. */
    queuedMessages: number;
    /** Whether the current WebSocket connection is authenticated. */
    isAuthenticated: boolean;
    /** The server's current uptime in seconds. */
    serverUptime: number;
    /** A human-readable formatted string of the server's uptime. */
    formattedUptime: string;
  };
  /**
   * Formats a duration in seconds into a human-readable string.
   * @param seconds - The duration in seconds to format.
   * @returns A formatted string representation of the uptime.
   */
  formatUptime(seconds: number): string;
}

// ============================================================================
// Context Provider Props
// ============================================================================

export interface WebSocketContextProviderProps {
  children: React.ReactNode;
  /** WebSocket server URL */
  wsUrl?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
  /** Max reconnect attempts */
  maxReconnectAttempts?: number;
  /** WebSocket ping interval in ms */
  pingInterval?: number;
  /** Auth token for automatic auth */
  authToken?: string;
  /** Initial rooms to join */
  initialRooms?: WsRoom[];
  /** Whether to queue messages while disconnected */
  queueMessages?: boolean;
  /** Callback on connect */
  onConnect?(state: WsConnectionState): void;
  /** Callback on disconnect */
  onDisconnect?(reason: string): void;
  /** Callback on error */
  onError?(error: WsErrorPayload): void;
  /** Callback on message */
  onMessage?(entry: EventLogEntry): void;
  /** Callback on auth status change */
  onAuthChange?(authenticated: boolean): void;
  /** Callback on room change */
  onRoomChange?(rooms: WsRoom[]): void;
}

// ============================================================================
// Event Simulator Types
// ============================================================================

export interface SimulatedEventDefinition {
  /** Unique identifier for this event definition */
  id: string;
  /** Event type name */
  type: WsEventType;
  /** Event category */
  category: EventCategory;
  /** Human-readable name */
  label: string;
  /** Description of the event */
  description: string;
  /** Default payload template */
  defaultPayload: any;
  /** Required fields for this event */
  requiredFields: string[];
  /** Whether this event can be simulated */
  simulatable: boolean;
  /** Icon or emoji representation */
  icon?: string;
}

export interface SimulatedEventHistoryEntry {
  /** Unique history entry ID */
  id: string;
  /** The event that was simulated */
  definition: SimulatedEventDefinition;
  /** Payload used for simulation */
  payload: any;
  /** Whether simulation was successful */
  success: boolean;
  /** Response if available */
  response?: unknown;
  /** Timestamp of simulation */
  timestamp: string;
  /** Duration of simulation in ms */
  duration: number;
}

export interface EventCategoryGroup {
  /** Category name */
  category: EventCategory;
  /** Category color */
  color: string;
  /** Emoji for the category */
  emoji: string;
  /** Events in this category */
  events: SimulatedEventDefinition[];
}

// ============================================================================
// Chat System Types
// ============================================================================

export interface ChatMessageItem {
  /** Unique message ID */
  id: string;
  /** Message content */
  content: string;
  /** Whether this is a system message */
  isSystem: boolean;
  /** Sender info */
  /** Information about the sender of the message. */
  sender: {
    /** Unique identifier for the sender. */
    id: string;
    /** Human-readable name of the sender. */
    name: string;
    /** Role of the sender in the conversation. */
    role: 'user' | 'assistant' | 'system' | 'tool';
    /** Optional URL to the sender's avatar image. */
    avatar?: string;
  };
  /** ISO 8601 timestamp indicating when the message was sent. */
  timestamp: string;
  /** Optional list of tool calls contained within this message. */
  toolCalls?: {
    /** Unique identifier for the tool call. */
    id: string;
    /** Name of the tool being called. */
    name: string;
    /** Arguments passed to the tool. */
    arguments: Record<string, unknown>;
    /** Optional result from the tool execution. */
    result?: unknown;
  }[];
  /** Indicates if the message content is currently being streamed in real-time. */
  isStreaming: boolean;
  /** Indicates if the message content is partial (still being received). */
  isPartial: boolean;
  /** Optional list of attachments included in the message. */
  attachments?: {
    /** MIME type or type identifier of the attachment. */
    type: string;
    /** Optional filename of the attachment. */
    name?: string;
    /** Optional URL to the attachment resource. */
    url?: string;
  }[];
}

export interface ChatConversation {
  /** Conversation ID */
  id: string;
  /** Conversation title */
  title: string;
  /** Messages in the conversation */
  messages: ChatMessageItem[];
  /** Current active message (for streaming) */
  activeMessage?: ChatMessageItem;
  /** Model used for this conversation */
  model?: string;
  /** Provider used */
  provider?: string;
  /** Whether streaming is in progress */
  isStreaming: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
  /** Message count */
  messageCount: number;
  /** Stream control state */
  streamState: 'active' | 'paused' | 'stopped' | 'error';
}
/**
 * Information about a chat or LLM provider.
 * Used to display provider status, capabilities, and metadata in the UI.
 */
export interface ChatProviderInfo {
  /** Unique identifier for the provider */
  id: string;
  /** Human-readable name of the provider */
  name: string;
  /** Type of the provider (e.g., 'openai', 'anthropic', 'ollama') */
  type: string;
  /** Current operational status of the provider */
  status: 'online' | 'offline' | 'degraded';
  /** List of model identifiers supported by this provider */
  models: string[];
}

// ============================================================================
// Metrics Panel Types
// ============================================================================

/**
 * A single data point collected during metrics streaming.
 * Contains aggregated request, memory, and system metrics at a specific timestamp.
 */
export interface MetricsDataPoint {
  /** ISO timestamp when the data point was recorded */
  timestamp: string;
  /** Numeric time value (e.g., Unix timestamp or relative offset) */
  time: number;
  /** Aggregated request metrics */
  requests: {
    /** Total number of requests processed */
    total: number;
    /** Number of currently active/in-flight requests */
    active: number;
    /** Number of successfully processed requests */
    success: number;
    /** Number of failed requests */
    failed: number;
    /** Latency percentiles and average */
    latency: {
      /** 50th percentile latency in milliseconds */
      p50: number;
      /** 95th percentile latency in milliseconds */
      p95: number;
      /** 99th percentile latency in milliseconds */
      p99: number;
      /** Average latency in milliseconds */
      average: number;
    };
  };
  /** Memory usage metrics */
  memory: {
    /** Resident Set Size (RSS) in bytes */
    rss: number;
    /** V8 heap used size in bytes */
    heapUsed: number;
    /** V8 heap total size in bytes */
    heapTotal: number;
    /** External memory usage (e.g., buffer objects) in bytes */
    external: number;
  };
  /** System-level metrics */
  system: {
    /** CPU usage percentage (0-100) */
    cpu: number;
    /** System load averages (typically 1, 5, 15 minutes) */
    loadAvg: number[];
    /** System uptime in seconds */
    uptime: number;
  };
}

/**
 * State management for the live metrics streaming feature.
 * Tracks the current status, configuration, and collected data points.
 */
export interface MetricsLiveStreamState {
  /** Whether the live stream is currently active */
  isActive: boolean;
  /** Interval in milliseconds between data collection ticks */
  interval: number;
  /** Array of collected data points, typically limited by maxDataPoints */
  dataPoints: MetricsDataPoint[];
  /** Maximum number of data points to retain in memory */
  maxDataPoints: number;
  /** ISO timestamp of the last tick, or null if no ticks have occurred */
  lastTick: string | null;
  /** ISO timestamp when the stream started, or null if not started */
  startTime: string | null;
  /** Total number of data points collected so far */
  totalPointsCollected: number;
}

/**
 * Represents a gauge widget state for displaying a single numerical metric.
 */
export interface MetricsGaugeState {
  /** Human-readable label for the gauge */
  label: string;
  /** Current numerical value of the metric */
  value: number;
  /** Maximum expected value for scaling the gauge */
  max: number;
  /** Unit of measurement (e.g., 'ms', '%', 'MB') */
  unit: string;
  /** Color code for visual representation (e.g., hex or CSS color) */
  color: string;
}

/**
 * Represents a trend line for historical metric visualization.
 */
export interface MetricsTrend {
  /** Human-readable name of the metric being tracked */
  name: string;
  /** Historical numerical values for the trend */
  values: number[];
  /** Color code for the trend line */
  color: string;
  /** Unit of measurement for the values */
  unit: string;
}

// ============================================================================
// Provider Panel Types
// ============================================================================
/**
 * Comprehensive information about the current status of a specific LLM provider.
 * This interface aggregates operational health, connectivity, and configuration details.
 */
export interface ProviderStatusInfo {
  /** Unique identifier for the provider */
  id: string;
  /** Human-readable name of the provider */
  name: string;
  /** Technical type or slug of the provider (e.g., 'openai', 'anthropic') */
  type: string;
  /**
   * Operational connectivity status of the provider.
   * - 'online': Fully operational
   * - 'offline': Unreachable
   * - 'degraded': Partially functional
   * - 'unknown': Status could not be determined
   */
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  /**
   * Health check result status of the provider.
   * - 'healthy': All checks passed
   * - 'unhealthy': Critical checks failed
   * - 'degraded': Minor issues detected
   * - 'unknown': No health data available
   */
  health: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  /** Current response latency in milliseconds */
  latency: number;
  /** List of model identifiers supported by this provider */
  models: string[];
  /** ISO 8601 timestamp of the last health check performed */
  lastChecked: string;
  /** Indicates if this provider is the default selection for the client */
  isDefault: boolean;
  /** Optional provider-specific configuration settings */
  config?: Record<string, unknown>;
}

/**
 * Detailed result from a specific health check execution for a provider.
 * Contains granular check statuses and latency measurements.
 */
export interface ProviderHealthCheckResult {
  /** Unique identifier of the provider being checked */
  providerId: string;
  /** Human-readable name of the provider being checked */
  providerName: string;
  /**
   * Overall health status derived from individual checks.
   * - 'healthy': All sub-checks passed
   * - 'unhealthy': Critical sub-checks failed
   * - 'degraded': Some sub-checks failed or warned
   * - 'checking': Health check is currently in progress
   * - 'unknown': Status could not be determined
   */
  status: 'healthy' | 'unhealthy' | 'degraded' | 'checking' | 'unknown';
  /** Response latency in milliseconds */
  latency: number;
  /** Array of individual health check results */
  checks: Array<{
    /** Name or identifier of the specific health check */
    name: string;
    /**
     * Status of the individual check.
     * - 'pass': Check succeeded
     * - 'fail': Check failed
     * - 'unknown': Check status is undetermined
     */
    status: 'pass' | 'fail' | 'unknown';
    /** Optional message providing details about the check result */
    message?: string;
  }>;
  /** ISO 8601 timestamp when this health check was completed */
  checkedAt: string;
}

/**
 * Record of a provider switch event, tracking history for auditing or debugging.
 */
export interface ProviderSwitchHistory {
  /** Unique identifier of the previous provider */
  from: string;
  /** Unique identifier of the new provider */
  to: string;
  /** Human-readable reason for the switch (e.g., 'manual', 'error_recovery') */
  reason: string;
  /** ISO 8601 timestamp when the switch occurred */
  timestamp: string;
}

// ============================================================================
// Toast Notification Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'system';

export interface ToastMessage {
  /** Unique toast ID */
  id: string;
  /** Toast type */
  type: ToastType;
  /** Toast title */
  title: string;
  /** Toast description */
  description: string;
  /** Auto-dismiss timeout in ms */
  duration: number;
  /** Whether it's dismissible */
  dismissible: boolean;
  /** Timestamp of creation */
  createdAt: string;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  /** Default duration for toasts */
  defaultDuration?: number;
  /** Maximum number of toasts to display */
  maxToasts?: number;
}

// ============================================================================
// Dashboard Stats Types
// ============================================================================

export interface DashboardStats {
  /** Total connected clients */
  connectedClients: number;
  /** Active rooms */
  activeRooms: number;
  /** Total rooms */
  totalRooms: number;
  /** Events per second */
  eventsPerSecond: number;
  /** Average latency in ms */
  averageLatency: number;
  /** Total events processed */
  totalEvents: number;
  /** Messages in queue */
  queuedMessages: number;
  /** Authentication status */
  isAuthenticated: boolean;
  /** Server uptime in seconds */
  serverUptime: number;
  /** Formatted uptime string */
  formattedUptime: string;
}

/**
 * Represents a quick action available in the WebSocket dashboard UI.
 * These actions allow users to quickly perform common operations like connecting,
 * sending messages, or managing rooms.
 */
export interface QuickActionDefinition {
  /** Unique identifier for this quick action. */
  id: string;
  /** Human-readable label displayed on the action button. */
  label: string;
  /** Detailed description of what this action does. */
  description: string;
  /** Icon identifier (e.g., emoji or icon class name) for visual representation. */
  icon: string;
  /**
   * The type of operation this action performs.
   * Determines which underlying WebSocket hook method is invoked.
   */
  type: 'connect' | 'disconnect' | 'ping' | 'auth' | 'join' | 'send' | 'reset' | 'health';
  /**
   * Optional payload data to be sent with the action.
   * Structure depends on the action type.
   */
  payload?: Record<string, unknown>;
  /**
   * Indicates whether a WebSocket connection is required to execute this action.
   * If true, the action is disabled while disconnected.
   */
  requiresConnection?: boolean;
}

// ============================================================================
// Room Info Types
// ============================================================================

/**
 * Represents metadata and state information for a specific WebSocket room.
 * Used for displaying room details in the UI.
 */
export interface RoomInfo {
  /** The room identifier key corresponding to WsRoom type. */
  room: WsRoom;
  /** Human-readable name of the room. */
  name: string;
  /** Brief description of the room's purpose. */
  description: string;
  /** Current number of members connected to this room. */
  memberCount: number;
  /** Indicates whether the local client has joined this room. */
  isActive: boolean;
  /** ISO timestamp when the client joined this room, or null if not joined. */
  joinedAt: string | null;
}

export const ROOM_INFO_MAP: Record<WsRoom, { name: string; description: string }> = {
  general: {
    name: 'General',
    description: 'General purpose messaging room',
  },
  mcp: {
    name: 'MCP Protocol',
    description: 'MCP protocol events and commands',
  },
  chat: {
    name: 'Chat',
    description: 'Chat messages and conversations',
  },
  'chat-stream': {
    name: 'Chat Stream',
    description: 'Real-time chat streaming events',
  },
  providers: {
    name: 'Providers',
    description: 'LLM provider management events',
  },
  simulate: {
    name: 'Simulation',
    description: 'Simulation scenario events',
  },
  metrics: {
    name: 'Metrics',
    description: 'Live metrics streaming events',
  },
  admin: {
    name: 'Admin',
    description: 'Administrative and system events',
  },
};

// ============================================================================
// Event Filter Types
// ============================================================================

export interface EventFilter {
  /** Filter by event type */
  type?: string;
  /** Filter by event category */
  category?: EventCategory | 'all';
  /** Filter by direction */
  direction?: EventDirection | 'all';
  /** Filter by room */
  room?: WsRoom | 'all';
  /** Search term */
  searchTerm?: string;
  /** Filter by time range (minutes ago) */
  timeRange?: number;
}

/**
 * Represents the current state of filters applied to the WebSocket event log.
 * Each property corresponds to a specific filter criterion used to narrow down
 * the set of displayed events.
 */
export interface EventFiltersState {
  /**
   * The specific event type string to filter by.
   * If empty or undefined, no type filtering is applied.
   */
  type: string;

  /**
   * The event category to filter by.
   * Use 'all' to include events from all categories.
   */
  category: EventCategory | 'all';

  /**
   * The direction of the event (inbound/outbound) to filter by.
   * Use 'all' to include events from all directions.
   */
  direction: EventDirection | 'all';

  /**
   * The specific WebSocket room to filter by.
   * Use 'all' to include events from all rooms.
   */
  room: WsRoom | 'all';

  /**
   * A substring used for searching within event details or types.
   * If empty, no text search is performed.
   */
  searchTerm: string;

  /**
   * The time range window for filtering events, specified in minutes.
   * Events older than this window relative to the current time will be excluded.
   */
  timeRange: number;
}
