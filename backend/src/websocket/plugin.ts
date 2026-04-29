/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/plugin
 * @description Fastify WebSocket plugin that wires the WebSocket server together.
 *
 * This module registers `@fastify/websocket` with Fastify and sets up:
 *
 * 1. WebSocket route at `/ws`
 * 2. Connection lifecycle (auth, room joining, heartbeat)
 * 3. Message dispatching to event handlers
 * 4. Real-time metrics streaming
 * 5. Graceful shutdown
 *
 * ## Architecture
 *
 * ```
 * ┌──────────────────────────────────────────────────────┐
 * │              Fastify + WebSocket Plugin              │
 * ├──────────────────────────────────────────────────────┤
 * │                                                      │
 * │  Client Connection                                   │
 * │    ├── Auth → Room Join → Heartbeat Setup            │
 * │    ├── Message Parse → Validate → Dispatch           │
 * │    ├── Event Handler (mcp, chat, tool, etc.)         │
 * │    └── Response → Send to Client                     │
 * │                                                      │
 * │  Broadcast Manager ←→ Room Manager ←→ Event Handlers │
 * └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { createWebSocketPlugin } from '@/websocket/plugin';
 *
 * // In your fastify instance:
 * await fastify.register(createWebSocketPlugin());
 * ```
 */

import {WebSocket} from 'ws';
import {nanoid} from 'nanoid';
import roomManager from './rooms';
import {authManager} from './auth';
import {logger} from '@/utils/logger';
import streamManager from './stream-manager';
import {metricsTracker} from './metrics-tracker';
import {dispatchEvent, initEventHandlers} from './handlers';
import {broadcastManager, DEFAULT_PING_INTERVAL, DEFAULT_ROOM, EVENT_REGISTRY, MAX_MESSAGE_SIZE} from './events';
import type {FastifyInstance, FastifyPluginCallback} from 'fastify';

// ════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════

/** WebSocket server configuration */
interface WsServerConfig {
  /** Path for the WebSocket endpoint */
  path: string;
  /** Ping interval in ms */
  pingInterval: number;
  /** Max message size in bytes */
  maxPayload: number;
  /** Whether to enable auth */
  authEnabled: boolean;
  /** Whether to enable message queuing for backpressure */
  messageQueuing: boolean;
  /** Max queue size before dropping messages */
  maxQueueSize: number;
}

/** Default WebSocket server configuration */
const DEFAULT_WS_CONFIG: WsServerConfig = {
  path: '/ws',
  pingInterval: DEFAULT_PING_INTERVAL,
  maxPayload: MAX_MESSAGE_SIZE,
  authEnabled: false,
  messageQueuing: true,
  maxQueueSize: 100,
};

/** Get environment-based overrides for WebSocket config */
function getWsConfig(): WsServerConfig {
  return {
    ...DEFAULT_WS_CONFIG,
    path: process.env.WS_PATH || DEFAULT_WS_CONFIG.path,
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || String(DEFAULT_PING_INTERVAL)),
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD || String(MAX_MESSAGE_SIZE)),
    authEnabled: process.env.WS_AUTH_ENABLED === '1',
    messageQueuing: process.env.WS_MESSAGE_QUEUING !== '0',
    maxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || String(DEFAULT_WS_CONFIG.maxQueueSize)),
  };
}

// ════════════════════════════════════════════════════════════
// Client State Management
// ════════════════════════════════════════════════════════════

/** Message queue entry for backpressure handling */
interface QueueEntry {
  event: string;
  payload: Record<string, unknown>;
  id: string | null;
}

/**
 * Tracks the state of a connected WebSocket client.
 */
interface WsClientState {
  /** Unique client ID */
  clientId: string;
  /** WebSocket connection reference */
  ws: WebSocket;
  /** Whether the client has been authenticated */
  authenticated: boolean;
  /** Room the client is currently in (if any) */
  currentRoom: string | null;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Ping interval timeout ID */
  pingTimer: NodeJS.Timeout | null;
  /** Metrics stream interval ID */
  metricsTimer: NodeJS.Timeout | null;
  /** Whether the client has requested metrics stream */
  metricsStreamActive: boolean;
  /** Metrics stream interval in ms */
  metricsInterval: number;
  /** Session ID from auth manager */
  sessionId: string | null;
  /** Client IP address */
  clientIp: string | null;
  /** Event subscriptions for filtering */
  eventSubscriptions: Set<string> | null;
  /** Message queue for backpressure */
  messageQueue: QueueEntry[];
  /** Whether the queue is currently full */
  isQueueFull: boolean;
}

