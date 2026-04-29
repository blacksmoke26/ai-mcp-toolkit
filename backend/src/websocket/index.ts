/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket
 * @description Central barrel export for the WebSocket module.
 *
 * This module exports all WebSocket-related functionality for the MCP Server:
 *
 * - **Events** — Event type definitions, Zod schemas, registry, and broadcast utilities
 * - **Rooms** — Room management with lifecycle hooks and membership tracking
 * - **Handlers** — Event handlers for all WebSocket events with strict typing
 * - **Plugin** — Fastify WebSocket plugin for easy integration
 *
 * ## Architecture Overview
 *
 * ```
 * ┌──────────────────────────────────────────────────────┐
 * │                  WebSocket Module                    │
 * ├──────────────────────────────────────────────────────┤
 * │                                                      │
 * │  constants.ts → Enums & configuration constants     │
 * │  errors.ts    → Error codes & helper factory        │
 * │  schemas.ts   → Zod validation schemas              │
 * │  types.ts     → TypeScript interfaces & types       │
 * │  events.ts    → Event registry, broadcast manager   │
 * │  rooms.ts   → Room lifecycle management             │
 * │  handlers.ts → Event handler implementations        │
 * │  plugin.ts  → Fastify plugin registration           │
 * │  index.ts   → Barrel exports (this file)            │
 * │                                                      │
 * └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createWebSocketPlugin } from '@/websocket';
 *
 * // Register with Fastify
 * await fastify.register(createWebSocketPlugin());
 *
 * // Connect client
 * const ws = new WebSocket('ws://localhost:3100/ws');
 *
 * // Send event
 * ws.send(JSON.stringify({
 *   event: 'mcp:tools:list',
 *   payload: {},
 *   id: 'req-1',
 * }));
 *
 * // Listen for responses
 * ws.onmessage = (event) => {
 *   const { event: eventName, payload, id } = JSON.parse(event.data);
 *   console.log(`${eventName}:`, payload);
 * };
 * ```
 *
 * ## Available Events (38 total across 10 categories)
 *
 * | Category     | Events                                                  |
 * |--------------|---------------------------------------------------------|
 * | core (9)     | ws:connect, ws:disconnect, ws:error, ws:ping, ws:pong,  |
 * |              | ws:auth, ws:reconnect, ws:room:control, ws:connection:close |
 * | mcp (9)      | mcp:tools/list, mcp:tools/call, mcp:tools/list_changed, |
 * |              | mcp:resources/list, mcp:resources/read, mcp:resources/list_changed, |
 * |              | mcp:prompts/list, mcp:prompts/get, mcp:logging/set_level |
 * | chat (11)    | chat/send, chat/stream/start, chat/stream:chunk,        |
 * |              | chat/stream/done, chat/stream:error, chat/stream:pause,  |
 * |              | chat/stream:resume, chat/history, chat/conversations:*, |
 * | tool (4)     | tool/call, tool/result, tool:error, tool/list_changed   |
 * | provider (4) | provider/list, provider/health, provider/status:change, |
 * |              | provider/switch                                          |
 * | simulation (11) | simulate/scenarios/list, simulate/run,               |
 * |              | simulate/progress, simulate/result, simulate/pause,      |
 * |              | simulate/resume, simulate/abort, simulate/status,        |
 * |              | simulate/mocks/list, simulate/mocks/set, simulate/mocks/clear |
 * | metrics (4)  | metrics/live:start, metrics/live:tick, metrics/live:stop, |
 * |              | metrics/fetch                                            |
 * | system (5)   | system/health, system/info, system/shutdown,            |
 * |              | system/uptime, system/version                            |
 * | notification (4) | notify/to:room, notify/to:all,                       |
 * |              | notify/room_entered, notify/room_exited                 |
 *
 * ## Rooms
 *
 * The WebSocket system supports room-based messaging. Clients automatically join the `general` room on connect.
 *
 * | Room          | Purpose                    |
 * |---------------|----------------------------|
 * | `general`     | Default room for all clients |
 * | `mcp`         | MCP protocol messages      |
 * | `chat`        | Chat messages              |
 * | `chat-stream` | Real-time chat streaming   |
 * | `providers`   | Provider management        |
 * | `simulate`    | Simulation results         |
 * | `metrics`     | Real-time metrics          |
 * | `admin`       | Administrative messages    |
 */

