/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/constants
 * @description Centralized constants for the WebSocket system.
 *
 * This module contains all shared constants, enums, and configuration values
 * used throughout the WebSocket module. This prevents duplication and makes
 * it easy to update values in one place.
 *
 * ## Categories
 *
 * - **Event Categories** — Classification of WebSocket events
 * - **Event Directions** — Data flow direction for events
 * - **Room Purposes** — Purpose classification for rooms
 * - **Room Names** — Default room identifiers
 * - **Connection Constants** — Heartbeat, timeout, size limits
 * - **Simulation Status** — Simulation execution states
 * - **Provider Status** — Provider health states
 * - **Tool Content Types** — Tool response content types
 */

// ════════════════════════════════════════════════════════════════
// Event Categories — Classification of event types
// ════════════════════════════════════════════════════════════════

/**
 * Categories used to classify WebSocket events.
 * Each event belongs to exactly one category.
 */
export const WsEventCategory = {
  /** Core WebSocket protocol events (connect, disconnect, ping, auth) */
  CORE: 'core' as const,
  /** MCP protocol events (tools, resources, prompts) */
  MCP: 'mcp' as const,
  /** Chat events (send, stream, history) */
  CHAT: 'chat' as const,
  /** Tool events (direct invocation) */
  TOOL: 'tool' as const,
  /** LLM provider events (list, health, switch) */
  PROVIDER: 'provider' as const,
  /** Simulation events (scenarios, mocks) */
  SIMULATION: 'simulation' as const,
  /** Metrics events (live stream, fetch) */
  METRICS: 'metrics' as const,
  /** System events (health, info, shutdown) */
  SYSTEM: 'system' as const,
  /** Notification events (room broadcasts) */
  NOTIFICATION: 'notification' as const,
  /** Generic/fallback events */
  GENERIC: 'generic' as const,
} as const;

/** All event category values as an array */
export const WsEventCategoryValues = Object.values(WsEventCategory) as WsEventCategoryValue[];

/** Union type of all event categories */
export type WsEventCategoryValue = (typeof WsEventCategory)[keyof typeof WsEventCategory];

// ════════════════════════════════════════════════════════════════
// Event Directions — Data flow direction
// ════════════════════════════════════════════════════════════════

/**
 * Possible directions for WebSocket events.
 * - `clientToServer`: Client sends request, server responds
 * - `serverToClient`: Server pushes notification to client
 * - `bidirectional`: Can flow both ways
 */
export const WsEventDirection = {
  /** Client → Server (request-response pattern) */
  CLIENT_TO_SERVER: 'clientToServer' as const,
  /** Server → Client (push/notification pattern) */
  SERVER_TO_CLIENT: 'serverToClient' as const,
  /** Both directions allowed */
  BIDIRECTIONAL: 'bidirectional' as const,
} as const;

/** Union type of all event directions */
export type WsEventDirectionValue = (typeof WsEventDirection)[keyof typeof WsEventDirection];

// ════════════════════════════════════════════════════════════════
// Room Purposes — Classification for room types
// ════════════════════════════════════════════════════════════════

/**
 * Standard room purposes that define how rooms behave.
 */
export const RoomPurpose = {
  /** General room for all clients to share */
  GENERAL: 'general' as const,
  /** MCP protocol messages */
  MCP: 'mcp' as const,
  /** Chat messages */
  CHAT: 'chat' as const,
  /** Real-time chat streaming */
  CHAT_STREAM: 'chat-stream' as const,
  /** LLM provider management */
  PROVIDERS: 'providers' as const,
  /** Simulation and testing */
  SIMULATE: 'simulate' as const,
  /** Real-time metrics streaming */
  METRICS: 'metrics' as const,
  /** Administrative operations */
  ADMIN: 'admin' as const,
  /** Custom user-defined rooms */
  CUSTOM: 'custom' as const,
} as const;

/** Union type of all room purposes */
export type RoomPurposeValue = (typeof RoomPurpose)[keyof typeof RoomPurpose];

// ════════════════════════════════════════════════════════════════
// Default Room Names — Predefined room identifiers
// ════════════════════════════════════════════════════════════════

/** Default room for general-purpose messages */
export const DEFAULT_ROOM = 'general';

