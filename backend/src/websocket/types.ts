/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/types
 * @description Centralized TypeScript types and interfaces for the WebSocket system.
 *
 * This module contains all TypeScript interfaces, type aliases, and utility types
 * used throughout the WebSocket module. It extracts these from `events.ts` into a
 * dedicated file to improve code organization and maintainability.
 *
 * ## Type Categories
 *
 * - **Event Names** — Union types for valid event names
 * - **Event Definitions** — Metadata types for event registration
 * - **Message Shapes** — Incoming/outgoing message structures
 * - **Handler Types** — Event handler function signatures
 * - **Client Types** — Client connection state and info
 * - **Room Types** — Room structures and metadata
 * - **Broadcast Types** — Broadcast manager interfaces
 * - **Utility Types** — Helper types for validation and error handling
 *
 * ## Usage Example
 *
 * ```typescript
 * import type { WsEventName, WsEventHandler, WsIncomingMessage } from '@/websocket/types';
 *
 * // Define a typed event handler
 * const handler: WsEventHandler = async (event, payload, clientId) => {
 *   if (event === 'mcp:tools:list') {
 *     return { tools: [] };
 *   }
 *   return null;
 * };
 *
 * // Validate incoming message shape
 * const message: WsIncomingMessage = {
 *   event: 'chat:send',
 *   payload: { message: 'Hello' },
 * };
 * ```
 */

import type {z} from 'zod';

// ════════════════════════════════════════════════════════════════
// Event Name Types — Union types for valid event names
// ════════════════════════════════════════════════════════════════

/**
 * All valid WebSocket event names in the system.
 * This union type ensures type safety when specifying event names.
 */
export type WsEventName =
// ── Core Events ──
  | 'ws:connect'
  | 'ws:disconnect'
  | 'ws:error'
  | 'ws:ping'
  | 'ws:pong'
  | 'ws:auth'
  | 'ws:reconnect'
  | 'ws:room:control'
  | 'ws:connection:close'

  // ── MCP Protocol Events ──
  | 'mcp:tools:list'
  | 'mcp:tools:call'
  | 'mcp:tools:list_changed'
  | 'mcp:resources:list'
  | 'mcp:resources:read'
  | 'mcp:resources:list_changed'
  | 'mcp:prompts:list'
  | 'mcp:prompts:get'
  | 'mcp:logging:set_level'

  // ── Chat Events ──
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

  // ── Tool Events ──
  | 'tool:call'
  | 'tool:result'
  | 'tool:error'
  | 'tool:list_changed'

  // ── Provider Events ──
  | 'provider:list'
  | 'provider:health'
  | 'provider:status:change'
  | 'provider:switch'

  // ── Simulation Events ──
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

  // ── Metrics Events ──
  | 'metrics:live:start'
  | 'metrics:live:tick'
  | 'metrics:live:stop'
  | 'metrics:fetch'

  // ── System Events ──
  | 'system:health'
  | 'system:info'
  | 'system:shutdown'
  | 'system:uptime'
  | 'system:version'

  // ── Notification Events ──
  | 'notify:to:room'
  | 'notify:to:all'
  | 'notify:room_entered'
  | 'notify:room_exited'

  // ── Generic Request ──
  | 'request';

/**
 * Category classification for WebSocket events.
 * Each event belongs to exactly one category.
 */
export type WsEventCategory =
  | 'core'
  | 'mcp'
  | 'chat'
  | 'tool'
  | 'provider'
  | 'simulation'
  | 'metrics'
  | 'system'
  | 'notification'
  | 'generic';

/**
 * Data flow direction for events.
 * - `clientToServer`: Client initiates, server responds
 * - `serverToClient`: Server pushes notification to client
 * - `bidirectional`: Can flow in both directions
 */
export type WsEventDirection = 'clientToServer' | 'serverToClient' | 'bidirectional';

/**
 * Whether an event is a notification (fire-and-forget).
 * Notifications do not expect a response from the recipient.
 */
export type WsEventNotification = boolean;

