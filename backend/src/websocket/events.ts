/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */
/**
 * @module websocket/events
 * @description Event definitions, registry, and broadcast infrastructure.
 *
 * This module defines every WebSocket event supported by the MCP Server.
 * It imports schemas, types, and constants from extracted modules to keep
 * this file focused on event metadata and runtime broadcast logic.
 *
 * ## Event Categories
 *
 * ### Core Events
 * - `ws:connect` — Client connection established (server → client)
 * - `ws:disconnect` — Client disconnected (server → client)
 * - `ws:error` — WebSocket error occurred (server → client)
 * - `ws:ping` — Heartbeat ping (either direction)
 * - `ws:pong` — Heartbeat response (either direction)
 * - `ws:auth` — Authentication/authorization
 *
 * - `ws:reconnect` — Reconnection request (client → server)
 * - `ws:room:control` — Join/leave room control
 * - `ws:connection:close` — Close connection request
 *
 * ### MCP Protocol Events
 * - `mcp:tools:list` — List available tools
 * - `mcp:tools:call` — Invoke a tool
 * - `mcp:tools:list_changed` — Tool list changed (server → client broadcast)
 * - `mcp:resources:list` — List resources
 * - `mcp:resources:read` — Read a resource by URI
 * - `mcp:resources:list_changed` — Resource list changed (server → client broadcast)
 * - `mcp:prompts:list` — List prompts
 * - `mcp:prompts:get` — Get a prompt by name
 * - `mcp:logging:set_level` — Set logging level
 *
 * ### Chat Events
 * - `chat:send` — Send a chat message
 * - `chat:stream:start` — Start a streaming chat session
 * - `chat:stream:chunk` — Streaming content chunk (server → client)
 * - `chat:stream:done` — Stream completed (server → client)
 * - `chat:stream:error` — Stream error (server → client)
 * - `chat:stream:pause` — Pause streaming
 * - `chat:stream:resume` — Resume streaming
 * - `chat:history` — Retrieve chat history for a conversation
 * - `chat:conversations:list` — List all conversations
 * - `chat:conversations:get` — Get a specific conversation
 * - `chat:conversations:delete` — Delete a conversation
 *
 * ### Tool Events
 * - `tool:call` — Direct tool invocation with real-time result
 * - `tool:result` — Tool execution result (server → client)
 * - `tool:error` — Tool execution error (server → client)
 * - `tool:list_changed` — Tool list changed (server → client broadcast)
 *
 * ### Provider Events
 * - `provider:list` — List available LLM providers
 * - `provider:health` — Check provider health
 * - `provider:status:change` — Provider status changed (server → client broadcast)
 * - `provider:switch` — Switch default provider
 *
 * ### Simulation Events
 * - `simulate:scenarios:list` — List simulation scenarios
 * - `simulate:run` — Run a simulation scenario
 * - `simulate:progress` — Simulation progress update (server → client)
 * - `simulate:result` — Simulation complete result (server → client)
 * - `simulate:pause` — Pause a running simulation
 * - `simulate:resume` — Resume a paused simulation
 * - `simulate:abort` — Abort a running simulation
 * - `simulate:status` — Get simulation status
 * - `simulate:mocks:list` — List configured mocks
 * - `simulate:mocks:set` — Configure a mock
 * - `simulate:mocks:clear` — Clear all mocks
 *
 * ### Metrics Events
 * - `metrics:live:start` — Start real-time metrics stream
 * - `metrics:live:tick` — Metrics data tick (server → client)
 * - `metrics:live:stop` — Stop metrics stream
 * - `metrics:fetch` — Get current metrics snapshot
 *
 * ### System Events
 * - `system:health` — Get server health status
 * - `system:info` — Get server information
 * - `system:shutdown` — Graceful shutdown signal
 * - `system:uptime` — Get server uptime
 * - `system:version` — Get server version info
 *
 * ### Notification Events
 * - `notify:to:room` — Send notification to a room
 * - `notify:to:all` — Broadcast to all connected clients
 * - `notify:room_entered` — Client joined a room (server → client)
 * - `notify:room_exited` — Client left a room (server → client)
 *
 * ## Usage Example
 *
 * ```typescript
 * import { broadcastToRoom, publish } from '@/websocket/events';
 *
 * // Broadcast tool list changes to all clients in 'mcp' room
 * await broadcastToRoom('mcp', 'mcp:tools:list_changed', { count: 5 });
 *
 * // Send to all connected clients
 * publish('system:info', { version: '1.0.0' });
 * ```
 */

