/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * WebSocketContext - Provider component wrapping the entire app with WebSocket state management.
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  ALL_ROOMS,
  type ConnectionStatus,
  type DashboardStats,
  type EventCategory,
  type EventDirection,
  type EventFiltersState,
  type EventLogEntry,
  type ToastType,
  type WebSocketContextProviderProps,
  type WsConnectionState,
  type WsErrorPayload,
  type WsEventType,
  type WsMessagePayload,
  type WsPayload,
  type WsRoom,
} from '@/types/websocket';

// ==================== Toast System ====================

/**
 * Represents a single toast notification item.
 */
interface ToastItem {
  /** Unique identifier for the toast instance. */
  id: string;
  /** The type or severity of the toast (e.g., 'info', 'success', 'error'). */
  type: ToastType;
  /** The headline or title of the toast message. */
  title: string;
  /** The detailed description or body text of the toast message. */
  description: string;
}

/**
 * Context for managing toast notifications throughout the application.
 */
const ToastContext = React.createContext<{
  /** The current list of active toasts. */
  toasts: ToastItem[];
  /**
   * Adds a new toast notification.
   * @param type - The type of the toast.
   * @param title - The title of the toast.
   * @param description - The description of the toast.
   * @param duration - Optional duration in milliseconds before auto-removal.
   * @returns The unique ID of the created toast.
   */
  addToast (type: ToastType, title: string, description: string, duration?: number): string;
  /**
   * Removes a toast notification by its ID.
   * @param id - The unique ID of the toast to remove.
   */
  removeToast(id: string): void;
}>({
  toasts: [],
  addToast: () => '',
  removeToast: () => {},
});

// ==================== Context Definitions ====================

/**
 * The value object provided by the WebSocketContext.
 * Contains all state, methods, and metadata related to the WebSocket connection.
 */
export interface WebSocketContextValue {
  // Connection state
  /** The full connection state object containing detailed metadata. */
  state: WsConnectionState;
  /** Whether the socket is currently open and connected. */
  isConnected: boolean;
  /** Whether the socket is currently attempting to connect. */
  isConnecting: boolean;
  /** Whether the socket is currently disconnected. */
  isDisconnected: boolean;
  /** The current connection status string (e.g., 'connected', 'disconnected'). */
  status: ConnectionStatus;
  /** The calculated latency in milliseconds. */
  latency: number;
  /** The number of clients currently connected to the server (as reported by server). */
  connectedClients: number;
  /** List of rooms the client has currently joined. */
  rooms: WsRoom[];
  /** The count of active rooms the client is currently in. */
  activeRoomCount: number;
  /** Whether the client has successfully authenticated with the server. */
  isAuthenticated: boolean;
  /** The number of reconnection attempts made since the last disconnect. */
  reconnectAttempts: number;
  /** The number of messages currently queued while disconnected. */
  queuedMessages: number;
  /** The total number of events processed since the session started. */
  totalEvents: number;
  /** The calculated rate of events per second. */
  eventsPerSecond: number;
  /** The last error message encountered, if any. */
  lastError: string | null;

  // Core methods
  /** Initiates the WebSocket connection. */
  connect ():void;
  /**
   * Disconnects the WebSocket connection.
   * @param code - Optional close code.
   * @param reason - Optional close reason string.
   */
  disconnect (code?: number, reason?: string):void;
  /**
   * Sends a message to the server.
   * @param type - The event type.
   * @param payload - The data payload.
   * @param room - Optional room to target.
   */
  send (type: WsEventType, payload: WsPayload, room?: WsRoom):void;
  /**
   * Sends a message to a specific room.
   * @param type - The event type.
   * @param payload - The data payload.
   * @param room - The target room.
   */
  sendToRoom (type: WsEventType, payload: WsPayload, room: WsRoom):void;
  /**
   * Sends a message to all connected clients (broadcast).
   * @param type - The event type.
   * @param payload - The data payload.
   */
  sendToAll(type: WsEventType, payload: WsPayload): void;
  /**
   * Joins a specific room.
   * @param room - The room identifier to join.
   */
  joinRoom(room: WsRoom): void;
  /**
   * Leaves a specific room.
   * @param room - The room identifier to leave.
   */
  leaveRoom(room: WsRoom): void;
  /** Leaves all currently joined rooms. */
  leaveAllRooms(): void;
  /**
   * Authenticates the session with the server.
   * @param token - The authentication token.
   * @param method - The authentication method (e.g., 'jwt', 'api_key').
   */
  authenticate(token: string, method?: 'jwt' | 'api_key' | 'oauth2' | 'basic'): void;
  /**
   * Sends a ping request to the server.
   * @returns The timestamp of the ping, or null if not connected.
   */
  ping (): number | null;
  /** Forces an immediate reconnection attempt. */
  forceReconnect(): void;
  /**
   * Updates the WebSocket URL and triggers a reconnect if necessary.
   * @param newUrl - The new WebSocket URL.
   */
  updateUrl(newUrl: string): void;