/** Map of all connected clients, keyed by client ID */
const connectedClients = new Map<string, WsClientState>();

// ════════════════════════════════════════════════════════════
// Message Parsing
// ════════════════════════════════════════════════════════════

/**
 * Parse an incoming WebSocket message string into a structured event object.
 *
 * Expected message format:
 * ```json
 * {
 *   "event": "mcp:tools:list",
 *   "payload": { "category": "builtin" },
 *   "id": "req-123",
 *   "room": "mcp"
 * }
 * ```
 *
 * @param message - Raw string message from WebSocket
 * @returns Parsed event object, or null if parsing failed
 */
function parseMessage(message: string): { event: string; payload: Record<string, unknown>; id: string | null } | null {
  try {
    const parsed = JSON.parse(message);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const event = parsed.event as string;
    const payload = parsed.payload as Record<string, unknown> || {};
    const id = parsed.id as string | null;

    if (!event) {
      return null;
    }

    return {event, payload, id: id ?? null};
  } catch {
    return null;
  }
}

/**
 * Serialize an outgoing message to a JSON string.
 *
 * @param event - Event name
 * @param payload - Event payload
 * @param id - Optional request ID for correlation
 * @returns Serialized JSON string
 */
function serializeMessage(event: string, payload: Record<string, unknown>, id?: string | null): string {
  const message: Record<string, unknown> = {
    event,
    payload,
  };

  if (id) {
    message.id = id;
  }

  return JSON.stringify(message);
}

// ════════════════════════════════════════════════════════════
// Client Lifecycle Management
// ════════════════════════════════════════════════════════════

/**
 * Destroy a client connection and clean up all associated resources.
 *
 * @param clientId - Client ID to destroy
 * @param sendDisconnect - Whether to send disconnect event
 */
function destroyClient(clientId: string, sendDisconnect = true): void {
  const state = connectedClients.get(clientId);
  if (!state) return;

  // Clean up stream manager
  streamManager.cleanupClient(clientId);

  // Clear ping timer
  if (state.pingTimer) {
    clearInterval(state.pingTimer);
    state.pingTimer = null;
  }

  // Clear metrics timer
  if (state.metricsTimer) {
    clearInterval(state.metricsTimer);
    state.metricsTimer = null;
  }

  // Clear message queue
  state.messageQueue = [];
  state.isQueueFull = false;

  // Close WebSocket if still open
  try {
    if (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING) {
      if (sendDisconnect) {
        state.ws.close(1000, 'Server shutdown');
      }
    }
  } catch {
    // Ignore errors during close
  }

  // Remove from broadcast manager and client map
  broadcastManager.removeClient(clientId);
  connectedClients.delete(clientId);

  logger.info({clientId}, 'Client destroyed and cleaned up');
}

/**
 * Start heartbeat ping for a client.
 *
 * @param clientId - Client ID
 * @param interval - Ping interval in ms
 */
function startHeartbeat(clientId: string, interval: number = DEFAULT_PING_INTERVAL): void {
  const state = connectedClients.get(clientId);
  if (!state) return;

  // Clear existing timer
  if (state.pingTimer) {
    clearInterval(state.pingTimer);
  }

  state.pingTimer = setInterval(() => {
    if (state.ws.readyState === WebSocket.OPEN) {
      try {
        const message = serializeMessage('ws:ping', {timestamp: Date.now()});
        state.ws.send(message);
        logger.debug({clientId}, 'Ping sent');
      } catch (err) {
        logger.error({clientId, error: err}, 'Failed to send ping');
        clearInterval(state.pingTimer!);
        state.pingTimer = null;
      }
    } else {
      clearInterval(state.pingTimer!);
      state.pingTimer = null;
      destroyClient(clientId);
    }
  }, interval);
}

/**
 * Start metrics stream for a client.
 *
 * @param clientId - Client ID
 * @param interval - Stream interval in ms
 */