// ════════════════════════════════════════════════════════════════
// Room Types — Room structures and metadata
// ════════════════════════════════════════════════════════════════

/**
 * Status of a WebSocket room.
 */
export type RoomStatus = 'active' | 'paused' | 'closed' | 'draining';

/**
 * Purpose classification for rooms.
 * Determines how the room behaves and what it's used for.
 */
export type RoomPurpose =
  | 'general'
  | 'mcp'
  | 'chat'
  | 'chat-stream'
  | 'providers'
  | 'simulate'
  | 'metrics'
  | 'admin'
  | 'custom';

/**
 * Lifecycle hook callback type for room events.
 */
export type RoomHookFn = (room: WsRoom) => void | Promise<void>;

/**
 * Extended room structure with membership tracking.
 */
export interface WsRoom {
  /** Unique room name */
  name: string;
  /** Current room status */
  status: RoomStatus;
  /** Set of connected client IDs */
  members: Set<string>;
  /** Room creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Total messages broadcast in this room */
  messageCount: number;
}

/**
 * Metadata for a WebSocket room.
 */
export interface WsRoomMetadata {
  /** Human-readable room description */
  description?: string;
  /** Tags for filtering and grouping rooms */
  tags?: string[];
  /** Room purpose classification */
  purpose?: RoomPurpose;
  /** Maximum member capacity (-1 for unlimited) */
  maxMembers?: number;
  /** Whether to announce new joins to room members */
  announceJoin: boolean;
  /** Whether to auto-close the room when empty */
  autoCloseOnEmpty: boolean;
  /** Additional custom metadata */
  custom: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════
// Client Types — Client connection state and info
// ════════════════════════════════════════════════════════════════

/**
 * Client information structure for room membership tracking.
 */
export interface WsClientInfo {
  /** Unique client identifier */
  clientId: string;
  /** The WebSocket connection */
  ws: import('ws').WebSocket;
  /** Whether the client has been authenticated */
  authenticated: boolean;
  /** Current room the client is in (null if in none) */
  room: string | null;
  /** Timestamp when the client connected */
  connectedAt: Date;
  /** Timestamp of the last activity */
  lastActivityAt: Date;
}

/**
 * Extended client state with connection management details.
 * Used internally by the WebSocket plugin.
 */
export interface WsClientState {
  /** Unique client identifier */
  clientId: string;
  /** WebSocket connection reference */
  ws: import('ws').WebSocket;
  /** Whether the client has been authenticated */
  authenticated: boolean;
  /** Current room the client is in (null if in none) */
  currentRoom: string | null;
  /** Timestamp when the client connected */
  connectedAt: Date;
  /** Timestamp of the last activity */
  lastActivityAt: Date;
  /** Heartbeat ping interval timeout */
  pingTimer: NodeJS.Timeout | null;
  /** Metrics stream interval timeout */
  metricsTimer: NodeJS.Timeout | null;
  /** Whether the metrics stream is active */
  metricsStreamActive: boolean;
  /** Metrics stream interval in milliseconds */
  metricsInterval: number;
}

// ════════════════════════════════════════════════════════════════
// Message Shapes — Incoming/outgoing message structures
// ════════════════════════════════════════════════════════════════

/**
 * Shape of an incoming WebSocket message from a client.
 * Represents the parsed structure of a message received via WebSocket.
 */
export interface WsIncomingMessage {
  /** Event name identifying the type of message */
  event: WsEventName;
  /** Event payload — structure varies by event type */
  payload?: Record<string, unknown>;
  /** Optional request ID for correlating requests with responses */
  id?: string;
  /** Optional room to join upon receiving this message */
  room?: string;
}

/**
 * Shape of an outgoing WebSocket message sent to a client.
 * Represents the structure of a message sent via WebSocket.
 */
export interface WsOutgoingMessage {
  /** Event name identifying the type of message */
  event: WsEventName | string;
  /** Event payload */
  payload: Record<string, unknown>;
  /** Optional request ID for correlating requests with responses */
  id?: string;
}

// ════════════════════════════════════════════════════════════════
// Event Definition Types — Metadata types for event registration
// ════════════════════════════════════════════════════════════════

/**
 * Metadata describing a WebSocket event.
 * Used for documentation, routing, and validation during event registration.
 */
export interface WsEventDefinition {
  /** Unique event name (e.g., "mcp:tools:list") */
  name: WsEventName;
  /** Human-readable description of the event */
  description: string;
  /** Event category classification */
  category: WsEventCategory;
  /** Data flow direction: client→server, server→client, or both */
  direction: WsEventDirection;
  /** Whether this event is a notification (no response expected) */
  isNotification: WsEventNotification;
  /** Zod schema for validating the event's payload */
  schema: z.ZodTypeAny;
  /** Default room to auto-subscribe clients to, if any */
  defaultRoom?: string;
}

// ════════════════════════════════════════════════════════════════
// Handler Types — Event handler function signatures
// ════════════════════════════════════════════════════════════════

/**
 * Handler function type for processing incoming WebSocket events.
 *
 * Each handler receives:
 * - The event name
 * - The validated payload
 * - The client ID of the sender
 *
 * It can return:
 * - A payload object to send back as a response
 * - null to send no response
 * - void (same as null)
 *
 * @example
 * ```typescript
 * const handler: WsEventHandler = async (event, payload, clientId) => {
 *   if (event === 'mcp:tools:list') {
 *     return { tools: getTools() };
 *   }
 *   return null; // No response for other events
 * };
 * ```
 */
export type WsEventHandler = (
  event: WsEventName,
  payload: Record<string, unknown>,
  clientId: string,
) => Promise<Record<string, unknown> | null | void>;

// ════════════════════════════════════════════════════════════════
// Broadcast Types — Broadcast manager interfaces
// ════════════════════════════════════════════════════════════════

/**
 * Interface for the broadcast manager.
 * Provides room-based publish/subscribe functionality for WebSocket clients.
 */
export interface IBroadcastManager {
  /** Initialize the broadcast manager */
  init(): void;