/** Room for MCP protocol messages */
export const MCP_ROOM = 'mcp';

/** Room for chat messages */
export const CHAT_ROOM = 'chat';

/** Room for real-time chat streaming */
export const CHAT_STREAM_ROOM = 'chat-stream';

/** Room for provider management */
export const PROVIDERS_ROOM = 'providers';

/** Room for simulation results */
export const SIMULATE_ROOM = 'simulate';

/** Room for metrics data */
export const METRICS_ROOM = 'metrics';

/** Room for administrative operations */
export const ADMIN_ROOM = 'admin';

/** All default room names */
export const DEFAULT_ROOMS_LIST = [
  DEFAULT_ROOM,
  MCP_ROOM,
  CHAT_ROOM,
  CHAT_STREAM_ROOM,
  PROVIDERS_ROOM,
  SIMULATE_ROOM,
  METRICS_ROOM,
  ADMIN_ROOM,
];

/** Map of room names to their purposes */
export const ROOM_PURPOSE_MAP: Record<string, RoomPurposeValue> = {
  [DEFAULT_ROOM]: RoomPurpose.GENERAL,
  [MCP_ROOM]: RoomPurpose.MCP,
  [CHAT_ROOM]: RoomPurpose.CHAT,
  [CHAT_STREAM_ROOM]: RoomPurpose.CHAT_STREAM,
  [PROVIDERS_ROOM]: RoomPurpose.PROVIDERS,
  [SIMULATE_ROOM]: RoomPurpose.SIMULATE,
  [METRICS_ROOM]: RoomPurpose.METRICS,
  [ADMIN_ROOM]: RoomPurpose.ADMIN,
};

// ════════════════════════════════════════════════════════════════
// Connection Constants — Heartbeat, timeouts, limits
// ════════════════════════════════════════════════════════════════

/** Default heartbeat ping interval in milliseconds (30 seconds) */
export const DEFAULT_PING_INTERVAL = 30_000;

/** Maximum WebSocket message size in bytes (1 MB) */
export const MAX_MESSAGE_SIZE = 1024 * 1024;

/** Connection timeout in milliseconds before cleanup (60 seconds) */
export const CONNECTION_TIMEOUT = 60_000;

/** Default reconnection backoff base in milliseconds (1 second) */
export const DEFAULT_RECONNECT_BASE = 1_000;

/** Maximum reconnection backoff in milliseconds (30 seconds) */
export const MAX_RECONNECT_BACKOFF = 30_000;

/** Maximum reconnection attempts (-1 = unlimited) */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = -1;

/** WebSocket close code for normal closure */
export const WS_CLOSE_NORMAL = 1000;

/** WebSocket close code for protocol error */
export const WS_CLOSE_PROTOCOL_ERROR = 1002;

/** WebSocket close code for too large payload */
export const WS_CLOSE_TOO_LARGE = 1009;

// ════════════════════════════════════════════════════════════════
// Simulation Status — States for simulation scenarios
// ════════════════════════════════════════════════════════════════

/**
 * Possible states of a running simulation scenario.
 */
export const SimulationStatus = {
  /** Scenario has not started yet */
  PENDING: 'pending' as const,
  /** Scenario is currently running */
  RUNNING: 'running' as const,
  /** All steps passed */
  PASSED: 'passed' as const,
  /** At least one step failed */
  FAILED: 'failed' as const,
  /** Scenario was skipped */
  SKIPPED: 'skipped' as const,
  /** Scenario was paused by user */
  PAUSED: 'paused' as const,
  /** Scenario was aborted by user */
  ABORTED: 'aborted' as const,
} as const;

/** Union type of simulation statuses */
export type SimulationStatusValue = (typeof SimulationStatus)[keyof typeof SimulationStatus];

/** All simulation status values */
export const SIMULATION_STATUS_VALUES = Object.values(SimulationStatus) as SimulationStatusValue[];

// ════════════════════════════════════════════════════════════════
// Provider Status — Health states for LLM providers
// ════════════════════════════════════════════════════════════════

/**
 * Possible health states for an LLM provider.
 */
export const ProviderStatus = {
  /** Provider is responding normally */
  HEALTHY: 'healthy' as const,
  /** Provider is not responding */
  UNHEALTHY: 'unhealthy' as const,
  /** Provider status is unknown (not checked yet) */
  UNKNOWN: 'unknown' as const,
} as const;