function startMetricsStream(clientId: string, interval: number = 1000): void {
  const state = connectedClients.get(clientId);
  if (!state) return;

  state.metricsInterval = interval;
  state.metricsStreamActive = true;

  // Clear existing timer
  if (state.metricsTimer) {
    clearInterval(state.metricsTimer);
  }

  state.metricsTimer = setInterval(() => {
    if (state.ws.readyState !== WebSocket.OPEN) {
      clearInterval(state.metricsTimer!);
      state.metricsTimer = null;
      state.metricsStreamActive = false;
      return;
    }

    const mem = process.memoryUsage();
    const metrics = metricsTracker.getMetrics();

    const metricsPayload = {
      requestId: nanoid(8),
      requests: {
        total: metrics.requests.total,
        perSecond: metrics.requests.perSecond,
        active: metrics.requests.active,
      },
      latencies: {
        avg: Math.round(metrics.latencies.avg * 100) / 100,
        p50: Math.round(metrics.latencies.p50 * 100) / 100,
        p95: Math.round(metrics.latencies.p95 * 100) / 100,
        p99: Math.round(metrics.latencies.p99 * 100) / 100,
        min: metrics.latencies.min,
        max: metrics.latencies.max,
        count: metrics.latencies.count,
      },
      eventCounts: metrics.eventCounts,
      errors: metrics.errors,
      system: {
        memoryUsage: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external || 0,
        },
        uptime: process.uptime(),
      },
      streams: streamManager.getStats(),
      clients: {
        total: connectedClients.size,
        authenticated: [...connectedClients.values()].reduce((sum, c) => sum + (c.authenticated ? 1 : 0), 0),
      },
      timestamp: new Date().toISOString(),
    };

    const message = serializeMessage('metrics:live:tick', metricsPayload);
    try {
      state.ws.send(message);
      state.lastActivityAt = new Date();
    } catch (err) {
      logger.error({clientId, error: err}, 'Failed to send metrics tick');
      clearInterval(state.metricsTimer!);
      state.metricsTimer = null;
      state.metricsStreamActive = false;
    }
  }, interval);
}

/**
 * Stop metrics stream for a client.
 *
 * @param clientId - Client ID
 */
function stopMetricsStream(clientId: string): void {
  const state = connectedClients.get(clientId);
  if (!state) return;

  if (state.metricsTimer) {
    clearInterval(state.metricsTimer);
    state.metricsTimer = null;
  }

  state.metricsStreamActive = false;
}

/**
 * Create a new client state entry for a WebSocket connection.
 *
 * @param ws - WebSocket connection
 * @param room - Optional room to join immediately
 * @param clientIp - Optional client IP address
 * @returns The created client state
 */
function createClientState(ws: WebSocket, room?: string, clientIp?: string): WsClientState {
  const clientId = nanoid(12);
  const now = new Date();

  const state: WsClientState = {
    clientId,
    ws,
    authenticated: false,
    currentRoom: room || null,
    connectedAt: now,
    lastActivityAt: now,
    pingTimer: null,
    metricsTimer: null,
    metricsStreamActive: false,
    metricsInterval: 1000,
    sessionId: null,
    clientIp: clientIp || null,
    eventSubscriptions: null,
    messageQueue: [],
    isQueueFull: false,
  };

  connectedClients.set(clientId, state);
  broadcastManager.addClient({
    clientId,
    ws,
    authenticated: false,
    room: null,
    connectedAt: now,
    lastActivityAt: now,
  });

  return state;
}

// ════════════════════════════════════════════════════════════
// Authentication
// ════════════════════════════════════════════════════════════

/**
 * Authenticate a client using the configured auth strategy.
 *
 * @param state - Client state
 * @param token - Authentication token
 * @param strategy - Auth strategy to use (default: 'passthrough' for dev)
 * @returns true if authenticated
 */
async function authenticateClient(
  state: WsClientState,
  token: string,
  strategy: string = 'passthrough',
): Promise<boolean> {
  if (!token || token.length < 1) {
    return false;
  }

  const result = await authManager.authenticate(strategy, token, {
    clientIp: state.clientIp || undefined,
    createSession: true,
  });

  if (result.authenticated) {
    state.authenticated = true;
    state.sessionId = result.sessionId || null;
    logger.info({clientId: state.clientId, userId: result.userId}, 'Client authenticated');
    return true;
  }

  logger.warn({clientId: state.clientId, error: result.error}, 'Client authentication failed');
  return false;
}