  // Event log
  /** The full history of logged events. */
  eventLog: EventLogEntry[];
  /** Version counter to signal eventLog changes to consumers without triggering cascade re-renders. */
  eventLogVersion: number;
  /** The list of events currently matching the active filters. */
  filteredEvents: EventLogEntry[];
  /** The current filter state applied to the event log. */
  filters: EventFiltersState;
  /** Setter function to update the current filters. */
  setFilters: React.Dispatch<React.SetStateAction<EventFiltersState>>;
  /** Clears the entire event log history. */
  clearEventLog(): void;
  /** Attempts to send all queued messages immediately. */
  flushMessageQueue(): void;

  // Subscriptions
  /**
   * Subscribes to a specific event type.
   * @param type - The event type to listen for.
   * @param callback - The function to execute when the event is received.
   * @returns An unsubscribe function.
   */
  subscribe: (type: WsEventType, callback: (entry: EventLogEntry) => void) => () => void;
  /**
   * Unsubscribes a specific callback from an event type.
   * @param type - The event type.
   * @param callback - The callback function to remove.
   */
  unsubscribe: (type: WsEventType, callback: (entry: EventLogEntry) => void) => void;

  // Formatters
  /**
   * Formats a duration in seconds into a human-readable string.
   * @param seconds - The duration in seconds.
   * @returns Formatted string (e.g., "1h 30m").
   */
  formatUptime(seconds: number): string;

  // Dashboard
  /** Aggregated statistics for the dashboard view. */
  dashboardStats: DashboardStats;
}

/**
 * React Context holding the WebSocket state and methods.
 */
const WebSocketContext = React.createContext<WebSocketContextValue | undefined>(undefined);

// ==================== Internal Hook ====================

/**
 * Generates a unique identifier string based on the current timestamp and a random string.
 * @returns A unique ID string.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Determines the category of an event based on its type string prefix.
 * @param type - The WebSocket event type string.
 * @returns The corresponding EventCategory enum value.
 */