import {z} from 'zod';
import {logger} from '@/utils/logger';
import {WsEventCategory, WsEventDirection} from './constants';
import {EVENT_SCHEMAS, ServerResponseSchema} from './schemas';
import type {
  ValidationResult,
  WsClientInfo,
  WsEventCategory as WsEventCategoryType,
  WsEventDefinition,
  WsEventHandler,
  WsRoom,
} from './types';

// ═════════════════════════════════════════════════
// Event Name Union Type
// ═════════════════════════════════════════════════

/** All valid WebSocket event names in the system */
export type WsEventNameType =
  // Core
  | 'ws:connect'
  | 'ws:disconnect'
  | 'ws:error'
  | 'ws:ping'
  | 'ws:pong'
  | 'ws:auth'
  | 'ws:reconnect'
  | 'ws:room:control'
  | 'ws:connection:close'
  // MCP
  | 'mcp:tools:list'
  | 'mcp:tools:call'
  | 'mcp:tools:list_changed'
  | 'mcp:resources:list'
  | 'mcp:resources:read'
  | 'mcp:resources:list_changed'
  | 'mcp:prompts:list'
  | 'mcp:prompts:get'
  | 'mcp:logging:set_level'
  // Chat
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
  | 'chat:conversations:delete'
  // Tool
  | 'tool:call'
  | 'tool:result'
  | 'tool:error'
  | 'tool:list_changed'
  // Provider
  | 'provider:list'
  | 'provider:health'
  | 'provider:status:change'
  | 'provider:switch'
  // Simulation
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
  | 'simulate:mocks:clear'
  // Metrics
  | 'metrics:live:start'
  | 'metrics:live:tick'
  | 'metrics:live:stop'
  | 'metrics:fetch'
  // System
  | 'system:health'
  | 'system:info'
  | 'system:shutdown'
  | 'system:uptime'
  | 'system:version'
  // Notification
  | 'notify:to:room'
  | 'notify:to:all'
  | 'notify:room_entered'
  | 'notify:room_exited'
  // Generic
  | 'request';

// Export the type under the standard name
export type { WsEventNameType as WsEventName };

// ═════════════════════════════════════════════════
// Event Registry
// ═════════════════════════════════════════════════

/**
 * Complete registry of all WebSocket events in the system.
 * This is the source of truth for event definitions.
 */