// ════════════════════════════════════════════════════════════
// Message Dispatch
// ════════════════════════════════════════════════════════════

/**
 * Dispatch an incoming WebSocket message to the appropriate handler.
 *
 * Flow:
 * 1. Parse the message
 * 2. Validate against event schema (if available)
 * 3. Route to handler
 * 4. Send response back to client
 *
 * @param state - Client state
 * @param rawMessage - Raw message string
 */
async function handleMessage(state: WsClientState, rawMessage: string): Promise<void> {
  state.lastActivityAt = new Date();

  // Parse the message
  const parsed = parseMessage(rawMessage);
  if (!parsed) {
    await sendMessageToClient(state, 'ws:error', {
      error: 'Invalid message format',
      hint: 'Message must be valid JSON with an "event" field',
    });
    return;
  }

  const {event, payload, id} = parsed;

  // Track active request for latency measurement
  const requestId = nanoid(16);
  const stopRequest = metricsTracker.startRequest(requestId, event);

  logger.debug({clientId: state.clientId, event, requestId}, 'Received WebSocket message');

  // Handle special events that don't need dispatch
  const specialEvents = ['ws:ping', 'ws:pong', 'ws:disconnect'];
  if (specialEvents.includes(event)) {
    const response = await dispatchEvent(event, payload, state.clientId);
    stopRequest();
    if (response) {
      await sendMessageToClient(state, event, response, id);
    }
    return;
  }

  // Dispatch to handler with error tracking
  let response: Record<string, unknown> | null = null;
  let isError = false;
  try {
    response = await dispatchEvent(event, payload, state.clientId);
  } catch (err) {
    isError = true;
    const message = err instanceof Error ? err.message : String(err);
    response = {
      error: {
        code: -32603,
        message,
      },
    };
  }

  stopRequest();

  if (isError) {
    metricsTracker.trackError(event);
  }

  if (response) {
    await sendMessageToClient(state, event, response, id);
  }
}

/**
 * Check if an event is allowed for a client's subscriptions.
 *
 * @param event - Event name
 * @param subscriptions - Set of subscribed categories
 * @returns true if event is allowed
 */
function isEventAllowed(event: string, subscriptions: Set<string>): boolean {
  if (!subscriptions) return true;

  const eventCategory = event.split(':')[0];
  for (const sub of subscriptions) {
    if (sub === '*' || sub === eventCategory) {
      return true;
    }
  }
  return false;
}

/**
 * Drain the message queue for a client.
 *
 * @param state - Client state
 */
async function drainMessageQueue(state: WsClientState): Promise<void> {
  if (state.isQueueFull) {
    return;
  }

  state.isQueueFull = true;

  while (state.messageQueue.length > 0 && state.ws.readyState === WebSocket.OPEN) {
    const entry = state.messageQueue.shift();
    if (!entry) {
      state.isQueueFull = false;
      return;
    }

    try {
      const serialized = serializeMessage(entry.event, entry.payload, entry.id);
      state.ws.send(serialized);
    } catch {
      state.messageQueue = [];
      state.isQueueFull = false;
      return;
    }
  }

  state.isQueueFull = false;
}

/**
 * Send a message to a specific client.
 *
 * @param state - Client state
 * @param event - Event name
 * @param payload - Payload
 * @param id - Optional request ID
 */
async function sendMessageToClient(
  state: WsClientState,
  event: string,
  payload: Record<string, unknown>,
  id?: string | null,
): Promise<void> {
  if (state.ws.readyState !== WebSocket.OPEN) {
    logger.warn({clientId: state.clientId, event}, 'Cannot send message, connection closed');
    return;
  }

  // Check if client subscribes to this event category
  if (state.eventSubscriptions && !isEventAllowed(event, state.eventSubscriptions)) {
    return;
  }

  // Handle message queuing for backpressure
  if (getWsConfig().messageQueuing && state.ws.readyState === WebSocket.OPEN) {
    try {
      state.ws.send(serializeMessage(event, payload, id));
      return;
    } catch (err) {
      // If send fails due to backpressure, queue the message
      logger.warn({clientId: state.clientId, event}, 'Send failed, queuing message');
      if (state.messageQueue.length >= getWsConfig().maxQueueSize) {
        state.messageQueue.shift();
        logger.warn({clientId: state.clientId, event}, 'Message queue full, dropping oldest message');
      }
      state.messageQueue.push({event, payload, id: id ?? null});
      drainMessageQueue(state);
      return;
    }
  }

  const message = serializeMessage(event, payload, id);
  try {
    state.ws.send(message);
  } catch (err) {
    logger.error({clientId: state.clientId, event, error: err}, 'Failed to send message to client');
    destroyClient(state.clientId, false);
  }
}