function getEventCategory(type: WsEventType): EventCategory {
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

/**
 * Default filter state for the event log.
 */
const DEFAULT_FILTERS: EventFiltersState = {
  type: '',
  category: 'all',
  direction: 'all',
  room: 'all',
  searchTerm: '',
  timeRange: 0,
};

/**
 * Internal hook managing the WebSocket connection logic, state, and side effects.
 * @param wsUrl - The WebSocket server URL.
 * @param options - Configuration options for the connection behavior.
 * @returns The context value and toast utility.
 */
function useInternalWebSocket(
  wsUrl?: string,
  options: {
    /** Whether to automatically connect on mount. */
    autoConnect?: boolean;
    /** Initial delay between reconnection attempts in ms. */
    reconnectDelay?: number;
    /** Maximum number of reconnection attempts before giving up. */
    maxReconnectAttempts?: number;
    /** Interval between ping messages in ms. */
    pingInterval?: number;
    /** Authentication token to send on connect. */
    authToken?: string;
    /** List of rooms to join upon connection. */
    initialRooms?: WsRoom[];
    /** Whether to queue messages when disconnected. */
    queueMessages?: boolean;
    /** Callback fired when the connection is established. */
    onConnect?: (state: WsConnectionState) => void;
    /** Callback fired when the connection is closed. */
    onDisconnect?: (reason: string) => void;
    /** Callback fired when a connection error occurs. */
    onError?: (error: WsErrorPayload) => void;
    /** Callback fired when any message is received. */
    onMessage?: (entry: EventLogEntry) => void;
    /** Callback fired when authentication status changes. */
    onAuthChange?: (authenticated: boolean) => void;
    /** Callback fired when the list of joined rooms changes. */
    onRoomChange?: (rooms: WsRoom[]) => void;
  } = {},
) {
  const {
    autoConnect = true,
    reconnectDelay: initialReconnectDelay = 3000,
    maxReconnectAttempts = 10,
    pingInterval = 30000,
    authToken,
    initialRooms = [],
    queueMessages = true,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onAuthChange,
    onRoomChange,
  } = options;

  // ---- Refs for mutable/shared data ----
  /** Reference to the native WebSocket instance. */
  const wsRef = React.useRef<WebSocket | null>(null);
  /** Timer ID for the reconnection timeout. */
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timer ID for the ping interval. */
  const pingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  /** Counter for reconnection attempts (persists across renders). */
  const reconnectAttemptsRef = React.useRef(0);
  /** Mutable reference to the event log history. */
  const eventLogRef = React.useRef<EventLogEntry[]>([]);
  /** Queue for messages to be sent when connection is restored. */
  const messageQueueRef = React.useRef<WsMessagePayload[]>([]);
  /** Map of event type subscriptions. */
  const eventSubscriptionsRef = React.useRef<
    Map<WsEventType, Set<(entry: EventLogEntry) => void>>
  >(new Map());
  /** Mutable flag for connection status to avoid closure staleness. */
  const isConnectedRef = React.useRef(false);

  // ---- State ----
  /** Current connection status. */
  const [status, setStatus] = React.useState<ConnectionStatus>('disconnected');
  /** Current WebSocket URL. */
  const [url, setUrl] = React.useState(wsUrl || `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws`);
  /** Set of currently joined rooms. */
  const [rooms, setRooms] = React.useState<Set<WsRoom>>(new Set(initialRooms));
  /** Number of connected clients reported by server. */
  const [connectedClients, setConnectedClients] = React.useState<number>(0);
  /** Timestamp of the last sent ping. */
  const [lastPing, setLastPing] = React.useState<number | null>(null);
  /** Timestamp of the last received pong. */
  const [lastPong, setLastPong] = React.useState<number | null>(null);
  /** Calculated round-trip latency in ms. */
  const [latency, setLatency] = React.useState(0);
  /** Whether the client is authenticated. */
  const [isAuthenticated, setIsAuthenticated] = React.useState(!!authToken);
  /** The current authentication token stored in state. */
  const [authTokenState, setAuthTokenState] = React.useState<string | null>(authToken ?? null);
  /** Number of reconnection attempts (reactive). */
  const [reconnectAttempts, setReconnectAttempts] = React.useState<number>(0);
  /** Last error message string. */
  const [lastError, setLastError] = React.useState<string | null>(null);
  /** Set of unique client IDs observed. */
  const [clientIds, setClientIds] = React.useState<Set<string>>(new Set());
  /** Metadata received from the server. */
  const [serverMeta, setServerMeta] = React.useState<WsConnectionState['serverMeta']>(null);
  /** Reactive list of event log entries. */
  const [eventLog, setEventLog] = React.useState<EventLogEntry[]>([]);
  /** Version counter to signal eventLog changes to consumers without triggering cascade. */
  const [eventLogVersion, setEventLogVersion] = React.useState(0);
  /** Reactive list of filtered event log entries. */
  const [filteredEvents, setFilteredEvents] = React.useState<EventLogEntry[]>([]);
  /** Current filter settings for the event log. */
  const [filters, setFilters] = React.useState<EventFiltersState>(DEFAULT_FILTERS);
  /** Count of messages currently in the queue. */
  const [queuedMessagesCount, setQueuedMessagesCount] = React.useState<number>(0);
  /** Total count of events processed. */
  const [totalEvents, setTotalEvents] = React.useState<number>(0);
  /** Calculated events per second rate. */
  const [eventsPerSecond, setEventsPerSecond] = React.useState<number>(0);

  // Derived connection booleans
  const isConnected = status === 'connected' && isConnectedRef.current;
  const isConnecting = status === 'connecting';
  const isDisconnected = status === 'disconnected';

  // ---- Helpers ----
  const logEvent = React.useCallback(
    (
      type: WsEventType,
      payload: WsPayload,
      direction: EventDirection,
      room?: WsRoom,
      highlighted = false,
    ): EventLogEntry => {
      const entry: EventLogEntry = {
        id: generateId(),
        message: {
          header: {
            id: generateId(),
            type,
            room,
            timestamp: new Date().toISOString(),
          },
          data: payload,
        },
        type,
        category: getEventCategory(type),
        direction,
        highlighted,
        loggedAt: new Date().toISOString(),
        rawJson: JSON.stringify(payload, null, 2),
      };

      eventLogRef.current.push(entry);
      if (eventLogRef.current.length > 2000) {
        eventLogRef.current = eventLogRef.current.slice(-2000);
      }

      setEventLog([...eventLogRef.current]);
      setEventLogVersion(prev => prev + 1);
      setTotalEvents((prev) => prev + 1);
      onMessage?.(entry);

      return entry;
    },
    [onMessage],
  );

  // ---- Filtering ----
  const applyFilters = React.useCallback(
    (events: EventLogEntry[], f: EventFiltersState) => {
      return events.filter((entry) => {
        if (f.type && !entry.type.includes(f.type)) return false;
        if (f.category !== 'all' && entry.category !== f.category) return false;
        if (f.direction !== 'all' && entry.direction !== f.direction) return false;
        if (f.room !== 'all' && entry.message.header.room !== f.room) return false;
        if (f.searchTerm) {
          const search = f.searchTerm.toLowerCase();
          const searchable = `${entry.type} ${JSON.stringify(entry.message.data)}`.toLowerCase();
          if (!searchable.includes(search)) return false;
        }
        if (f.timeRange) {
          const cutoff = Date.now() - f.timeRange * 60 * 1000;
          if (new Date(entry.loggedAt).getTime() < cutoff) return false;
        }
        return true;
      });
    },
    [],
  );

  // Use eventLogRef.current directly to get live updates while avoiding the infinite loop.
  // eventLog version is used to signal changes to consumers without including the full array in deps.
  const currentEventLog = eventLogRef.current;

  // Re-apply filters whenever eventLog changes (via version) or filters change.
  React.useEffect(() => {
    setFilteredEvents(applyFilters(eventLogRef.current, filters));
  }, [filters, applyFilters, eventLogVersion]);

  // ---- Flush Queue ----
  const flushMessageQueue = React.useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current];
      messageQueueRef.current = [];
      setQueuedMessagesCount(0);

      queue.forEach((msg) => {
        try {
          wsRef.current!.send(JSON.stringify(msg));
          logEvent(msg.header.type, msg.data as WsPayload, 'outbound', msg.header.room);
        } catch {
          messageQueueRef.current.push(msg);
        }
      });
    }
  }, [logEvent]);

  // ---- Disconnect ----
  const disconnect = React.useCallback((code?: number, reason?: string) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(code ?? 1000, reason ?? 'Client disconnect');
      wsRef.current = null;
    }
    isConnectedRef.current = false;
    setStatus('disconnected');
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
  }, []);

  // ---- Send ----
  const send = React.useCallback(
    (type: WsEventType, payload: WsPayload, room?: WsRoom) => {
      const message: WsMessagePayload = {
        header: {
          id: generateId(),
          type,
          room,
          timestamp: new Date().toISOString(),
          clientId: 'client',
        },
        data: payload,
      };

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        logEvent(type, payload, 'outbound', room);
        flushMessageQueue();
      } else if (queueMessages) {
        messageQueueRef.current.push(message);
        setQueuedMessagesCount(messageQueueRef.current.length);
      } else {
        logEvent(type, payload, 'outbound', room, true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logEvent, queueMessages],
  );

  // ---- Auth ----
  const authenticate = React.useCallback(
    (token: string, method: 'jwt' | 'api_key' | 'oauth2' | 'basic' = 'jwt') => {
      setAuthTokenState(token);
      send('ws:auth', { token, method } as WsPayload);
    },
    [send],
  );

  const stopPing = React.useCallback(() => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  // ---- Ping ----
  const ping = React.useCallback((): number | null => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return null;

    const timestamp = Date.now();
    setLastPing(timestamp);
    wsRef.current.send(
      JSON.stringify({
        header: {
          id: generateId(),
          type: 'ws:ping',
          timestamp: new Date().toISOString(),
        },
        data: { timestamp: new Date().toISOString() },
      }),
    );
    return timestamp;
  }, []);

  const startPing = React.useCallback(() => {
    stopPing();
    pingTimerRef.current = setInterval(() => ping(), pingInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ping, pingInterval]);

  // ---- Room Management ----
  const joinRoom = React.useCallback(
    (room: WsRoom) => {
      setRooms((prev) => {
        if (prev.has(room)) return prev;
        const next = new Set(prev);
        next.add(room);
        return next;
      });
      send('ws:room:control', { action: 'join', room } as WsPayload, room);
      onRoomChange?.([...rooms]);
    },
    [send, onRoomChange, rooms],
  );

  // ---- Connect ----
  const connect = React.useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      setStatus('connected');
      return;
    }

    setStatus('connecting');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('connected');
      isConnectedRef.current = true;
      reconnectAttemptsRef.current = 0;
      setReconnectAttempts(0);
      setLastError(null);

      logEvent('ws:connect', { protocol: 'ws', version: '1.0', features: ['streaming', 'rooms', 'auth'] }, 'system');

      // Auth if token provided
      if (authToken) {
        authenticate(authToken, 'jwt');
      }

      // Join initial rooms
      initialRooms.forEach((room) => joinRoom(room));

      // Start ping
      startPing();

      onConnect?.({
        status,
        url,
        rooms,
        connectedClients,
        lastPing,
        lastPong,
        latency,
        isAuthenticated,
        authToken: authTokenState,
        reconnectAttempts,
        maxReconnectAttempts,
        reconnectDelay: initialReconnectDelay,
        messageQueue: messageQueueRef.current,
        lastError,
        clientIds,
        serverMeta,
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed: Record<string, any> = JSON.parse(event.data as string) as WsMessagePayload;
        const entry = logEvent(
          parsed.header.type,
          parsed.data,
          'inbound',
          parsed.header.room,
        );

        if (parsed.header.clientId) {
          setClientIds((prev) => {
            const next = new Set(prev);
            next.add(parsed.header.clientId!);
            return next;
          });
        }

        if ('connectedClients' in parsed.data) {
          setConnectedClients(((parsed.data as unknown as Record<string, unknown>) as any).connectedClients);
        }

        if ('serverMeta' in parsed.data) {
          setServerMeta((parsed.data as unknown as Record<string, unknown>) as {
            name: string;
            version: string;
            features: string[];
            uptime: number;
          });
        }

        if (parsed.header.type === 'ws:pong' && 'latency' in parsed.data) {
          setLatency((parsed.data as Record<string, unknown>).latency as number);
          setLastPong(Date.now());
        }

        if (parsed.header.type === 'ws:auth' && parsed.data) {
          const authData = parsed.data as { success?: boolean };
          if (authData?.success !== false) {
            setIsAuthenticated(true);
            onAuthChange?.(true);
          }
        }

        if (parsed.header.type === 'ws:room:control') {
          const roomData = parsed.data as { action?: string; room?: WsRoom };
          if (roomData?.action === 'join') {
            setRooms((prev) => {
              const next = new Set(prev);
              next.add(roomData.room!);
              return next;
            });
          } else if (roomData?.action === 'leave' && roomData.room) {
            setRooms((prev) => {
              const next = new Set(prev);
              next.delete(roomData.room);
              return next;
            });
          }
        }

        if (parsed.header.type === 'system:info' && parsed.data) {
          const meta = parsed.data as {
            name?: string;
            version?: string;
            features?: string[];
            uptime?: number;
          };
          setServerMeta({
            name: meta.name ?? 'mcp-server',
            version: meta.version ?? '',
            features: meta.features ?? [],
            uptime: meta.uptime ?? 0,
          });
        }

        // Trigger subscriptions
        const subs = eventSubscriptionsRef.current.get(parsed.header.type);
        if (subs) {
          subs.forEach((sub) => sub(entry));
        }
      } catch {
        logEvent('ws:error', { code: 'PARSE_ERROR', message: 'Failed to parse message' }, 'system');
      }
    };

    ws.onerror = () => {
      const errorMsg = 'WebSocket error occurred';
      setLastError(errorMsg);
      const errorPayload: WsErrorPayload = { code: 'WS_ERROR', message: errorMsg };
      logEvent('ws:error', errorPayload, 'system');
      onError?.(errorPayload);
    };

    ws.onclose = (event: CloseEvent) => {
      isConnectedRef.current = false;
      setStatus('disconnected');
      stopPing();

      logEvent('ws:disconnect', { reason: event.reason, code: event.code }, 'system');
      onDisconnect?.(event.reason || 'Connection closed');

      if (autoConnect) {
        reconnectAttemptsRef.current += 1;
        setReconnectAttempts(reconnectAttemptsRef.current);

        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          const delay = initialReconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1);
          reconnectTimerRef.current = setTimeout(() => {
            logEvent('ws:reconnect', { attempt: reconnectAttemptsRef.current, maxAttempts: maxReconnectAttempts, delay, reason: 'auto-reconnect' }, 'system');

            connect();
          }, delay);
        } else {
          setLastError('Max reconnection attempts reached');
        }
      }
    };

    wsRef.current = ws;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    url,
    autoConnect,
    initialReconnectDelay,
    maxReconnectAttempts,
    authToken,
    initialRooms,
    logEvent,
    onConnect,
    onDisconnect,
    onError,
  ]);

  const sendToRoom = React.useCallback(
    (type: WsEventType, payload: WsPayload, room: WsRoom) => send(type, payload, room),
    [send],
  );

  const sendToAll = React.useCallback(
    (type: WsEventType, payload: WsPayload) => send(type, payload),
    [send],
  );

  const leaveRoom = React.useCallback(
    (room: WsRoom) => {
      setRooms((prev) => {
        const next = new Set(prev);
        next.delete(room);
        return next;
      });
      send('ws:room:control', { action: 'leave', room } as WsPayload, room);
      onRoomChange?.([...rooms]);
    },
    [send, onRoomChange, rooms],
  );

  const leaveAllRooms = React.useCallback(() => {
    const currentRooms = [...rooms];
    currentRooms.forEach((room) => leaveRoom(room));
  }, [rooms, leaveRoom]);

  // ---- Subscribe ----
  const subscribe = React.useCallback(
    (type: WsEventType, callback: (entry: EventLogEntry) => void) => {
      const subs = eventSubscriptionsRef.current.get(type) ?? new Set();
      subs.add(callback);
      eventSubscriptionsRef.current.set(type, subs);
      return () => {
        subs.delete(callback);
      };
    },
    [],
  );

  const unsubscribe = React.useCallback(
    (type: WsEventType, callback: (entry: EventLogEntry) => void) => {
      const subs = eventSubscriptionsRef.current.get(type);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          eventSubscriptionsRef.current.delete(type);
        }
      }
    },
    [],
  );

  // ---- Utilities ----
  const clearEventLog = React.useCallback(() => {
    eventLogRef.current = [];
    setEventLog([]);
    setFilteredEvents([]);
    setTotalEvents(0);
    setEventLogVersion(prev => prev + 1);
  }, []);

  const forceReconnect = React.useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  const updateUrl = React.useCallback((newUrl: string) => setUrl(newUrl), []);

  const formatUptime = React.useCallback((seconds: number): string => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }, []);

  const dashboardStats = React.useMemo<DashboardStats>(
    () => ({
      connectedClients,
      activeRooms: rooms.size,
      totalRooms: ALL_ROOMS.length,
      eventsPerSecond,
      averageLatency: latency,
      totalEvents,
      queuedMessages: queuedMessagesCount,
      isAuthenticated,
      serverUptime: serverMeta?.uptime ?? 0,
      formattedUptime: formatUptime(serverMeta?.uptime ?? 0),
    }),
    [connectedClients, rooms.size, eventsPerSecond, latency, totalEvents, queuedMessagesCount, isAuthenticated, serverMeta, formatUptime],
  );

  // ---- Effects ----
  React.useEffect(() => {
    if (autoConnect && status === 'disconnected') {
      connect();
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [autoConnect, connect, status]);

  React.useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ---- Return Value ----
  const contextValue: WebSocketContextValue = React.useMemo(
    () => ({
      state: {
        status,
        url,
        rooms: new Set(rooms),
        connectedClients,
        lastPing,
        lastPong,
        latency,
        isAuthenticated,
        authToken: authTokenState,
        reconnectAttempts,
        maxReconnectAttempts,
        reconnectDelay: initialReconnectDelay,
        messageQueue: messageQueueRef.current,
        lastError,
        clientIds,
        serverMeta,
      },
      isConnected,
      isConnecting,
      isDisconnected,
      status,
      latency,
      connectedClients,
      rooms: [...rooms],
      activeRoomCount: rooms.size,
      isAuthenticated,
      reconnectAttempts,
      queuedMessages: queuedMessagesCount,
      totalEvents,
      eventsPerSecond,
      lastError,
      connect,
      disconnect,
      send,
      sendToRoom,
      sendToAll,
      joinRoom,
      leaveRoom,
      leaveAllRooms,
      authenticate,
      ping,
      forceReconnect,
      updateUrl,
      eventLog: currentEventLog,
      eventLogVersion,
      filteredEvents,
      filters,
      setFilters,
      clearEventLog,
      flushMessageQueue,
      subscribe,
      unsubscribe,
      formatUptime,
      dashboardStats,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      status,
      url,
      rooms,
      connectedClients,
      lastPing,
      lastPong,
      latency,
      isAuthenticated,
      authTokenState,
      reconnectAttempts,
      queuedMessagesCount,
      totalEvents,
      eventsPerSecond,
      lastError,
      serverMeta,
      isConnected,
      isConnecting,
      isDisconnected,
      connect,
      disconnect,
      send,
      sendToRoom,
      sendToAll,
      joinRoom,
      leaveRoom,
      leaveAllRooms,
      authenticate,
      ping,
      forceReconnect,
      updateUrl,
      eventLogVersion,
      filteredEvents,
      filters,
      clearEventLog,
      flushMessageQueue,
      subscribe,
      unsubscribe,
      formatUptime,
      dashboardStats,
      maxReconnectAttempts,
      initialReconnectDelay,
    ],
  );

  return { contextValue, addToast };
}

function addToast(
  toasts: ToastItem[],
  type: ToastType,
  title: string,
  description: string,
  maxToasts = 6,
): ToastItem[] {
  const id = generateId();
  const item = { id, type, title: title as string, description, } as unknown as ToastItem;
  return [...toasts, item].slice(-maxToasts);
}

function removeToast(toasts: ToastItem[], id: string): ToastItem[] {
  return toasts.filter((t) => t.id !== id);
}

// ==================== Provider Component ====================

export function WebSocketProvider({
  children,
  wsUrl,
  autoConnect = true,
  reconnectDelay = 3000,
  maxReconnectAttempts = 10,
  pingInterval = 30000,
  authToken,
  initialRooms = [],
  queueMessages = true,
  onConnect,
  onDisconnect,
  onError,
  onMessage,
  onAuthChange,
  onRoomChange,
}: WebSocketContextProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  // Call the internal hook
  const { contextValue } = useInternalWebSocket(wsUrl, {
    autoConnect,
    reconnectDelay,
    maxReconnectAttempts,
    pingInterval,
    authToken,
    initialRooms,
    queueMessages,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onAuthChange,
    onRoomChange,
  });

  // ---- Toast helpers ----
  const addToast = React.useCallback(
    (type: ToastType, title: string, description: string, duration = 5000) => {
      const id = generateId();
      const item: ToastItem = { id, type, title, description };
      setToasts((prev) => {
        const next = [...prev, item];
        return next.slice(-6);
      });
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
      return id;
    },
    [],
  ) as (type: ToastType, title: string, description: string, duration?: number) => string;

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <WebSocketContext.Provider value={contextValue}>
        {children}
      </WebSocketContext.Provider>
    </ToastContext.Provider>
  );
}

// ==================== Exported Hooks ====================

// eslint-disable-next-line react-refresh/only-export-components
export function useWebSocket(): WebSocketContextValue {
  const ctx = React.useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return React.useContext(ToastContext);
}
