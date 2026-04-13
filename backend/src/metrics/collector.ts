/**
 * @module metrics/collector
 * @description Performance metrics collection and monitoring system.
 * 
 * Tracks:
 * - Request/response latency
 * - Tool execution metrics
 * - Token usage statistics
 * - Provider performance
 * - Error rates and patterns
 * 
 * ## Features
 * 
 * - Real-time metrics collection
 * - Time-series data for trend analysis
 * - Metric aggregation and summarization
 * - Export capabilities for external monitoring
 * 
 * ## Usage
 * 
 * ```typescript
 * import { metricsCollector } from '@/metrics/collector';
 * 
 * // Start timing a request
 * const request = metricsCollector.startRequest('chat');
 * 
 * // ... perform operation
 * 
 * // End timing with results
 * request.end({ tokens: { input: 50, output: 120 } });
 * 
 * // Get current metrics
 * const metrics = metricsCollector.getMetrics();
 * ```
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MetricEntry {
  /** Unique identifier for this metric */
  id?: string;
  /** Type of metric (request, tool, token, error, provider) */
  type: 'request' | 'tool' | 'token' | 'error' | 'provider' | 'system';
  /** Timestamp when metric was recorded */
  timestamp: Date;
  /** Payload specific to metric type */
  data: Record<string, unknown>;
}

export interface RequestMetric {
  /** Endpoint or operation name */
  endpoint: string;
  /** Request method */
  method: string;
  /** Response time in milliseconds */
  durationMs: number;
  /** HTTP status code */
  statusCode: number;
  /** Request size in bytes */
  requestSize?: number;
  /** Response size in bytes */
  responseSize?: number;
  /** Timestamp */
  timestamp: Date;
}

export interface ToolMetric {
  /** Tool name */
  toolName: string;
  /** Execution time in milliseconds */
  durationMs: number;
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Input arguments (sanitized) */
  inputKeys?: string[];
  /** Timestamp */
  timestamp: Date;
}

export interface TokenMetric {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Cost estimation (provider-specific) */
  costEstimate?: number;
  /** Timestamp */
  timestamp: Date;
}

export interface ProviderMetric {
  /** Provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Status */
  status: 'ok' | 'degraded' | 'error';
  /** Timestamp */
  timestamp: Date;
}

export interface SystemMetric {
  /** Memory usage in MB */
  memoryUsedMb: number;
  /** Memory total in MB */
  memoryTotalMb: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Event loop lag in ms */
  eventLoopLagMs: number;
  /** Active handles */
  activeHandles?: number;
  /** Timestamp */
  timestamp: Date;
}

export interface MetricsSummary {
  /** Time range */
  period: {
    start: Date;
    end: Date;
  };
  /** Request statistics */
  requests: {
    total: number;
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    byEndpoint: Record<string, number>;
    byStatusCode: Record<string, number>;
  };
  /** Tool statistics */
  tools: {
    totalCalls: number;
    successRate: number;
    avgDurationMs: number;
    byTool: Record<string, {
      calls: number;
      avgDurationMs: number;
      successRate: number;
    }>;
  };
  /** Token statistics */
  tokens: {
    totalInput: number;
    totalOutput: number;
    totalCostEstimate: number;
    byProvider: Record<string, TokenMetricSummary>;
  };
  /** Error statistics */
  errors: {
    total: number;
    byType: Record<string, number>;
    recent: ErrorMetric[];
  };
  /** Provider statistics */
  providers: {
    byProvider: Record<string, ProviderMetricSummary>;
  };
}

export interface TokenMetricSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requests: number;
}

export interface ProviderMetricSummary {
  avgLatencyMs: number;
  requestCount: number;
  successRate: number;
  lastStatus: 'ok' | 'degraded' | 'error';
}

export interface ErrorMetric {
  type: string;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// ─── Metrics Collector ──────────────────────────────────────────────────────

class MetricsCollector {
  private readonly maxEntries = 10000;
  private entries: MetricEntry[] = [];
  private readonly retentionMs = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Record a request metric
   */
  recordRequest(metric: Omit<RequestMetric, 'timestamp'>): void {
    this.addEntry({
      type: 'request',
      timestamp: new Date(),
      data: metric,
    });
  }