// ════════════════════════════════════════════════════════════
// Event Handlers for Connection Lifecycle
// ════════════════════════════════════════════════════════════

/**
 * Handle a new WebSocket connection.
 *
 * Flow:
 * 1. Create client state
 * 2. Authenticate if required
 * 3. Join default room
 * 4. Start heartbeat
 * 5. Send connect event
 *
 * @param ws - WebSocket connection
 * @param request - Fastify request (for IP extraction)
 */
function handleConnection(ws: WebSocket, request?: any): void {
  const clientIp = request?.ip || request?.socket?.remoteAddress || null;
  const state = createClientState(ws, undefined, clientIp);

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = data.toString('utf-8');

      // Check message size
      if (Buffer.byteLength(message, 'utf-8') > getWsConfig().maxPayload) {
        await sendMessageToClient(state, 'ws:error', {
          error: 'Message too large',
          maxSize: getWsConfig().maxPayload,
        });
        return;
      }

      // Special case: auth event (sent immediately after connect)
      try {
        const parsed = JSON.parse(message);
        if (parsed.event === 'ws:auth') {
          const token = parsed.payload?.token as string;
          const strategy = parsed.payload?.strategy as string || 'passthrough';
          if (token) {
            const authenticated = await authenticateClient(state, token, strategy);
            if (authenticated) {
              state.authenticated = true;
              await sendMessageToClient(state, 'ws:auth', {
                authenticated: true,
                message: 'Authentication successful',
                strategy,
              });
            } else {
              await sendMessageToClient(state, 'ws:auth', {
                authenticated: false,
                message: 'Authentication failed',
                strategy,
              });
              return;
            }
          }
        }
      } catch {
        // Not an auth message, continue with normal handling
      }

      await handleMessage(state, message);
    } catch (err) {
      logger.error({error: err}, 'Error handling WebSocket message');
      destroyClient(state.clientId);
    }
  });

  // Handle errors
  ws.on('error', (err) => {
    logger.error({clientId: state.clientId, error: err}, 'WebSocket error');
    destroyClient(state.clientId);
  });

  // Handle close
  ws.on('close', (code, reason) => {
    logger.info({clientId: state.clientId, code, reason: reason.toString()}, 'WebSocket closed');
    destroyClient(state.clientId);
  });

  // Join default room
  roomManager.joinRoom(state.clientId, DEFAULT_ROOM);
  broadcastToRoom('general', 'notify:room_entered', {
    room: DEFAULT_ROOM,
    clientId: state.clientId,
    clientCount: roomManager.getRoomInfo(DEFAULT_ROOM)?.members.size || 0,
  });

  // Start heartbeat
  startHeartbeat(state.clientId, getWsConfig().pingInterval);

  // Send connect event to the client
  const connectPayload = {
    clientId: state.clientId,
    connectedAt: state.connectedAt.toISOString(),
    serverTime: Date.now(),
    uptime: process.uptime(),
    serverVersion: '1.0.0',
    eventCount: EVENT_REGISTRY.length,
    availableRooms: roomManager.getActiveRooms(),
  };

  sendMessageToClient(state, 'ws:connect', connectPayload);

  logger.info({
    clientId: state.clientId,
    totalConnected: connectedClients.size,
  }, 'New WebSocket connection established');
}

/**
 * Broadcast to a specific room using the broadcastManager.
 */
async function broadcastToRoom(
  roomName: string,
  eventName: string,
  payload: Record<string, unknown>,
  exclude?: string,
): Promise<void> {
  broadcastManager.broadcastToRoom(roomName, eventName, payload, exclude);
}

// ════════════════════════════════════════════════════════════
// Fastify Plugin Registration
// ════════════════════════════════════════════════════════════