export const EVENT_REGISTRY: WsEventDefinition[] = [
  // ── Core Events ──
  {
    name: 'ws:connect',
    description: 'Fired when a client connects to the WebSocket server. Contains connection metadata.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: ServerResponseSchema,
  },
  {
    name: 'ws:disconnect',
    description: 'Fired when a client disconnects from the WebSocket server.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: ServerResponseSchema,
  },
  {
    name: 'ws:error',
    description: 'Fired when a WebSocket error occurs on the server side.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: ServerResponseSchema,
  },
  {
    name: 'ws:ping',
    description: 'Heartbeat ping. Can be sent by either client or server.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: true,
    schema: EVENT_SCHEMAS['ws:ping'],
  },
  {
    name: 'ws:pong',
    description: 'Heartbeat pong response to a ping.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: true,
    schema: EVENT_SCHEMAS['ws:pong'],
  },
  {
    name: 'ws:auth',
    description: 'Authentication event. Client sends credentials; server responds with success/failure.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['ws:auth'],
  },
  {
    name: 'ws:reconnect',
    description: 'Client requests reconnection with backoff parameters.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: true,
    schema: EVENT_SCHEMAS['ws:reconnect'],
  },
  {
    name: 'ws:room:control',
    description: 'Join or leave a room. Client sends room + action; server responds with confirmation.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['ws:room:control'],
  },
  {
    name: 'ws:connection:close',
    description: 'Client requests to close the connection. Server confirms before closing.',
    category: WsEventCategory.CORE,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['ws:connection:close'],
  },

  // ── MCP Protocol Events ──
  {
    name: 'mcp:tools:list',
    description: 'List all available MCP tools. Returns ToolDefinition[] with schemas.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:tools:list'],
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:tools:call',
    description: 'Invoke an MCP tool by name with arguments. Returns CallToolResult.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:tools:call'],
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:tools:list_changed',
    description: 'Broadcast notification when the tool list changes (new tool registered or removed).',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: z.object({
      count: z.number(),
      added: z.array(z.string()).optional(),
      removed: z.array(z.string()).optional(),
    }),
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:resources:list',
    description: 'List all available MCP resources.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:resources:list'],
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:resources:read',
    description: 'Read a resource by its URI.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:resources:read'],
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:resources:list_changed',
    description: 'Broadcast notification when the resource list changes.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: z.object({
      count: z.number(),
      added: z.array(z.string()).optional(),
      removed: z.array(z.string()).optional(),
    }),
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:prompts:list',
    description: 'List all available MCP prompt templates.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:prompts:list'],
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:prompts:get',
    description: 'Get a prompt template by name with optional arguments.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:prompts:get'],
    defaultRoom: 'mcp',
  },
  {
    name: 'mcp:logging:set_level',
    description: 'Change the server logging level for this connection.',
    category: WsEventCategory.MCP,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['mcp:logging:set_level'],
  },

  // ── Chat Events ──
  {
    name: 'chat:send',
    description: 'Send a chat message to the agent loop. Returns conversation and iteration results.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:send'],
    defaultRoom: 'chat',
  },
  {
    name: 'chat:stream:start',
    description: 'Start a streaming chat session. Server responds with stream ID and initial chunks.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:stream:start'],
    defaultRoom: 'chat-stream',
  },
  {
    name: 'chat:stream:chunk',
    description: 'Streaming content chunk during a chat stream session.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['chat:stream:chunk'],
    defaultRoom: 'chat-stream',
  },
  {
    name: 'chat:stream:done',
    description: 'Final chunk of a chat stream session containing full result.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: z.object({
      delta: z.string(),
      toolCall: z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.string(),
      }).optional(),
      done: z.literal(true),
      streamId: z.string().optional(),
      conversationId: z.string().uuid().optional(),
    }),
    defaultRoom: 'chat-stream',
  },
  {
    name: 'chat:stream:error',
    description: 'Error occurred during a chat stream session.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['chat:stream:error'],
    defaultRoom: 'chat-stream',
  },
  {
    name: 'chat:stream:pause',
    description: 'Pause a chat stream session. Server acknowledges and stops sending chunks.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:stream:pause'],
    defaultRoom: 'chat-stream',
  },
  {
    name: 'chat:stream:resume',
    description: 'Resume a paused chat stream session. Server resumes sending chunks.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:stream:resume'],
    defaultRoom: 'chat-stream',
  },
  {
    name: 'chat:history',
    description: 'Retrieve message history for a conversation.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:history'],
    defaultRoom: 'chat',
  },
  {
    name: 'chat:conversations:list',
    description: 'List all chat conversations with pagination.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:conversations:list'],
    defaultRoom: 'chat',
  },
  {
    name: 'chat:conversations:get',
    description: 'Get a specific conversation by ID.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:conversations:get'],
    defaultRoom: 'chat',
  },
  {
    name: 'chat:conversations:delete',
    description: 'Delete a chat conversation by ID.',
    category: WsEventCategory.CHAT,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['chat:conversations:delete'],
    defaultRoom: 'chat',
  },

  // ── Tool Events ──
  {
    name: 'tool:call',
    description: 'Direct tool invocation (alternative to mcp:tools:call). Supports real-time responses.',
    category: WsEventCategory.TOOL,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['tool:call'],
  },
  {
    name: 'tool:result',
    description: 'Tool execution result delivered to subscribers.',
    category: WsEventCategory.TOOL,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['tool:result'],
  },
  {
    name: 'tool:error',
    description: 'Tool execution error delivered to subscribers.',
    category: WsEventCategory.TOOL,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['tool:error'],
  },
  {
    name: 'tool:list_changed',
    description: 'Broadcast notification when the tool list changes.',
    category: WsEventCategory.TOOL,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: z.object({
      count: z.number(),
      added: z.array(z.string()).optional(),
      removed: z.array(z.string()).optional(),
    }),
  },

  // ── Provider Events ──
  {
    name: 'provider:list',
    description: 'List all registered LLM providers with their health status.',
    category: WsEventCategory.PROVIDER,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['provider:list'],
    defaultRoom: 'providers',
  },
  {
    name: 'provider:health',
    description: 'Check health of a specific provider or all providers.',
    category: WsEventCategory.PROVIDER,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['provider:health'],
    defaultRoom: 'providers',
  },
  {
    name: 'provider:status:change',
    description: 'Broadcast when a provider\'s health status changes.',
    category: WsEventCategory.PROVIDER,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['provider:status:change'],
    defaultRoom: 'providers',
  },
  {
    name: 'provider:switch',
    description: 'Switch the default LLM provider.',
    category: WsEventCategory.PROVIDER,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['provider:switch'],
    defaultRoom: 'providers',
  },

  // ── Simulation Events ──
  {
    name: 'simulate:scenarios:list',
    description: 'List all available simulation scenarios.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:scenarios:list'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:run',
    description: 'Run a simulation scenario. Returns progress updates and final result.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:run'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:progress',
    description: 'Progress update during a running simulation scenario.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['simulate:progress'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:result',
    description: 'Final result of a completed simulation scenario.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['simulate:result'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:pause',
    description: 'Pause a running simulation scenario. Server acknowledges and halts progress.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:pause'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:resume',
    description: 'Resume a paused simulation scenario. Server resumes progress updates.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:resume'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:abort',
    description: 'Abort a running simulation scenario. Server cleans up and notifies all clients.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:abort'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:status',
    description: 'Get the current status of a simulation scenario.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:status'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:mocks:list',
    description: 'List all configured simulation mocks.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:mocks:list'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:mocks:set',
    description: 'Configure or update a mock for a specific tool.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:mocks:set'],
    defaultRoom: 'simulate',
  },
  {
    name: 'simulate:mocks:clear',
    description: 'Clear all simulation mocks.',
    category: WsEventCategory.SIMULATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['simulate:mocks:clear'],
    defaultRoom: 'simulate',
  },

  // ── Metrics Events ──
  {
    name: 'metrics:live:start',
    description: 'Start real-time metrics streaming. Server will emit metrics:live:tick at the specified interval.',
    category: WsEventCategory.METRICS,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['metrics:live:start'],
    defaultRoom: 'metrics',
  },
  {
    name: 'metrics:live:tick',
    description: 'Real-time metrics data tick containing request counts, latencies, and system stats.',
    category: WsEventCategory.METRICS,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['metrics:live:tick'],
    defaultRoom: 'metrics',
  },
  {
    name: 'metrics:live:stop',
    description: 'Stop the real-time metrics stream for this client.',
    category: WsEventCategory.METRICS,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['metrics:live:stop'],
    defaultRoom: 'metrics',
  },
  {
    name: 'metrics:fetch',
    description: 'Get a one-time snapshot of current metrics.',
    category: WsEventCategory.METRICS,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['metrics:fetch'],
    defaultRoom: 'metrics',
  },

  // ── System Events ──
  {
    name: 'system:health',
    description: 'Get the current health status of the server including all subsystem checks.',
    category: WsEventCategory.SYSTEM,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['system:health'],
  },
  {
    name: 'system:info',
    description: 'Get server information including version, provider list, and system stats.',
    category: WsEventCategory.SYSTEM,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['system:info'],
  },
  {
    name: 'system:shutdown',
    description: 'Signal the server to begin graceful shutdown.',
    category: WsEventCategory.SYSTEM,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['system:shutdown'],
  },
  {
    name: 'system:uptime',
    description: 'Get the current server uptime in seconds and human-readable format.',
    category: WsEventCategory.SYSTEM,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['system:uptime'],
  },
  {
    name: 'system:version',
    description: 'Get the server name, version, and protocol information.',
    category: WsEventCategory.SYSTEM,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['system:version'],
  },

  // ── Notification Events ──
  {
    name: 'notify:to:room',
    description: 'Send a custom notification to a specific room.',
    category: WsEventCategory.NOTIFICATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['notify:to:room'],
  },
  {
    name: 'notify:to:all',
    description: 'Broadcast a custom notification to all connected clients.',
    category: WsEventCategory.NOTIFICATION,
    direction: WsEventDirection.CLIENT_TO_SERVER,
    isNotification: false,
    schema: EVENT_SCHEMAS['notify:to:all'],
  },
  {
    name: 'notify:room_entered',
    description: 'Notification that a client has entered a room.',
    category: WsEventCategory.NOTIFICATION,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['notify:room_entered'],
  },
  {
    name: 'notify:room_exited',
    description: 'Notification that a client has left a room.',
    category: WsEventCategory.NOTIFICATION,
    direction: WsEventDirection.SERVER_TO_CLIENT,
    isNotification: true,
    schema: EVENT_SCHEMAS['notify:room_exited'],
  },

  // ── Generic Request ──
  {
    name: 'request',
    description: 'Generic request event for custom or future use. Schema is flexible.',
    category: WsEventCategory.GENERIC,
    direction: WsEventDirection.BIDIRECTIONAL,
    isNotification: false,
    schema: EVENT_SCHEMAS['request'],
  },
];