// ════════════════════════════════════════════════════════════
// Constants Module — Enums & configuration constants
// ════════════════════════════════════════════════════════════

/** Event category values (e.g., WsEventCategory.CORE, WsEventCategory.MCP) */
export {WsEventCategory, WsEventCategoryValues, WsEventDirection, RoomPurpose} from './constants';
export type {RoomPurposeValue} from './constants';

/** Room status values */
export {RoomStatus, ROOM_STATUS_VALUES} from './constants';

/** Simulation status values */
export {SimulationStatus, SIMULATION_STATUS_VALUES} from './constants';

/** Provider status values */
export {ProviderStatus, PROVIDER_STATUS_VALUES} from './constants';

/** Tool content type values */
export {ToolContentType, TOOL_CONTENT_TYPE_VALUES} from './constants';

/** Log level values */
export {LogLevel, LOG_LEVEL_VALUES} from './constants';

/** Connection and room constants */
export {
  DEFAULT_ROOM,
  MCP_ROOM,
  CHAT_ROOM,
  CHAT_STREAM_ROOM,
  PROVIDERS_ROOM,
  SIMULATE_ROOM,
  METRICS_ROOM,
  ADMIN_ROOM,
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
} from './constants';

// ════════════════════════════════════════════════════════════
// Errors Module — Error codes & helper factory
// ════════════════════════════════════════════════════════════

/** MCP error codes */
export {McpErrorCodes} from './errors';

/** WebSocket error codes */
export {WsErrorCodes} from './errors';

/** All combined error codes */
export {ALL_ERROR_CODES} from './errors';

/** Error response factory class */
export {WsErrors} from './errors';

/** Type guard for WsErrorResponse */
export {isWsErrorResponse} from './errors';

/** Get human-readable description for an error code */
export {getErrorCodeDescription} from './errors';

// ════════════════════════════════════════════════════════════
// Schemas Module — Zod validation schemas
// ════════════════════════════════════════════════════════════

/** Map of all schemas by event name */
export {EVENT_SCHEMAS} from './schemas';

/** Shared request/response wrapper schemas */
export {ClientRequestSchema, ServerResponseSchema} from './schemas';

/** Core event schemas */
export {PingPongSchema, AuthSchema, ReconnectSchema} from './schemas';

/** MCP protocol schemas */
export {
  McpToolsListSchema,
  McpToolsCallSchema,
  McpResourcesListSchema,
  McpResourcesReadSchema,
  McpPromptsListSchema,
  McpPromptsGetSchema,
  McpLoggingSetLevelSchema,
} from './schemas';

/** Chat event schemas */
export {
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
} from './schemas';

/** Tool event schemas */
export {ToolCallSchema, ToolResultSchema, ToolErrorSchema} from './schemas';

/** Provider event schemas */
export {
  ProviderListSchema,
  ProviderHealthSchema,
  ProviderHealthResultSchema,
  ProviderSwitchSchema,
  ProviderStatusChangeSchema,
} from './schemas';

/** Simulation event schemas */
export {
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
} from './schemas';

/** Metrics event schemas */
export {MetricsLiveControlSchema, MetricsLiveTickSchema, MetricsFetchSchema} from './schemas';

/** System event schemas */
export {
  SystemHealthSchema,
  SystemHealthResultSchema,
  SystemInfoRequestSchema,
  SystemInfoResultSchema,
  SystemShutdownSchema,
  SystemUptimeSchema,
  SystemUptimeResultSchema,
  SystemVersionSchema,
  SystemVersionResultSchema,
} from './schemas';

/** Notification schemas */
export {
  NotifyToRoomSchema,
  NotifyToAllSchema,
  NotifyRoomEnteredSchema,
  NotifyRoomExitedSchema,
  RoomControlSchema,
  ConnectionCloseSchema,
} from './schemas';

// ════════════════════════════════════════════════════════════
// Types — Re-exported via events.ts (which re-exports from types.ts)
// ═══════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════
// Events Module — Event registry, broadcast, runtime utilities
// ════════════════════════════════════════════════════════════

/** Event registry array (source of truth for all events) */
export {EVENT_REGISTRY} from './events';

/** Lookup map for event definitions (internal use) */
// EVENT_MAP is accessible via EVENT_REGISTRY entries

/** Total count of registered events */
export {EVENT_COUNT} from './events';

/** Broadcast manager singleton */
export {broadcastManager} from './events';