/**
 * Create the WebSocket Fastify plugin.
 *
 * This plugin:
 * 1. Registers @fastify/websocket
 * 2. Sets up the /ws endpoint
 * 3. Handles connection lifecycle
 * 4. Initializes event handlers and broadcast system
 *
 * @returns Fastify plugin callback function
 */
export function createWebSocketPlugin(): FastifyPluginCallback {
  return async (fastify: FastifyInstance) => {
    // Initialize all systems
    metricsTracker.init();
    authManager.init();
    broadcastManager.init();
    roomManager.init();
    initEventHandlers();

    // Register @fastify/websocket
    await fastify.register(import('@fastify/websocket'));

    // Set up WebSocket route
    fastify.get('/ws', {
      websocket: true,
    }, (socket, request) => {
      handleConnection(socket, request);
    });

    // Expose WebSocket utilities for other parts of the app
    fastify.decorate('ws', {
      /**
       * Broadcast a message to all connected WebSocket clients.
       * @param event - Event name
       * @param payload - Event payload
       */
      broadcast(event: string, payload: Record<string, unknown>): void {
        broadcastManager.broadcastToAll(event, payload);
      },
      /**
       * Send a message to a specific WebSocket client.
       * @param clientId - Client ID
       * @param event - Event name
       * @param payload - Event payload
       */
      sendToClient(clientId: string, event: string, payload: Record<string, unknown>): boolean {
        const state = connectedClients.get(clientId);
        if (!state || state.ws.readyState !== WebSocket.OPEN) return false;

        const message = serializeMessage(event, payload);
        try {
          state.ws.send(message);
          return true;
        } catch {
          return false;
        }
      },
      /**
       * Get the count of connected WebSocket clients.
       */
      getConnectionCount(): number {
        return connectedClients.size;
      },
      /**
       * Get list of all connected client IDs.
       */
      getConnectedClientIds(): string[] {
        return Array.from(connectedClients.keys());
      },
      /**
       * Get room statistics.
       */
      getRoomStats(): {
        rooms: string[];
        totalMembers: number;
      } {
        return {
          rooms: roomManager.getActiveRooms(),
          totalMembers: roomManager.getTotalMemberCount(),
        };
      },
      /**
       * Get live metrics.
       */
      getMetrics() {
        return metricsTracker.getMetrics();
      },
    });

    // Add hook to clean up on server close
    fastify.addHook('onClose', async () => {
      metricsTracker.shutdown();
      authManager.shutdown();
      await cleanupAllConnections();
      broadcastManager.shutdown();
      roomManager.shutdown();
      streamManager.shutdown();
      logger.info('WebSocket server cleaned up');
    });

    logger.info({path: '/ws', eventCount: EVENT_REGISTRY.length}, 'WebSocket plugin registered');
  };
}

// ════════════════════════════════════════════════════════════
// Cleanup and Shutdown
// ════════════════════════════════════════════════════════════

/**
 * Gracefully shut down all WebSocket connections.
 * Sends disconnect events before closing.
 */
async function cleanupAllConnections(): Promise<void> {
  logger.info({count: connectedClients.size}, 'Cleaning up all WebSocket connections');

  const clientIds = Array.from(connectedClients.keys());

  for (const clientId of clientIds) {
    const state = connectedClients.get(clientId);
    if (state) {
      try {
        // Clean up client streams
        streamManager.cleanupClient(clientId);

        // Send disconnect event
        if (state.ws.readyState === WebSocket.OPEN) {
          const message = serializeMessage('ws:disconnect', {
            reason: 'Server shutdown',
            serverTime: Date.now(),
          });
          state.ws.send(message);
        }
      } catch {
        // Ignore errors during shutdown
      }

      destroyClient(clientId, false);
    }
  }

  connectedClients.clear();
  logger.info('All WebSocket connections cleaned up');
}

/**
 * Get the list of all connected client IDs.
 */
export function getConnectedClients(): string[] {
  return Array.from(connectedClients.keys());
}

/**
 * Get the count of connected clients.
 */
export function getConnectionCount(): number {
  return connectedClients.size;
}

// ════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════

export default createWebSocketPlugin;

// Export for testing and external use
export {
  connectedClients,
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
  getWsConfig,
};