  /**
   * Register a new client connection.
   * @param clientInfo - Client metadata and WebSocket reference
   */
  addClient(clientInfo: WsClientInfo): void;

  /**
   * Remove a client from the system.
   * Also removes the client from any rooms it was in.
   * @param clientId - Client identifier to remove
   */
  removeClient(clientId: string): void;

  /**
   * Join a client to a room.
   * Creates the room if it doesn't exist.
   * @param clientId - Client to join
   * @param roomName - Room to join
   * @returns The room the client was joined to
   */
  joinRoom(clientId: string, roomName: string): WsRoom | null;

  /**
   * Leave a room.
   * @param clientId - Client to remove from the room
   * @param roomName - Room to leave
   */
  leaveRoom(clientId: string, roomName: string): void;

  /**
   * Broadcast an event to all clients in a specific room.
   * @param roomName - Room to broadcast to
   * @param eventName - Event name to broadcast
   * @param payload - Event payload
   * @param exclude - Optional client ID to exclude from broadcast
   * @returns Number of clients the message was sent to
   */
  broadcastToRoom(
    roomName: string,
    eventName: string,
    payload: Record<string, unknown>,
    exclude?: string,
  ): number;

  /**
   * Broadcast an event to ALL connected clients across all rooms.
   * @param eventName - Event name to broadcast
   * @param payload - Event payload
   * @param exclude - Optional client ID to exclude from broadcast
   * @returns Number of clients the message was sent to
   */
  broadcastToAll(
    eventName: string,
    payload: Record<string, unknown>,
    exclude?: string,
  ): number;

  /**
   * Send a direct message to a specific client.
   * @param clientId - Target client ID
   * @param eventName - Event name
   * @param payload - Event payload
   * @returns true if the message was sent successfully
   */
  sendToClient(
    clientId: string,
    eventName: string,
    payload: Record<string, unknown>,
  ): boolean;

  /**
   * Get the list of clients in a room.
   * @param roomName - Room name to query
   * @returns Array of client IDs in the room
   */
  getRoomClients(roomName: string): string[];