// ═════════════════════════════════════════════════
// Runtime Utilities
// ═════════════════════════════════════════════════

/** Lookup table for event definitions by name */
const EVENT_MAP = new Map<string, WsEventDefinition>();

/** Initialize the event map from the registry */
function initEventMap(): void {
  for (const event of EVENT_REGISTRY) {
    EVENT_MAP.set(event.name, event);
  }
}

initEventMap();

/**
 * Get the event definition by name.
 * @param name - Event name to look up
 * @returns The event definition, or undefined if not found
 */
export function getEventDefinition(name: string): WsEventDefinition | undefined {
  return EVENT_MAP.get(name);
}

/**
 * Get all event definitions filtered by category.
 */
export function getEventsByCategory(category?: WsEventCategoryType): WsEventDefinition[] {
  if (!category) return EVENT_REGISTRY;
  return EVENT_REGISTRY.filter(e => e.category === category);
}

/** Get all event names as a sorted array */
export function getAllEventNames(): WsEventNameType[] {
  return EVENT_REGISTRY.map(e => e.name);
}

/** Total number of registered events */
export const EVENT_COUNT = EVENT_REGISTRY.length;

/**
 * Validate a payload against the schema for a given event name.
 */
export function validateEventPayload(eventName: string, payload: unknown): ValidationResult {
  const event = EVENT_MAP.get(eventName);
  if (!event) {
    return { valid: false, error: `Unknown event: ${eventName}` };
  }
  const result = event.schema.safeParse(payload);
  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      valid: false,
      error: `Validation failed for "${eventName}": ${firstError.path.join('.')}: ${firstError.message}`,
    };
  }
  return { valid: true };
}

