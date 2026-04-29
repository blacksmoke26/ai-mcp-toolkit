/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/stream-manager
 * @description Manages active chat streaming sessions with pause/resume capability.
 *
 * This module provides a singleton stream manager that tracks all active streaming sessions,
 * allowing clients to pause and resume streams. Each stream is identified by a unique
 * stream ID and associated with a client and conversation.
 *
 * ## Features
 *
 * - Track active streaming sessions per client
 * - Pause/resume streams with state preservation
 * - Automatic cleanup on client disconnect
 * - Stream metadata (duration, chunks sent, etc.)
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │        StreamManager                 │
 * ├─────────────────────────────────────┤
 * │  activeStreams: Map<streamId, ...>  │
 * │  clientStreams: Map<clientId, ...>  │
 * │                                    │
 * │  + startStream()    + stopStream()  │
 * │  + pauseStream()    + resumeStream()│
 * │  + getStreamInfo()  + cleanup()     │
 * └─────────────────────────────────────┘
 * ```
 *
 * ## Usage Example
 *
 * ```typescript
 * import { streamManager } from '@/websocket/stream-manager';
 *
 * // Start a new stream
 * streamManager.startStream('stream-123', 'client-456', 'conv-789');
 *
 * // Pause a stream
 * streamManager.pauseStream('stream-123');
 *
 * // Resume a paused stream
 * streamManager.resumeStream('stream-123');
 *
 * // Get stream info
 * const info = streamManager.getStreamInfo('stream-123');
 * console.log(info?.status); // 'paused'
 *
 * // Cleanup all streams for a client
 * streamManager.cleanupClient('client-456');
 * ```
 */

// ═════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════

/**
 * Possible states of a streaming session.
 */
export type StreamStatus = 'active' | 'paused' | 'stopped';

/**
 * Metadata about an active streaming session.
 */
export interface StreamInfo {
  /** Unique stream identifier */
  streamId: string;
  /** Client that owns this stream */
  clientId: string;
  /** Associated conversation ID */
  conversationId: string;
  /** Current stream status */
  status: StreamStatus;
  /** When the stream was created */
  startedAt: Date;
  /** When the stream was last paused or resumed */
  lastStateChangeAt: Date;
  /** Number of chunks sent so far */
  chunksSent: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Last content delta sent */
  lastDelta: string | null;
  /** Whether a full response has been completed */
  isComplete: boolean;
}

// ═════════════════════════════════════════════════════════
// Stream Manager Class
// ═════════════════════════════════════════════════════════

/**
 * Manages all active chat streaming sessions.
 *
 * This is a singleton class that tracks:
 * - All active streams with their metadata
 * - Stream state (active/paused/stopped)
 * - Per-client stream mappings
 * - Automatic cleanup on client disconnect
 */
class StreamManager {
  /** Map of stream IDs to stream info */
  private activeStreams: Map<string, StreamInfo> = new Map();

  /** Map of client IDs to their active stream IDs */
  private clientStreams: Map<string, string[]> = new Map();

  /** Total streams created (for stats) */
  private totalStreamsCreated = 0;

  /** Total streams stopped (for stats) */
  private totalStreamsStopped = 0;

  /** Total streams paused (for stats) */
  private totalStreamsPaused = 0;

  /** Total streams resumed (for stats) */
  private totalStreamsResumed = 0;

  /**
   * Start a new streaming session.
   *
   * @param streamId - Unique stream identifier
   * @param clientId - Client that owns this stream
   * @param conversationId - Associated conversation ID
   * @returns StreamInfo for the new stream
   */
  startStream(
    streamId: string,
    clientId: string,
    conversationId: string,
  ): StreamInfo {
    const now = new Date();

    const streamInfo: StreamInfo = {
      streamId,
      clientId,
      conversationId,
      status: 'active',
      startedAt: now,
      lastStateChangeAt: now,
      chunksSent: 0,
      durationMs: 0,
      lastDelta: null,
      isComplete: false,
    };

    this.activeStreams.set(streamId, streamInfo);

    // Add to client's stream list
    if (!this.clientStreams.has(clientId)) {
      this.clientStreams.set(clientId, []);
    }
    this.clientStreams.get(clientId)!.push(streamId);

    // Update stats
    this.totalStreamsCreated++;

    return streamInfo;
  }

  /**
   * Stop a streaming session and clean up its state.
   *
   * @param streamId - Stream ID to stop
   * @param markComplete - Whether to mark the stream as complete
   * @returns true if stream was found and stopped
   */
  stopStream(streamId: string, markComplete = true): boolean {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return false;
    }

    // Mark complete if requested
    if (markComplete) {
      stream.isComplete = true;
      stream.status = 'stopped';
    }

    // Remove from client's stream list
    const clientStreams = this.clientStreams.get(stream.clientId);
    if (clientStreams) {
      const idx = clientStreams.indexOf(streamId);
      if (idx !== -1) {
        clientStreams.splice(idx, 1);
      }
      // Clean up empty client entries
      if (clientStreams.length === 0) {
        this.clientStreams.delete(stream.clientId);
      }
    }

    // Clean up stream
    this.activeStreams.delete(streamId);
    this.totalStreamsStopped++;

    return true;
  }

  /**
   * Pause an active streaming session.
   *
   * @param streamId - Stream ID to pause
   * @returns StreamInfo if stream was found and paused, null otherwise
   */
  pauseStream(streamId: string): StreamInfo | null {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return null;
    }

    if (stream.status !== 'active') {
      return null;
    }

    stream.status = 'paused';
    stream.lastStateChangeAt = new Date();
    this.totalStreamsPaused++;

    return stream;
  }

  /**
   * Resume a paused streaming session.
   *
   * @param streamId - Stream ID to resume
   * @returns StreamInfo if stream was found and resumed, null otherwise
   */
  resumeStream(streamId: string): StreamInfo | null {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return null;
    }

    if (stream.status !== 'paused') {
      return null;
    }

    stream.status = 'active';
    stream.lastStateChangeAt = new Date();
    this.totalStreamsResumed++;

    return stream;
  }

  /**
   * Get information about a specific stream.
   *
   * @param streamId - Stream ID to look up
   * @returns StreamInfo if found, null otherwise
   */
  getStreamInfo(streamId: string): StreamInfo | null {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return null;
    }

    // Calculate current duration
    const now = new Date();
    const elapsed = now.getTime() - stream.startedAt.getTime();

    return {
      ...stream,
      durationMs: elapsed,
    };
  }

  /**
   * Get all active streams for a specific client.
   *
   * @param clientId - Client ID to look up
   * @returns Array of stream info objects
   */
  getClientStreams(clientId: string): StreamInfo[] {
    const streamIds = this.clientStreams.get(clientId);
    if (!streamIds || streamIds.length === 0) {
      return [];
    }

    return streamIds
      .map(id => this.activeStreams.get(id))
      .filter((s): s is StreamInfo => s !== undefined);
  }

  /**
   * Get all active streams (across all clients).
   *
   * @returns Array of all active stream info objects
   */
  getAllActiveStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values()).map(stream => ({
      ...stream,
      durationMs: new Date().getTime() - stream.startedAt.getTime(),
    }));
  }

  /**
   * Increment the chunk count for a stream.
   *
   * @param streamId - Stream ID
   * @returns true if chunk count was incremented
   */
  incrementChunks(streamId: string): boolean {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return false;
    }

    stream.chunksSent++;
    return true;
  }

  /**
   * Update the last delta content for a stream.
   *
   * @param streamId - Stream ID
   * @param delta - New delta content
   * @returns true if delta was updated
   */
  updateDelta(streamId: string, delta: string): boolean {
    const stream = this.activeStreams.get(streamId);
    if (!stream) {
      return false;
    }

    stream.lastDelta = delta;
    return true;
  }

  /**
   * Clean up all streams for a specific client (e.g., on disconnect).
   *
   * @param clientId - Client ID to clean up
   * @returns Number of streams cleaned up
   */
  cleanupClient(clientId: string): number {
    const streamIds = this.clientStreams.get(clientId);
    if (!streamIds || streamIds.length === 0) {
      return 0;
    }

    let cleanedCount = 0;
    for (const streamId of streamIds) {
      if (this.stopStream(streamId, false)) {
        cleanedCount++;
      }
    }

    this.clientStreams.delete(clientId);
    return cleanedCount;
  }

  /**
   * Get manager statistics.
   *
   * @returns Statistics about stream management
   */
  getStats(): {
    activeStreams: number;
    totalCreated: number;
    totalStopped: number;
    totalPaused: number;
    totalResumed: number;
  } {
    return {
      activeStreams: this.activeStreams.size,
      totalCreated: this.totalStreamsCreated,
      totalStopped: this.totalStreamsStopped,
      totalPaused: this.totalStreamsPaused,
      totalResumed: this.totalStreamsResumed,
    };
  }

  /**
   * Shutdown the stream manager and clean up all streams.
   */
  shutdown(): void {
    this.activeStreams.clear();
    this.clientStreams.clear();
  }
}

// ═════════════════════════════════════════════════════════
// Singleton Export
// ═════════════════════════════════════════════════════════

/** Singleton instance of the stream manager */
export const streamManager = new StreamManager();

export default streamManager;

// ═════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════

export {StreamManager};
