/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/metrics-tracker
 * @description Real-time request counting and latency tracking for WebSocket connections.
 *
 * This module provides a singleton metrics tracker that monitors:
 *
 * - Total and per-second request counts
 * - Request latency percentiles (p50, p95, p99)
 * - Active connection counts
 * - Per-event-type request counts
 * - Error rates
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────┐
 * │         MetricsTracker              │
 * ├─────────────────────────────────────┤
 * │  requestHistory: CircularBuffer     │
 * │  eventCounts: Map<eventName, count> │
 * │  activeConnections: number          │
 * │                                    │
 * │  + trackRequest()   + getMetrics()  │
 * │  + getEventCounts() + reset()       │
 * └─────────────────────────────────────┘
 * ```
 *
 * ## Usage Example
 *
 * ```typescript
 * import { metricsTracker } from '@/websocket/metrics-tracker';
 *
 * // Track a request
 * metricsTracker.trackRequest('mcp:tools:call', 150);
 *
 * // Get current metrics
 * const metrics = metricsTracker.getMetrics();
 * console.log(metrics.requests.perSecond); // 5.2
 * console.log(metrics.latencies.p95); // 250
 *
 * // Reset counters
 * metricsTracker.reset();
 * ```
 */

// ════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════

/**
 * Latency percentile data point.
 */
export interface LatencyPercentiles {
  /** Average latency in ms */
  avg: number;
  /** P50 (median) latency in ms */
  p50: number;
  /** P95 latency in ms */
  p95: number;
  /** P99 latency in ms */
  p99: number;
  /** Minimum latency in ms */
  min: number;
  /** Maximum latency in ms */
  max: number;
  /** Number of data points */
  count: number;
}

/**
 * Request count data point.
 */
export interface RequestCounts {
  /** Total requests tracked */
  total: number;
  /** Requests per second (rolling window) */
  perSecond: number;
  /** Active (ongoing) requests */
  active: number;
}

/**
 * Per-event request counts.
 */
export interface EventCounts {
  [eventName: string]: number;
}

/**
 * Error tracking data.
 */
export interface ErrorCounts {
  /** Total errors */
  total: number;
  /** Errors per event name */
  byEvent: EventCounts;
}

/**
 * Complete system metrics snapshot.
 */
export interface MetricsSnapshot {
  /** Request counts */
  requests: RequestCounts;
  /** Latency percentiles */
  latencies: LatencyPercentiles;
  /** Per-event request counts */
  eventCounts: EventCounts;
  /** Error counts */
  errors: ErrorCounts;
  /** System memory usage */
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  /** Server uptime in seconds */
  uptime: number;
  /** Timestamp of snapshot */
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════
// Metrics Tracker Class
// ════════════════════════════════════════════════════════════

/**
 * Tracks real-time WebSocket request metrics.
 *
 * Uses a sliding window approach to calculate per-second rates
 * and maintains a rolling history for percentile calculations.
 */
class MetricsTracker {
  /** Maximum history size for latency tracking (last 1000 requests) */
  private static readonly MAX_HISTORY = 1000;

  /** Sliding window size for per-second calculations (last 5 seconds) */
  private static readonly SLIDING_WINDOW_MS = 5000;

  /** Circular buffer of request timestamps and durations */
  private requestHistory: Array<{ timestamp: number; duration: number; event: string; isError: boolean }> = [];

  /** Map of event names to request counts */
  private eventCounts: EventCounts = {};

  /** Map of event names to error counts */
  private errorCountsByEvent: EventCounts = {};

  /** Total error count */
  private totalErrors = 0;

  /** Active request count */
  private activeRequests = new Map<string, { start: number; event: string }>();

  /** Total request count */
  private totalRequests = 0;

  /** Snapshot interval ID */
  private snapshotInterval: NodeJS.Timeout | null = null;

  /** Last snapshot for rate calculation */
  private lastSnapshotTotal = 0;
  private lastSnapshotTime = 0;

  /**
   * Initialize the metrics tracker with periodic snapshotting.
   */
  init(): void {
    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot();
    }, 1000);
  }

  /**
   * Track a completed request.
   *
   * @param eventName - Event name that was handled
   * @param durationMs - Request duration in milliseconds
   * @param isError - Whether the request resulted in an error
   * @param requestId - Optional request ID for tracking active requests
   */
  trackRequest(
    eventName: string,
    durationMs: number,
    isError = false,
    requestId?: string,
  ): void {
    const now = Date.now();

    // Update total count
    this.totalRequests++;

    // Update event count
    if (!this.eventCounts[eventName]) {
      this.eventCounts[eventName] = 0;
    }
    this.eventCounts[eventName]++;

    // Track error
    if (isError) {
      this.totalErrors++;
      if (!this.errorCountsByEvent[eventName]) {
        this.errorCountsByEvent[eventName] = 0;
      }
      this.errorCountsByEvent[eventName]++;
    }

    // Add to history (circular buffer)
    this.requestHistory.push({
      timestamp: now,
      duration: durationMs,
      event: eventName,
      isError,
    });

    // Trim history if needed
    if (this.requestHistory.length > MetricsTracker.MAX_HISTORY) {
      this.requestHistory.shift();
    }

    // Remove from active requests
    if (requestId && this.activeRequests.has(requestId)) {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Start tracking an active request.
   *
   * @param eventId - Unique event/request ID
   * @param eventName - Event name
   * @returns Cleanup function to call when request completes
   */
  startRequest(eventId: string, eventName: string): () => void {
    const now = Date.now();
    this.activeRequests.set(eventId, {start: now, event: eventName});

    return () => {
      const entry = this.activeRequests.get(eventId);
      if (entry) {
        this.activeRequests.delete(eventId);
        const duration = Date.now() - entry.start;
        this.trackRequest(entry.event, duration);
      }
    };
  }

  /**
   * Track an error for an event.
   *
   * @param eventName - Event name that errored
   */
  trackError(eventName: string): void {
    this.totalErrors++;
    if (!this.errorCountsByEvent[eventName]) {
      this.errorCountsByEvent[eventName] = 0;
    }
    this.errorCountsByEvent[eventName]++;
  }

  /**
   * Calculate percentile from sorted array.
   *
   * @param sorted - Sorted array of numbers
   * @param percentile - Percentile (0-100)
   * @returns Percentile value
   */
  private percentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) {
      return 0;
    }
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
      return sorted[lower];
    }
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Take a snapshot of current metrics.
   *
   * @returns Current metrics snapshot
   */
  getMetrics(): MetricsSnapshot {
    const now = Date.now();

    // Calculate per-second rate
    let perSecond = 0;
    if (this.lastSnapshotTime > 0) {
      const timeDiff = (now - this.lastSnapshotTime) / 1000;
      const requestDiff = this.totalRequests - this.lastSnapshotTotal;
      if (timeDiff > 0) {
        perSecond = requestDiff / timeDiff;
      }
    }

    // Get recent requests for latency calculation
    const windowStart = now - MetricsTracker.SLIDING_WINDOW_MS;
    const recentRequests = this.requestHistory.filter(
      entry => entry.timestamp >= windowStart,
    );

    // Calculate latency percentiles
    const durations = recentRequests
      .map(entry => entry.duration)
      .sort((a, b) => a - b);

    const latencyPercentiles: LatencyPercentiles = {
      avg: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
      min: durations.length > 0 ? durations[0] : 0,
      max: durations.length > 0 ? durations[durations.length - 1] : 0,
      count: durations.length,
    };

    // Get memory usage
    const mem = process.memoryUsage();

    return {
      requests: {
        total: this.totalRequests,
        perSecond: Math.round(perSecond * 100) / 100,
        active: this.activeRequests.size,
      },
      latencies: latencyPercentiles,
      eventCounts: {...this.eventCounts},
      errors: {
        total: this.totalErrors,
        byEvent: {...this.errorCountsByEvent},
      },
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external || 0,
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };
  }

  /**
   * Get per-event request counts.
   *
   * @returns Event counts map
   */
  getEventCounts(): EventCounts {
    return {...this.eventCounts};
  }

  /**
   * Get error counts.
   *
   * @returns Error counts
   */
  getErrorCounts(): ErrorCounts {
    return {
      total: this.totalErrors,
      byEvent: {...this.errorCountsByEvent},
    };
  }

  /**
   * Get active request count.
   *
   * @returns Number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get total request count.
   *
   * @returns Total requests
   */
  getTotalRequestCount(): number {
    return this.totalRequests;
  }

  /**
   * Reset all metrics counters.
   */
  reset(): void {
    this.requestHistory = [];
    this.eventCounts = {};
    this.errorCountsByEvent = {};
    this.totalErrors = 0;
    this.activeRequests.clear();
    this.totalRequests = 0;
    this.lastSnapshotTotal = 0;
    this.lastSnapshotTime = 0;
  }

  /**
   * Take a snapshot for rate calculation.
   * Called periodically by init().
   */
  private takeSnapshot(): void {
    this.lastSnapshotTotal = this.totalRequests;
    this.lastSnapshotTime = Date.now();
  }

  /**
   * Shutdown the metrics tracker.
   */
  shutdown(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }
}

// ════════════════════════════════════════════════════════════
// Singleton Export
// ════════════════════════════════════════════════════════════

/** Singleton instance of the metrics tracker */
export const metricsTracker = new MetricsTracker();

export default metricsTracker;

// ════════════════════════════════════════════════════════════
// Exports
// ════════════════════════════════════════════════════════════

export {MetricsTracker};