// ═════════════════════════════════════════════════
// Broadcast System — Room-based pub/sub
// ═════════════════════════════════════════════════

/**
 * Server-side broadcast manager.
 * Provides room-based publish/subscribe functionality.
 */
class BroadcastManager {
  private rooms: Map<string, WsRoom> = new Map();
  private clients: Map<string, WsClientInfo> = new Map();
  private initialized = false;

  init(): void {
    if (this.initialized) {
      logger.warn('BroadcastManager already initialized, skipping');
      return;
    }
    this.initialized = true;
    logger.info('BroadcastManager initialized');
  }

  addClient(clientInfo: WsClientInfo): void {
    this.clients.set(clientInfo.clientId, clientInfo);
    logger.debug({ clientId: clientInfo.clientId }, 'Client registered');
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      if (client.room) {
        this.leaveRoom(clientId, client.room);
      }
      this.clients.delete(clientId);
      logger.debug({ clientId }, 'Client removed');
    }
  }

  joinRoom(clientId: string, roomName: string): WsRoom | null {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn({ clientId, room: roomName }, 'Attempted to join room for unknown client');
      return null;
    }
    if (client.room) {
      this.leaveRoom(clientId, client.room);
    }
    let room = this.rooms.get(roomName);
    if (!room) {
      room = {
        name: roomName,
        members: new Set(),
        status: 'active',
        createdAt: new Date(),
        lastActivityAt: new Date(),
        messageCount: 0,
      };
      this.rooms.set(roomName, room);
    }
    room.members.add(clientId);
    client.room = roomName;
    room.lastActivityAt = new Date();
    this.broadcastToRoom(roomName, 'notify:room_entered', {
      room: roomName,
      clientId,
      clientCount: room.members.size,
    }, clientId);
    logger.debug({ clientId, room: roomName }, 'Client joined room');
    return room;
  }

  leaveRoom(clientId: string, roomName: string): void {
    const room = this.rooms.get(roomName);
    if (!room) return;
    const wasMember = room.members.delete(clientId);
    if (!wasMember) return;
    room.lastActivityAt = new Date();
    const client = this.clients.get(clientId);
    if (client && client.room === roomName) {
      client.room = null;
    }
    this.broadcastToRoom(roomName, 'notify:room_exited', {
      room: roomName,
      clientId,
      clientCount: room.members.size,
    });
    if (room.members.size === 0) {
      this.rooms.delete(roomName);
      logger.debug({ room: roomName }, 'Room cleaned up (no clients)');
    }
  }

  broadcastToRoom(
    roomName: string,
    eventName: string,
    payload: Record<string, unknown>,
    exclude?: string,
  ): number {
    const room = this.rooms.get(roomName);
    if (!room) return 0;
    let sentCount = 0;
    const message = JSON.stringify({ event: eventName, payload });
    for (const clientId of room.members) {
      if (clientId === exclude) continue;
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === 1 /* OPEN */) {
        try {
          client.ws.send(message);
          client.lastActivityAt = new Date();
          sentCount++;
        } catch (err) {
          logger.error({ clientId, room: roomName, error: err }, 'Failed to broadcast to client in room');
        }
      }
    }
    room.messageCount += sentCount;
    return sentCount;
  }

  broadcastToAll(
    eventName: string,
    payload: Record<string, unknown>,
    exclude?: string,
  ): number {
    let sentCount = 0;
    const message = JSON.stringify({ event: eventName, payload });
    for (const [clientId, client] of this.clients) {
      if (clientId === exclude) continue;
      if (client.ws.readyState === 1 /* OPEN */) {
        try {
          client.ws.send(message);
          client.lastActivityAt = new Date();
          sentCount++;
        } catch (err) {
          logger.error({ clientId, error: err }, 'Failed to broadcast to client');
        }
      }
    }
    return sentCount;
  }

  sendToClient(
    clientId: string,
    eventName: string,
    payload: Record<string, unknown>,
  ): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    if (client.ws.readyState !== 1 /* OPEN */) return false;
    try {
      client.ws.send(JSON.stringify({ event: eventName, payload }));
      client.lastActivityAt = new Date();
      return true;
    } catch (err) {
      logger.error({ clientId, error: err }, 'Failed to send message to client');
      return false;
    }
  }

  getRoomClients(roomName: string): string[] {
    const room = this.rooms.get(roomName);
    return room ? Array.from(room.members) : [];
  }

  getRoomClientCount(roomName: string): number {
    const room = this.rooms.get(roomName);
    return room ? room.members.size : 0;
  }

  getTotalConnectedClients(): number {
    return this.clients.size;
  }

  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  getRoomInfo(roomName: string): WsRoom | null {
    return this.rooms.get(roomName) || null;
  }

  shutdown(): void {
    this.rooms.clear();
    logger.info('BroadcastManager shutdown');
  }
}