  /**
   * Get the count of clients in a room.
   * @param roomName - Room name to query
   * @returns Number of clients in the room
   */
  getRoomClientCount(roomName: string): number;

  /**
   * Get the total number of connected clients across all rooms.
   */
  getTotalConnectedClients(): number;

  /**
   * Get a list of all active rooms.
   */
  getActiveRooms(): string[];

  /**
   * Shutdown the broadcast manager.
   * Removes all room references.
   */
  shutdown(): void;
}

// ════════════════════════════════════════════════════════════════
// Error Handling Types
// ════════════════════════════════════════════════════════════════

/**
 * Standard WebSocket error response envelope.
 * All error responses sent to clients should follow this structure.
 */
export interface WsErrorResponse {
  /** Error code (numeric constant from predefined error codes) */
  code: number;
  /** Human-readable error message */
  message: string;
  /** Additional context data (optional) */
  data?: unknown;
  /** Optional hint for resolving the error */
  hint?: string;
  /** Optional timestamp of when the error occurred */
  timestamp?: string;
}

/**
 * Type guard type for validating WsErrorResponse objects.
 */
export interface WsTypedErrorResponse<C extends number> extends WsErrorResponse {
  code: C;
}

// ════════════════════════════════════════════════════════════════
// Validation Utility Types
// ════════════════════════════════════════════════════════════════

/**
 * Result of validating an event payload against a schema.
 */
export interface ValidationResult {
  /** Whether the payload is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
}

// ════════════════════════════════════════════════════════════════
// Utility Types — Helper types for the WebSocket module
// ════════════════════════════════════════════════════════════════

/**
 * Union of all event names that can be sent from client to server.
 */
export type WsClientToServerEvent = Extract<
  WsEventName,
  | 'ws:ping'
  | 'ws:pong'
  | 'ws:auth'
  | 'ws:reconnect'
  | 'ws:room:control'
  | 'ws:connection:close'
  | 'mcp:tools:call'
  | 'mcp:resources:read'
  | 'mcp:prompts:get'
  | 'mcp:logging:set_level'
  | 'chat:send'
  | 'chat:stream:start'
  | 'chat:stream:pause'
  | 'chat:stream:resume'
  | 'chat:history'
  | 'chat:conversations:list'
  | 'chat:conversations:get'
  | 'chat:conversations:delete'
  | 'tool:call'
  | 'provider:health'
  | 'provider:switch'
  | 'simulate:run'
  | 'simulate:pause'
  | 'simulate:resume'
  | 'simulate:abort'
  | 'simulate:status'
  | 'simulate:mocks:list'
  | 'simulate:mocks:set'
  | 'simulate:mocks:clear'
  | 'metrics:live:start'
  | 'metrics:live:stop'
  | 'metrics:fetch'
  | 'system:health'
  | 'system:info'
  | 'system:shutdown'
  | 'system:uptime'
  | 'system:version'
  | 'notify:to:room'
  | 'notify:to:all'
  | 'request'
>;

/**
 * Union of all event names that can be sent from server to client.
 */
export type WsServerToClientEvent = Extract<
  WsEventName,
  | 'ws:connect'
  | 'ws:disconnect'
  | 'ws:error'
  | 'ws:pong'
  | 'ws:room:control'
  | 'mcp:tools:list'
  | 'mcp:tools:list_changed'
  | 'mcp:resources:list'
  | 'mcp:resources:list_changed'
  | 'mcp:prompts:list'
  | 'chat:stream:chunk'
  | 'chat:stream:done'
  | 'chat:stream:error'
  | 'chat:history'
  | 'chat:conversations:list'
  | 'chat:conversations:get'
  | 'tool:result'
  | 'tool:error'
  | 'provider:list'
  | 'provider:health'
  | 'provider:status:change'
  | 'simulate:scenarios:list'
  | 'simulate:progress'
  | 'simulate:result'
  | 'simulate:mocks:list'
  | 'metrics:live:tick'
  | 'system:health'
  | 'system:info'
  | 'notify:room_entered'
  | 'notify:room_exited'
>;

/**
 * Utility type to get event payloads by event name.
 * Used for creating type-safe event dispatch functions.
 */
export type WsEventPayloadMap = {
  // Core
  'ws:ping': { timestamp?: number; echoed?: number };
  'ws:pong': { timestamp?: number; echoed?: number };
  'ws:auth': { token: string; method?: 'token' | 'oauth' | 'api-key' };
  'ws:reconnect': { interval?: number; maxAttempts?: number };
  'ws:room:control': { room: string; action: 'join' | 'leave' };
  'ws:connection:close': { reason?: string; immediate?: boolean };

  // MCP
  'mcp:tools:list': { cursor?: string; category?: string };
  'mcp:tools:call': { name: string; arguments?: Record<string, unknown> };
  'mcp:resources:list': { cursor?: string };
  'mcp:resources:read': { uri: string };
  'mcp:prompts:list': { cursor?: string };
  'mcp:prompts:get': { name: string; arguments?: Record<string, string> };
  'mcp:logging:set_level': { level: string };

  // Chat
  'chat:send': {
    message: string;
    conversationId?: string;
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number
  };
  'chat:stream:start': { message: string; conversationId?: string; provider?: string; model?: string };
  'chat:stream:pause': { streamId?: string; conversationId?: string };
  'chat:stream:resume': { streamId?: string; conversationId?: string };
  'chat:history': { conversationId: string; limit?: number; offset?: number };
  'chat:conversations:list': { limit?: number; offset?: number };
  'chat:conversations:get': { conversationId: string };
  'chat:conversations:delete': { conversationId: string };

  // Tool
  'tool:call': { name: string; arguments?: Record<string, unknown> };

  // Provider
  'provider:list': Record<string, never>;
  'provider:health': { name?: string };
  'provider:switch': { name: string };

  // Simulation
  'simulate:scenarios:list': Record<string, never>;
  'simulate:run': {
    name: string;
    description?: string;
    steps?: unknown[];
    setupMocks?: boolean;
    cleanupMocks?: boolean
  };
  'simulate:pause': { name: string };
  'simulate:resume': { name: string };
  'simulate:abort': { name: string; reason?: string };
  'simulate:status': { name: string };
  'simulate:mocks:list': { tool?: string };
  'simulate:mocks:set': { tool: string; content: unknown[]; isError?: boolean; delayMs?: number; failureRate?: number };
  'simulate:mocks:clear': { tool?: string };

  // Metrics
  'metrics:live:start': { interval?: number };
  'metrics:live:stop': { interval?: number };
  'metrics:fetch': { labels?: string[] };

  // System
  'system:health': { verbose?: boolean };
  'system:info': Record<string, never>;
  'system:shutdown': { reason?: string };
  'system:uptime': Record<string, never>;
  'system:version': Record<string, never>;

  // Notification
  'notify:to:room': { room: string; event: string; payload?: Record<string, unknown> };
  'notify:to:all': { event: string; payload?: Record<string, unknown> };

  // Generic
  'request': Record<string, unknown>;
};

// ════════════════════════════════════════════════════════════════
// Default Exports
// ════════════════════════════════════════════════════════════════

export default {
  // Event name types
  WsEventName: {} as WsEventName,
  WsEventCategory: {} as WsEventCategory,
  WsEventDirection: {} as WsEventDirection,
  WsEventNotification: {} as WsEventNotification,

  // Room types
  WsRoom: {} as WsRoom,
  WsRoomMetadata: {} as WsRoomMetadata,

  // Client types
  WsClientInfo: {} as WsClientInfo,
  WsClientState: {} as WsClientState,

  // Message types
  WsIncomingMessage: {} as WsIncomingMessage,
  WsOutgoingMessage: {} as WsOutgoingMessage,

  // Event definition type
  WsEventDefinition: {} as WsEventDefinition,

  // Handler type
  WsEventHandler: {} as WsEventHandler,

  // Broadcast interface
  IBroadcastManager: {} as IBroadcastManager,

  // Error types
  WsErrorResponse: {} as WsErrorResponse,

  // Validation types
  ValidationResult: {} as ValidationResult,
};