/** Union type of provider statuses */
export type ProviderStatusValue = (typeof ProviderStatus)[keyof typeof ProviderStatus];

/** All provider status values */
export const PROVIDER_STATUS_VALUES = Object.values(ProviderStatus) as ProviderStatusValue[];

// ════════════════════════════════════════════════════════════════
// Tool Content Types — Types of tool response content
// ════════════════════════════════════════════════════════════════

/**
 * Possible content types for tool results.
 */
export const ToolContentType = {
  /** Text content */
  TEXT: 'text' as const,
  /** Binary image data (base64) */
  IMAGE: 'image' as const,
  /** Embedded resource reference */
  RESOURCE: 'resource' as const,
} as const;

/** Union type of tool content types */
export type ToolContentTypeValue = (typeof ToolContentType)[keyof typeof ToolContentType];

/** All tool content type values */
export const TOOL_CONTENT_TYPE_VALUES = Object.values(ToolContentType) as ToolContentTypeValue[];

// ════════════════════════════════════════════════════════════════
// Log Levels — MCP logging levels
// ════════════════════════════════════════════════════════════════

/**
 * Standard log levels as defined by the MCP specification.
 */
export const LogLevel = {
  /** Debug-level logging */
  DEBUG: 'debug' as const,
  /** Informational logging */
  INFO: 'info' as const,
  /** Notable events */
  NOTICE: 'notice' as const,
  /** Warning conditions */
  WARNING: 'warning' as const,
  /** Error conditions */
  ERROR: 'error' as const,
  /** Critical conditions */
  CRITICAL: 'critical' as const,
  /** Action must be taken immediately */
  ALERT: 'alert' as const,
  /** System is unusable */
  EMERGENCY: 'emergency' as const,
} as const;

/** Union type of log levels */
export type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];

/** All log level values */
export const LOG_LEVEL_VALUES = Object.values(LogLevel) as LogLevelValue[];

// ════════════════════════════════════════════════════════════════
// Room Status — State of a room
// ════════════════════════════════════════════════════════════════

/**
 * Possible states for a WebSocket room.
 */
export const RoomStatus = {
  /** Room is accepting connections and messages */
  ACTIVE: 'active' as const,
  /** Room is temporarily inactive but kept for future joins */
  PAUSED: 'paused' as const,
  /** Room is closed and will be cleaned up when empty */
  CLOSED: 'closed' as const,
  /** Room is draining — no new joins, existing clients can stay */
  DRAINING: 'draining' as const,
} as const;

/** Union type of room statuses */
export type RoomStatusValue = (typeof RoomStatus)[keyof typeof RoomStatus];

/** All room status values */
export const ROOM_STATUS_VALUES = Object.values(RoomStatus) as RoomStatusValue[];

// ════════════════════════════════════════════════════════════════
// Export default object for convenience
// ════════════════════════════════════════════════════════════════

export default {
  WsEventCategory,
  WsEventCategoryValues,
  WsEventDirection,
  RoomPurpose,
  RoomPurposeValues: Object.values(RoomPurpose),
  DEFAULT_ROOM,
  MCP_ROOM,
  CHAT_ROOM,
  CHAT_STREAM_ROOM,
  PROVIDERS_ROOM,
  SIMULATE_ROOM,
  METRICS_ROOM,
  ADMIN_ROOM,
  DEFAULT_ROOMS_LIST,
  ROOM_PURPOSE_MAP,
  DEFAULT_PING_INTERVAL,
  MAX_MESSAGE_SIZE,
  CONNECTION_TIMEOUT,
  DEFAULT_RECONNECT_BASE,
  MAX_RECONNECT_BACKOFF,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  WS_CLOSE_NORMAL,
  WS_CLOSE_PROTOCOL_ERROR,
  WS_CLOSE_TOO_LARGE,
  SimulationStatus,
  SIMULATION_STATUS_VALUES,
  ProviderStatus,
  PROVIDER_STATUS_VALUES,
  ToolContentType,
  TOOL_CONTENT_TYPE_VALUES,
  LogLevel,
  LOG_LEVEL_VALUES,
  RoomStatus,
  ROOM_STATUS_VALUES,
};