/** Global singleton broadcast manager */
export const broadcastManager = new BroadcastManager();

// ═════════════════════════════════════════════════
// Exported Helper Functions
// ═════════════════════════════════════════════════

/**
 * Broadcast an event to a specific room.
 */
export async function broadcastToRoom(
  roomName: string,
  eventName: string,
  payload: Record<string, unknown>,
  exclude?: string,
): Promise<number> {
  return broadcastManager.broadcastToRoom(roomName, eventName, payload, exclude);
}

/**
 * Broadcast an event to all connected clients.
 */
export async function publish(
  eventName: string,
  payload: Record<string, unknown>,
  exclude?: string,
): Promise<number> {
  return broadcastManager.broadcastToAll(eventName, payload, exclude);
}

/**
 * Send a direct message to a single client.
 */
export async function sendToClient(
  clientId: string,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  return broadcastManager.sendToClient(clientId, eventName, payload);
}

/**
 * Register a custom event handler for a specific event name.
 */
export function registerEventHandler(eventName: string, handler: WsEventHandler): void {
  logger.info({ event: eventName }, 'Custom event handler registered');
}

// ═════════════════════════════════════════════════
// Constants — Re-exported for convenience
// ═════════════════════════════════════════════════

export const DEFAULT_ROOM = 'general';
export const MCP_ROOM = 'mcp';
export const CHAT_ROOM = 'chat';
export const CHAT_STREAM_ROOM = 'chat-stream';
export const METRICS_ROOM = 'metrics';
export const PROVIDER_ROOM = 'providers';
export const SIMULATE_ROOM = 'simulate';
export const ADMIN_ROOM = 'admin';
export const DEFAULT_PING_INTERVAL = 30_000;
export const MAX_MESSAGE_SIZE = 1024 * 1024;
export const CONNECTION_TIMEOUT = 60_000;
export const DEFAULT_RECONNECT_BASE = 1_000;
export const MAX_RECONNECT_BACKOFF = 30_000;
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = -1;

// ═════════════════════════════════════════════════
// Default Export
// ═════════════════════════════════════════════════

export default {
  EVENT_REGISTRY,
  EVENT_MAP,
  EVENT_COUNT,
  broadcastManager,
  broadcastToRoom,
  publish,
  sendToClient,
  getEventDefinition,
  getEventsByCategory,
  getAllEventNames,
  validateEventPayload,
  registerEventHandler,
};

export type { WsEventHandler, WsEventDefinition, WsClientInfo, WsRoom, ValidationResult } from './types';