  /**
   * Record a tool execution metric
   */
  recordTool(metric: Omit<ToolMetric, 'timestamp'>): void {
    this.addEntry({
      type: 'tool',
      timestamp: new Date(),
      data: metric,
    });
  }

  /**
   * Record token usage
   */
  recordTokens(metric: Omit<TokenMetric, 'timestamp'>): void {
    this.addEntry({
      type: 'token',
      timestamp: new Date(),
      data: metric,
    });
  }

  /**
   * Record provider health/performance
   */
  recordProvider(metric: Omit<ProviderMetric, 'timestamp'>): void {
    this.addEntry({
      type: 'provider',
      timestamp: new Date(),
      data: metric,
    });
  }

  /**
   * Record error
   */
  recordError(
    type: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.addEntry({
      type: 'error',
      timestamp: new Date(),
      data: { type, message, context },
    });
  }

  /**
   * Record system metrics
   */
  recordSystem(metric: Omit<SystemMetric, 'timestamp'>): void {
    this.addEntry({
      type: 'system',
      timestamp: new Date(),
      data: metric,
    });
  }

  /**
   * Internal method to add entry with retention management
   */
  private addEntry(entry: MetricEntry): void {
    entry.id = `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.entries.unshift(entry);
    
    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(0, this.maxEntries);
    }
    
    // Remove entries older than retention period
    const cutoff = Date.now() - this.retentionMs;
    const validCount = this.entries.findIndex(e => e.timestamp.getTime() < cutoff);
    if (validCount !== -1) {
      this.entries = this.entries.slice(0, validCount);
    }
  }

  /**
   * Get all entries (for debugging)
   */
  getAllEntries(): MetricEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries filtered by type
   */
  getEntriesByType(type: MetricEntry['type']): MetricEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Get entries within time range
   */
  getEntriesInRange(start: Date, end: Date): MetricEntry[] {
    return this.entries.filter(e => 
      e.timestamp >= start && e.timestamp <= end
    );
  }

  /**
   * Generate comprehensive metrics summary
   */
  getSummary(periodHours = 1): MetricsSummary {
    const end = new Date();
    const start = new Date(end.getTime() - periodHours * 60 * 60 * 1000);
    const entries = this.getEntriesInRange(start, end);

    // Process requests
    const requestEntries = entries
      .filter(e => e.type === 'request')
      .map(e => e.data as unknown as RequestMetric);
    
    const durations = requestEntries.map(r => r.durationMs).sort((a, b) => a - b);
    const requests = {
      total: requestEntries.length,
      avgLatencyMs: requestEntries.length > 0 
        ? Math.round(requestEntries.reduce((s, r) => s + r.durationMs, 0) / requestEntries.length) 
        : 0,
      p50LatencyMs: durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0,
      p95LatencyMs: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      p99LatencyMs: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
      byEndpoint: this.aggregateBy(requestEntries, (r) => String(r.endpoint)),
      byStatusCode: this.aggregateBy(requestEntries, (r) => String(r.statusCode)),
    };

    // Process tools
    const toolEntries = entries
      .filter(e => e.type === 'tool')
      .map(e => e.data as unknown as ToolMetric);
    
    const toolStats: Record<string, { calls: number; durations: number[]; successes: number }> = {};
    for (const tool of toolEntries) {
      if (!toolStats[tool.toolName]) {
        toolStats[tool.toolName] = { calls: 0, durations: [], successes: 0 };
      }
      toolStats[tool.toolName].calls++;
      toolStats[tool.toolName].durations.push(tool.durationMs);
      if (tool.success) toolStats[tool.toolName].successes++;
    }

    const tools = {
      totalCalls: toolEntries.length,
      successRate: toolEntries.length > 0 
        ? Math.round((toolEntries.filter(t => t.success).length / toolEntries.length) * 100) 
        : 0,
      avgDurationMs: toolEntries.length > 0 
        ? Math.round(toolEntries.reduce((s, t) => s + t.durationMs, 0) / toolEntries.length) 
        : 0,
      byTool: Object.fromEntries(
        Object.entries(toolStats).map(([name, stats]) => [
          name,
          {
            calls: stats.calls,
            avgDurationMs: Math.round(stats.durations.reduce((s, d) => s + d, 0) / stats.durations.length),
            successRate: Math.round((stats.successes / stats.calls) * 100),
          }
        ])
      ),
    };

    // Process tokens
    const tokenEntries = entries
      .filter(e => e.type === 'token')
      .map(e => e.data as unknown as TokenMetric);
    
    const tokenByProvider: Record<string, TokenMetricSummary> = {};
    for (const token of tokenEntries) {
      const key = `${token.provider}:${token.model}`;
      if (!tokenByProvider[key]) {
        tokenByProvider[key] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 };
      }
      tokenByProvider[key].inputTokens += token.inputTokens;
      tokenByProvider[key].outputTokens += token.outputTokens;
      tokenByProvider[key].totalTokens += token.totalTokens;
      tokenByProvider[key].requests++;
    }

    const tokens = {
      totalInput: tokenEntries.reduce((s, t) => s + t.inputTokens, 0),
      totalOutput: tokenEntries.reduce((s, t) => s + t.outputTokens, 0),
      totalCostEstimate: tokenEntries.reduce((s, t) => s + (t.costEstimate || 0), 0),
      byProvider: tokenByProvider,
    };

    // Process errors
    const errorEntries = entries
      .filter(e => e.type === 'error')
      .map(e => e.data as unknown as ErrorMetric);
    
    const errors = {
      total: errorEntries.length,
      byType: this.aggregateBy(errorEntries, (e) => String(e.type)),
      recent: errorEntries.slice(0, 10),
    };

    // Process providers
    const providerEntries = entries
      .filter(e => e.type === 'provider')
      .map(e => e.data as unknown as ProviderMetric);
    
    const providerStats: Record<string, { latencies: number[]; count: number; successes: number; lastStatus: ProviderMetric['status'] }> = {};
    for (const provider of providerEntries) {
      const key = provider.provider;
      if (!providerStats[key]) {
        providerStats[key] = { latencies: [], count: 0, successes: 0, lastStatus: 'ok' };
      }
      providerStats[key].latencies.push(provider.latencyMs);
      providerStats[key].count++;
      if (provider.status === 'ok') providerStats[key].successes++;
      providerStats[key].lastStatus = provider.status;
    }

    const providers = {
      byProvider: Object.fromEntries(
        Object.entries(providerStats).map(([name, stats]) => [
          name,
          {
            avgLatencyMs: Math.round(stats.latencies.reduce((s, l) => s + l, 0) / stats.latencies.length),
            requestCount: stats.count,
            successRate: Math.round((stats.successes / stats.count) * 100),
            lastStatus: stats.lastStatus,
          }
        ])
      ),
    };

    return {
      period: { start, end },
      requests,
      tools,
      tokens,
      errors,
      providers,
    };
  }

  /**
   * Get current system metrics
   */
  getSystemMetrics(): SystemMetric {
    const eventLoopStartTime = Date.now();
    const memoryUsage = process.memoryUsage();
    
    return {
      memoryUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      memoryTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      cpuUsage: undefined, // Would need additional tracking
      eventLoopLagMs: Date.now() - eventLoopStartTime,
      activeHandles: undefined, // Would need activeTracks
      timestamp: new Date(),
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      entries: this.entries,
      summary: this.getSummary(),
    }, null, 2);
  }

  // Helper method for aggregation
  private aggregateBy<T>(
    items: T[],
    keyExtractor: (item: T) => unknown,
    transformer: (v: unknown) => string = String
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of items) {
      const value = transformer(keyExtractor(item));
      result[value] = (result[value] || 0) + 1;
    }
    return result;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────

export const metricsCollector = new MetricsCollector();
export default metricsCollector;