/** Broadcast helper functions */
export {broadcastToRoom, publish, sendToClient} from './events';

/** Event lookup utilities */
export {
  getEventDefinition, getEventsByCategory, getAllEventNames, validateEventPayload, registerEventHandler,
} from './events';

// ════════════════════════════════════════════════════════════
// Rooms Module — Room lifecycle management
// ════════════════════════════════════════════════════════════

/** Room manager singleton */
export {roomManager} from './rooms';

// ════════════════════════════════════════════════════════════
// Handlers Module — Event handler implementations
// ════════════════════════════════════════════════════════════

/** Map of all registered event handlers */
export {eventHandlers} from './handlers';

/** Handler utilities */
export {initEventHandlers, dispatchEvent, getRegisteredHandlers, registerHandler} from './handlers';

// ════════════════════════════════════════════════════════════
// Plugin Module — Fastify WebSocket plugin
// ════════════════════════════════════════════════════════════

/** Create the Fastify WebSocket plugin */
export {createWebSocketPlugin} from './plugin';

/** Connected client state map */
export {connectedClients} from './plugin';

/** Client lifecycle utilities */
export {
  destroyClient,
  startHeartbeat,
  startMetricsStream,
  stopMetricsStream,
  authenticateClient,
  handleMessage,
  sendMessageToClient,
  handleConnection,
  parseMessage,
  serializeMessage,
  createClientState,
  cleanupAllConnections,
  getConnectedClients,
  getConnectionCount,
  getWsConfig,
} from './plugin';

// ════════════════════════════════════════════════════════════
// Summary — Event count and room list
// ════════════════════════════════════════════════════════════

/**
 * Summary of all available WebSocket events grouped by category.
 * Useful for documentation and introspection.
 *
 * Events are organized into 10 categories:
 * - **core** (9) — Connection management, heartbeat, auth
 * - **mcp** (9) — MCP protocol tools, resources, prompts
 * - **chat** (11) — Chat sending, streaming, conversations
 * - **tool** (4) — Direct tool invocation and notifications
 * - **provider** (4) — LLM provider management
 * - **simulation** (11) — Simulation scenarios and controls
 * - **metrics** (4) — Real-time metrics streaming
 * - **system** (5) — Server info, health, uptime
 * - **notification** (4) — Room broadcasts and presence
 *
 * Total: 66 events across all categories.
 */
export const WS_EVENT_SUMMARY = {
  core: [
    'ws:connect', 'ws:disconnect', 'ws:error', 'ws:ping', 'ws:pong',
    'ws:auth', 'ws:reconnect', 'ws:room:control', 'ws:connection:close',
  ],
  mcp: [
    'mcp:tools:list', 'mcp:tools:call', 'mcp:tools:list_changed',
    'mcp:resources:list', 'mcp:resources:read', 'mcp:resources:list_changed',
    'mcp:prompts:list', 'mcp:prompts:get', 'mcp:logging:set_level',
  ],
  chat: [
    'chat:send', 'chat:stream:start', 'chat:stream:chunk', 'chat:stream:done',
    'chat:stream:error', 'chat:stream:pause', 'chat:stream:resume',
    'chat:history', 'chat:conversations:list', 'chat:conversations:get',
    'chat:conversations:delete',
  ],
  tool: ['tool:call', 'tool:result', 'tool:error', 'tool:list_changed'],
  provider: [
    'provider:list', 'provider:health', 'provider:status:change', 'provider:switch',
  ],
  simulation: [
    'simulate:scenarios:list', 'simulate:run', 'simulate:progress', 'simulate:result',
    'simulate:pause', 'simulate:resume', 'simulate:abort', 'simulate:status',
    'simulate:mocks:list', 'simulate:mocks:set', 'simulate:mocks:clear',
  ],
  metrics: ['metrics:live:start', 'metrics:live:tick', 'metrics:live:stop', 'metrics:fetch'],
  system: ['system:health', 'system:info', 'system:shutdown', 'system:uptime', 'system:version'],
  notification: ['notify:to:room', 'notify:to:all', 'notify:room_entered', 'notify:room_exited'],
};

/** Total count of registered events */
export const WS_EVENT_COUNT = 38;

/** List of default room names */
export const DEFAULT_ROOMS_LIST = Object.freeze(['general', 'mcp', 'chat', 'chat-stream', 'providers', 'simulate', 'metrics', 'admin']);
