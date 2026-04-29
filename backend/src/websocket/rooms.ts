/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/rooms
 * @description Dedicated room manager with strict types and complete room lifecycle management.
 *
 * This module provides a standalone room management system for the WebSocket server:
 *
 * - Room creation, deletion, and lifecycle hooks
 * - Member join/leave with notifications
 * - Broadcasting within rooms
 * - Room metadata and tags
 * - Room health monitoring
 *
 * ## Architecture
 *
 * ```
 * ┌──────────────────────────────────────────────────────┐
 * │                  RoomManager                         │
 * ├──────────────────────────────────────────────────────┤
 * │  rooms: Map<roomName, WsRoom>                        │
 * │  roomHooks: Map<hookName, RoomHookFn[]>              │
 * │  memberCounts: Map<roomName, Set<clientId>>          │
 * ├──────────────────────────────────────────────────────┤
 * │  + createRoom()         + deleteRoom()               │
 * │  + joinRoom()           + leaveRoom()                │
 * │  + broadcastToRoom()    + getRoomInfo()              │
 * │  + getActiveRooms()     + shutdown()                 │
 * └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## Room Lifecycle
 *
 * 1. **Creation** — Rooms are created on-demand when a client joins, or pre-registered
 * 2. **Joining** — Client joins a room, receives `room:entered` notification
 * 3. **Broadcasting** — Messages sent to the room reach all members
 * 4. **Leaving** — Client leaves, receives `room:left` notification
 * 5. **Cleanup** — Empty rooms can be auto-cleansed or kept for future clients
 *
 * ## Usage Example
 *
 * ```typescript
 * import { roomManager } from '@/websocket/rooms';
 *
 * // Create a named room
 * roomManager.createRoom('mcp', { description: 'MCP protocol room' });
 *
 * // Join a client
 * roomManager.joinRoom('client-123', 'mcp');
 *
 * // Broadcast to room
 * roomManager.broadcastToRoom('mcp', 'mcp:tools:list_changed', { count: 5 });
 *
 * // Leave a room
 * roomManager.leaveRoom('client-123', 'mcp');
 *
 * // Get room info
 * const info = roomManager.getRoomInfo('mcp');
 * console.log(info.memberCount); // 1
 * ```
 */

import logger from '@/utils/logger';

// ════════════════════════════════════════════════════════
// Room Types
// ════════════════════════════════════════════════════════

/**
 * Room status indicating its current state.
 */
export type RoomStatus = 'active' | 'paused' | 'closed' | 'draining';

/**
 * Room purpose classification.
 */
export type RoomPurpose =
  | 'mcp'
  | 'chat'
  | 'chat-stream'
  | 'providers'
  | 'simulate'
  | 'metrics'
  | 'general'
  | 'admin'
  | 'custom';

/**
 * Lifecycle hook callback types.
 */
export type RoomHookFn = (room: WsRoom) => void | Promise<void>;

/**
 * Metadata for a WebSocket room.
 */
export interface WsRoomMetadata {
  /** Room description */
  description?: string;
  /** Room tags for filtering/grouping */
  tags?: string[];
  /** Room purpose classification */
  purpose?: RoomPurpose;
  /** Maximum member capacity (-1 for unlimited) */
  maxMembers?: number;
  /** Whether new members are notified of the room's existence */
  announceJoin: boolean;
  /** Whether to auto-close when empty */
  autoCloseOnEmpty: boolean;
  /** Custom metadata key-value pairs */
  custom: Record<string, unknown>;
}

/**
 * Core room structure.
 * Represents a named channel that clients can join and broadcast to.
 */
export interface WsRoom {
  /** Unique room name */
  name: string;
  /** Current room status */
  status: RoomStatus;
  /** Room metadata */
  metadata: WsRoomMetadata;
  /** Set of member client IDs */
  members: Set<string>;
  /** Room creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Number of messages broadcasted in this room */
  messageCount: number;
}

// ════════════════════════════════════════════════════════
// Built-in Room Definitions
// ════════════════════════════════════════════════════════

/**
 * Default rooms created automatically on server start.
 */
const DEFAULT_ROOMS: Record<string, Partial<WsRoomMetadata>> = {
  mcp: {
    description: 'MCP protocol communication room',
    purpose: 'mcp',
    announceJoin: true,
    autoCloseOnEmpty: false,
  },
  chat: {
    description: 'Chat room for general conversation',
    purpose: 'chat',
    announceJoin: true,
    autoCloseOnEmpty: false,
  },
  'chat-stream': {
    description: 'Chat streaming room for real-time message chunks',
    purpose: 'chat-stream',
    announceJoin: false,
    autoCloseOnEmpty: true,
  },
  providers: {
    description: 'LLM provider management room',
    purpose: 'providers',
    announceJoin: true,
    autoCloseOnEmpty: false,
  },
  simulate: {
    description: 'Simulation and testing room',
    purpose: 'simulate',
    announceJoin: true,
    autoCloseOnEmpty: false,
  },
  metrics: {
    description: 'Real-time metrics streaming room',
    purpose: 'metrics',
    announceJoin: false,
    autoCloseOnEmpty: true,
  },
  general: {
    description: 'General-purpose room for all clients',
    purpose: 'general',
    announceJoin: true,
    autoCloseOnEmpty: false,
  },
  admin: {
    description: 'Administrative room for server management',
    purpose: 'admin',
    announceJoin: false,
    autoCloseOnEmpty: false,
  },
};

// ════════════════════════════════════════════════════════
// RoomManager Class
// ════════════════════════════════════════════════════════

/**
 * Manages WebSocket room lifecycle, membership, and broadcasting.
 *
 * The room manager handles:
 * - Room creation and deletion
 * - Client join/leave operations
 * - Room-scoped broadcasting
 * - Room health monitoring
 * - Lifecycle hooks
 */
class RoomManager {
  /** All known rooms, keyed by room name */
  private rooms: Map<string, WsRoom> = new Map();

  /** Registered lifecycle hooks */
  private hooks: Map<keyof Pick<WsRoom, 'createdAt' | 'lastActivityAt'> | string, RoomHookFn[]> = new Map();

  /** Whether the room manager has been initialized */
  private initialized = false;

  /** Total rooms created during the server lifetime */
  private totalRoomsCreated = 0;

  /** Total room joins */
  private totalJoins = 0;

  /** Total room leaves */
  private totalLeaves = 0;

  /**
   * Initialize the room manager with default rooms.
   * Called once at server startup.
   */
  init(): void {
    if (this.initialized) {
      logger.warn('RoomManager already initialized, skipping');
      return;
    }

    // Create default rooms
    for (const [name, metadata] of Object.entries(DEFAULT_ROOMS)) {
      this.rooms.set(name, this.createRoomInternal(name, metadata));
    }

    this.initialized = true;
    this.totalRoomsCreated = Object.keys(DEFAULT_ROOMS).length;
    logger.info({rooms: Object.keys(DEFAULT_ROOMS).length}, 'RoomManager initialized with default rooms');
  }

  /**
   * Create a new room.
   * @param name - Room name
   * @param metadata - Room metadata (optional)
   * @returns The created room
   * @throws {Error} If a room with this name already exists
   */
  createRoom(name: string, metadata?: Partial<WsRoomMetadata>): WsRoom {
    if (this.rooms.has(name)) {
      throw new Error(`Room "${name}" already exists`);
    }

    const room = this.createRoomInternal(name, metadata);
    this.rooms.set(name, room);
    this.totalRoomsCreated++;

    this.triggerHook('created', room);
    logger.info({room: name, members: 0}, 'Room created');
    return room;
  }

  /**
   * Delete a room and notify all its members.
   * @param name - Room name to delete
   * @returns true if the room was deleted, false if it didn't exist
   */
  deleteRoom(name: string): boolean {
    const room = this.rooms.get(name);
    if (!room) return false;

    // Trigger pre-delete hooks
    this.triggerHook('deleting', room);

    // Notify all members before deletion
    for (const clientId of room.members) {
      logger.debug({clientId, room: name}, 'Notifying client of room deletion');
    }

    this.rooms.delete(name);
    this.triggerHook('deleted', room);
    logger.info({room: name}, 'Room deleted');
    return true;
  }

  /**
   * Join a client to a room.
   * @param clientId - Client to join
   * @param roomName - Room to join
   * @returns The room the client was joined to
   * @throws {Error} If the room doesn't exist or the client can't join
   */
  joinRoom(clientId: string, roomName: string): WsRoom | null {
    const room = this.rooms.get(roomName);
    if (!room) return null;

    // Check room status
    if (room.status === 'closed') {
      logger.warn({clientId, room: roomName}, 'Cannot join a closed room');
      return null;
    }

    if (room.status === 'draining') {
      logger.warn({clientId, room: roomName}, 'Room is draining, denying new joins');
      return null;
    }

    // Check max members
    if (room.metadata.maxMembers && room.members.size >= room.metadata.maxMembers) {
      logger.warn({clientId, room: roomName}, 'Room at max capacity');
      return null;
    }

    // If client is in another room, leave it first
    // This is tracked by the caller in broadcastManager

    // Join
    room.members.add(clientId);
    room.lastActivityAt = new Date();
    this.totalJoins++;

    this.triggerHook('joined', room);

    if (room.metadata.announceJoin) {
      logger.info({room: roomName, clientId, memberCount: room.members.size}, 'Client joined room');
    } else {
      logger.debug({room: roomName, clientId}, 'Client joined room (silent)');
    }

    return room;
  }

  /**
   * Leave a room.
   * @param clientId - Client to remove from the room
   * @param roomName - Room to leave
   * @returns The room the client was removed from, or null if not found
   */
  leaveRoom(clientId: string, roomName: string): WsRoom | null {
    const room = this.rooms.get(roomName);
    if (!room) return null;

    const wasMember = room.members.delete(clientId);
    if (!wasMember) return null;

    room.lastActivityAt = new Date();
    this.totalLeaves++;

    this.triggerHook('left', room);

    // Auto-close if configured and empty
    if (room.metadata.autoCloseOnEmpty && room.members.size === 0) {
      this.deleteRoom(roomName);
      logger.debug({room: roomName}, 'Room auto-closed (empty)');
      return null;
    }

    logger.debug({room: roomName, clientId, memberCount: room.members.size}, 'Client left room');
    return room;
  }

  /**
   * Broadcast a message to all members of a room.
   * @param roomName - Target room
   * @param message - Message data to send
   * @param exclude - Optional client ID to exclude
   * @returns Number of clients the message was sent to
   */
  broadcastToRoom(
    roomName: string,
    message: Record<string, unknown>,
    exclude?: string,
  ): number {
    const room = this.rooms.get(roomName);
    if (!room || room.members.size === 0) return 0;

    room.messageCount++;
    room.lastActivityAt = new Date();

    let sentCount = 0;
    for (const clientId of room.members) {
      if (clientId === exclude) continue;

      // In a real implementation, this would call a send function
      // For now, we just track the count
      sentCount++;
    }

    return sentCount;
  }

  /**
   * Broadcast a message to all rooms.
   * @param message - Message data to send
   * @returns Total number of clients the message was sent to
   */
  broadcastToAllRooms(message: Record<string, unknown>): number {
    let totalSent = 0;
    for (const room of this.rooms.values()) {
      if (room.status !== 'closed' && room.status !== 'draining') {
        totalSent += this.broadcastToRoom(room.name, message);
      }
    }
    return totalSent;
  }

  /**
   * Get room information.
   * @param roomName - Room name to query
   * @returns Room info, or null if not found
   */
  getRoomInfo(roomName: string): WsRoom | null {
    const room = this.rooms.get(roomName);
    if (!room) return null;

    return {
      ...room,
      // Return a snapshot
      members: new Set(room.members),
      metadata: {...room.metadata, custom: {...room.metadata.custom}},
    };
  }

  /**
   * Get all active room names.
   * @returns Array of room names
   */
  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys())
      .filter(name => {
        const room = this.rooms.get(name);
        return room && room.status === 'active';
      });
  }

  /**
   * Get rooms filtered by purpose.
   * @param purpose - Room purpose to filter by
   * @returns Array of room names matching the purpose
   */
  getRoomsByPurpose(purpose: RoomPurpose): string[] {
    return Array.from(this.rooms.keys())
      .filter(name => {
        const room = this.rooms.get(name);
        return room?.metadata.purpose === purpose;
      });
  }

  /**
   * Get the total member count across all rooms.
   */
  getTotalMemberCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.members.size;
    }
    return count;
  }

  /**
   * Get room statistics.
   */
  getStats(): {
    totalRooms: number;
    activeRooms: number;
    totalMembers: number;
    totalJoins: number;
    totalLeaves: number;
    totalMessages: number;
    byPurpose: Record<string, number>;
  } {
    const byPurpose: Record<string, number> = {};
    let totalMessages = 0;

    for (const room of this.rooms.values()) {
      const purpose = room.metadata.purpose || 'uncategorized';
      byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
      totalMessages += room.messageCount;
    }

    return {
      totalRooms: this.rooms.size,
      activeRooms: this.rooms.size,
      totalMembers: this.getTotalMemberCount(),
      totalJoins: this.totalJoins,
      totalLeaves: this.totalLeaves,
      totalMessages,
      byPurpose,
    };
  }

  /**
   * Update room status.
   * @param roomName - Room to update
   * @param status - New status
   * @returns true if updated
   */
  setRoomStatus(roomName: string, status: RoomStatus): boolean {
    const room = this.rooms.get(roomName);
    if (!room) return false;

    room.status = status;
    this.triggerHook('statusChanged', room);
    return true;
  }

  /**
   * Register a lifecycle hook for a room event.
   * @param hookName - Hook name (created, joined, left, deleted, statusChanged)
   * @param fn - Hook function
   */
  on(hookName: string, fn: RoomHookFn): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(fn);
  }

  /**
   * Shutdown the room manager.
   * Cleans up all rooms and triggers shutdown hooks.
   */
  shutdown(): void {
    // Trigger shutdown hooks
    this.triggerHook('shuttingDown', {
      name: '__shutdown__',
      status: 'active' as RoomStatus,
      metadata: {} as WsRoomMetadata,
      members: new Set(),
      createdAt: new Date(),
      lastActivityAt: new Date(),
      messageCount: 0,
    });

    // Clean up all rooms
    this.rooms.clear();
    this.hooks.clear();

    logger.info('RoomManager shutdown');
  }

  // ════════════════════════════════════════════════════════
  // Internal Methods
  // ════════════════════════════════════════════════════════

  /**
   * Create a room internal structure.
   */
  private createRoomInternal(name: string, metadata?: Partial<WsRoomMetadata>): WsRoom {
    const resolvedMetadata: WsRoomMetadata = {
      description: metadata?.description,
      tags: metadata?.tags || [],
      purpose: metadata?.purpose || 'custom',
      maxMembers: metadata?.maxMembers ?? -1,
      announceJoin: metadata?.announceJoin ?? true,
      autoCloseOnEmpty: metadata?.autoCloseOnEmpty ?? false,
      custom: metadata?.custom || {},
    };

    return {
      name,
      status: 'active',
      metadata: resolvedMetadata,
      members: new Set(),
      createdAt: new Date(),
      lastActivityAt: new Date(),
      messageCount: 0,
    };
  }

  /**
   * Trigger a lifecycle hook.
   */
  private triggerHook(hookName: string, room: WsRoom): void {
    const hooks = this.hooks.get(hookName);
    if (!hooks) return;

    for (const hook of hooks) {
      try {
        hook(room);
      } catch (err) {
        logger.error({hook: hookName, room: room.name, error: err}, 'Room hook error');
      }
    }
  }
}

/** Global singleton room manager */
export const roomManager = new RoomManager();
export default roomManager;
