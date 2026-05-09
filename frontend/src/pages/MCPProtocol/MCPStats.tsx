/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/MCPStats
 * @description MCP server request statistics dashboard with real-time monitoring,
 *              reset capability, and error rate tracking.
 *
 * This component displays comprehensive request statistics from the MCP server
 * including:
 * - Total single requests and batch requests processed
 * - SSE connection statistics (total and active)
 * - Error counts and error rates
 * - Server uptime
 * - Last request timestamp
 * - Available methods list
 */

import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Clock,
  Gauge,
  Layers,
  RefreshCw,
  ShieldCheck,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Separator} from '@/components/ui/Separator';
import JsonViewer from '@/components/ui/JsonViewer';
import {useMcpProtocol} from '@/hooks/useMcpProtocol';
import type {McpMethodDescription} from '@/types/api';

// ======================== Constants ========================

/** Default refresh interval in milliseconds */
const DEFAULT_REFRESH_INTERVAL = 10000;

/** Threshold for "high error rate" percentage */
const HIGH_ERROR_RATE_THRESHOLD = 10;

/** Threshold for "degraded" error count */
const DEGRADED_ERROR_THRESHOLD = 100;

/** Minimum error rate display value */
const MIN_ERROR_RATE_DISPLAY = 0.01;

// ======================== Helpers ========================

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** Format seconds to human-readable uptime */
function formatUptime(seconds: number): string {
  if (seconds < 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}h ${mins}m ${secs}s`;
}

/** Format relative time from ISO string */
function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ======================== Sub-Components ========================

/**
 * StatGauge displays a single metric with a visual gauge bar.
 */
interface StatGaugeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'cyan' | 'emerald' | 'indigo';
  progress?: number; // 0-100
}

const COLOR_MAP: Record<string, {bg: string; bar: string; text: string; border: string; bgLight: string}> = {
  blue: {bg: 'border-blue-500', bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', bgLight: 'bg-blue-50 dark:bg-blue-900/20'},
  green: {bg: 'border-green-500', bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800', bgLight: 'bg-green-50 dark:bg-green-900/20'},
  purple: {bg: 'border-purple-500', bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', bgLight: 'bg-purple-50 dark:bg-purple-900/20'},
  red: {bg: 'border-red-500', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800', bgLight: 'bg-red-50 dark:bg-red-900/20'},
  orange: {bg: 'border-orange-500', bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', bgLight: 'bg-orange-50 dark:bg-orange-900/20'},
  cyan: {bg: 'border-cyan-500', bar: 'bg-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800', bgLight: 'bg-cyan-50 dark:bg-cyan-900/20'},
  emerald: {bg: 'border-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', bgLight: 'bg-emerald-50 dark:bg-emerald-900/20'},
  indigo: {bg: 'border-indigo-500', bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20'},
};

function StatGauge({icon, label, value, subtext, color, progress}: StatGaugeProps) {
  const colors = COLOR_MAP[color];
  return (
    <Card className={`border-l-4 ${colors.bg}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        <div className={colors.text}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colors.text}`}>{value}</div>
        {subtext && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
        )}
        {progress !== undefined && (
          <div className="mt-2 w-full bg-muted rounded-full h-1.5">
            <div
              className={`${colors.bar} h-1.5 rounded-full transition-all duration-500`}
              style={{width: `${Math.min(progress, 100)}%`}}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MiniBarChart displays a tiny sparkline-like bar chart.
 */
interface MiniBarChartProps {
  values: number[];
  color: string;
}

function MiniBarChart({values, color}: MiniBarChartProps) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-1 rounded-t ${color}`}
          style={{height: `${(v / max) * 100}%`, opacity: 0.3 + (i / values.length) * 0.7}}
        />
      ))}
    </div>
  );
}

// ======================== Main Component ========================

/**
 * MCPStats provides a comprehensive statistics dashboard for the MCP server.
 *
 * Features:
 * - Real-time request statistics monitoring
 * - Error rate calculation and tracking
 * - SSE connection monitoring
 * - Server uptime display
 * - Method listing with descriptions
 * - Reset capability for counters
 * - Auto-refresh with configurable interval
 */
export function MCPStats() {
  const {state, refreshAll, resetStats, setRefreshInterval} = useMcpProtocol();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshIntervalState] = useState(DEFAULT_REFRESH_INTERVAL);
  const [errorBurst, setErrorBurst] = useState<number[]>([]);

  // Track error count for burst detection
  const prevErrorCount = React.useRef(state.stats?.errorCount ?? 0);
  useEffect(() => {
    if (state.stats?.errorCount !== undefined && state.stats.errorCount !== prevErrorCount.current) {
      const burst = state.stats.errorCount - prevErrorCount.current;
      if (burst > 0) {
        setErrorBurst(prev => [...prev.slice(-19), burst]);
      }
      prevErrorCount.current = state.stats.errorCount;
    }
  }, [state.stats?.errorCount]);

  const stats = state.stats;
  const methods = state.methods;

  const handleReset = useCallback(async () => {
    await resetStats();
    setConfirmingReset(false);
    await refreshAll();
  }, [resetStats, refreshAll]);

  const handleRefreshIntervalChange = useCallback((ms: number) => {
    setRefreshIntervalState(ms);
    setRefreshInterval(ms);
  }, [setRefreshInterval]);

  const status = stats?.errorCount !== undefined
    ? stats.errorCount < DEGRADED_ERROR_THRESHOLD
      ? 'healthy'
      : 'degraded'
    : 'unknown';

  const errorRate = stats?.errorRate ?? 0;

  // Quick stats summary for header
  const quickStats = useMemo(() => {
    if (!stats) return null;
    return {
      totalRequests: stats.totalRequests.toLocaleString(),
      totalBatches: stats.totalBatchRequests.toLocaleString(),
      activeSSE: stats.activeSseConnections,
      totalSSE: stats.totalSseConnections,
      uptime: formatUptime(stats.uptime),
      errorCount: stats.errorCount.toLocaleString(),
      errorRate: `${errorRate.toFixed(2)}%`,
      lastRequest: stats.lastRequestAt ? formatRelative(stats.lastRequestAt) : 'Never',
    };
  }, [stats, errorRate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Request Statistics
          </h2>
          <p className="text-muted-foreground">
            Monitor MCP server request metrics and performance in real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <Badge
            variant={status === 'healthy' ? 'success' : status === 'degraded' ? 'warning' : 'outline'}
            className="text-sm px-3 py-1"
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>

          {/* Error Burst Indicator */}
          {errorBurst.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                +{errorBurst[errorBurst.length - 1]} errors
              </span>
            </div>
          )}

          {/* Auto-refresh Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <div className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-xs font-medium">Auto</span>
          </div>

          {/* Refresh Interval Selector */}
          <select
            value={refreshInterval}
            onChange={e => handleRefreshIntervalChange(parseInt(e.target.value))}
            className="px-2 py-1 text-xs bg-muted border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
          </select>

          {/* Reset Button */}
          {confirmingReset ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleReset}>
                Confirm Reset
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmingReset(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Counters
            </Button>
          )}

          {/* Manual Refresh */}
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className={`mr-2 h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      {quickStats && (
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${status === 'healthy' ? 'bg-green-500' : status === 'degraded' ? 'bg-orange-500' : 'bg-gray-400'}`} />
            <span className="text-xs font-medium capitalize">{status}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            <span className="font-mono">{quickStats.totalRequests}</span>
            <span>req</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            <span className="font-mono">{quickStats.totalBatches}</span>
            <span>batch</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span className="font-mono">{quickStats.activeSSE}</span>
            <span>/</span>
            <span className="font-mono">{quickStats.totalSSE}</span>
            <span>SSE</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-mono">{quickStats.uptime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className={`h-3.5 w-3.5 ${errorRate > 0 ? 'text-red-500' : ''}`} />
            <span className="font-mono">{quickStats.errorRate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{quickStats.lastRequest}</span>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatGauge
            icon={<Zap className="h-5 w-5" />}
            label="Total Requests"
            value={stats.totalRequests.toLocaleString()}
            subtext="Single JSON-RPC requests"
            color="blue"
            progress={stats.totalRequests > 0 ? Math.min((stats.totalRequests / Math.max(stats.totalRequests, 1000)) * 100, 100) : 0}
          />
          <StatGauge
            icon={<Layers className="h-5 w-5" />}
            label="Batch Requests"
            value={stats.totalBatchRequests.toLocaleString()}
            subtext="Array JSON-RPC requests"
            color="purple"
          />
          <StatGauge
            icon={<Bot className="h-5 w-5" />}
            label="SSE Connections"
            value={`${stats.activeSseConnections} / ${stats.totalSseConnections}`}
            subtext="Active / Total"
            color="cyan"
          />
          <StatGauge
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Error Count"
            value={stats.errorCount.toLocaleString()}
            subtext={errorRate > 0 ? `Error rate: ${errorRate.toFixed(2)}%` : 'No errors detected'}
            color={errorRate > HIGH_ERROR_RATE_THRESHOLD ? 'red' : 'emerald'}
            progress={stats.totalRequests > 0 ? Math.min((stats.errorCount / Math.max(stats.totalRequests, 1)) * 100, 100) : 0}
          />
          <StatGauge
            icon={<Clock className="h-5 w-5" />}
            label="Uptime"
            value={formatUptime(stats.uptime)}
            subtext="Since server start"
            color="green"
          />
          <StatGauge
            icon={
              <div className="flex gap-0.5 items-end h-5">
                {[40, 65, 50, 80, 55, 70, 60, 45].map((h, i) => (
                  <div key={i} className={`w-1 ${errorRate > HIGH_ERROR_RATE_THRESHOLD ? 'bg-red-400' : 'bg-green-400'} rounded-t`} style={{height: `${h}%`}} />
                ))}
              </div>
            }
            label="Error Rate"
            value={`${errorRate.toFixed(2)}%`}
            subtext={errorRate > HIGH_ERROR_RATE_THRESHOLD ? 'High error rate detected' : 'Within normal range'}
            color={errorRate > HIGH_ERROR_RATE_THRESHOLD ? 'red' : 'indigo'}
          />
          <StatGauge
            icon={<Terminal className="h-5 w-5" />}
            label="Last Request"
            value={stats.lastRequestAt ? formatRelative(stats.lastRequestAt) : 'Never'}
            subtext={stats.lastRequestAt ? `At ${new Date(stats.lastRequestAt).toLocaleTimeString()}` : 'No requests yet'}
            color="orange"
          />
          <StatGauge
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Health Status"
            value={status === 'healthy' ? 'Healthy' : status === 'degraded' ? 'Degraded' : 'Unknown'}
            subtext={status === 'healthy' ? 'All metrics within normal range' : status === 'degraded' ? 'High error rate detected' : 'Waiting for data'}
            color={status === 'healthy' ? 'green' : status === 'degraded' ? 'orange' : 'blue'}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Loading statistics...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Burst Visualization */}
      {errorBurst.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-red-500" />
              Error Burst Detection
            </CardTitle>
            <CardDescription>
              Recent error count changes (last 20 events)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-0.5 h-16">
              {errorBurst.map((burst, i) => (
                <div
                  key={i}
                  className="flex-1 bg-red-500 rounded-t transition-all"
                  style={{
                    height: `${Math.max((burst / Math.max(...errorBurst)) * 100, 5)}%`,
                    opacity: 0.4 + (i / errorBurst.length) * 0.6,
                  }}
                  title={`+${burst} errors at #${i + 1}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Oldest</span>
              <span>Most Recent: +{errorBurst[errorBurst.length - 1]} errors</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Methods List */}
      {methods && methods.list && methods.list.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Available Methods ({methods.list.length})
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {methods.list.filter(m => m.method.includes('tool')).length} tools
                {' '}
                |{' '}
                {methods.list.filter(m => m.method.includes('resource')).length} resources
                {' '}
                |{' '}
                {methods.list.filter(m => m.method.includes('prompt')).length} prompts
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px] rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold w-40">Method</th>
                    <th className="text-left p-3 font-semibold">Description</th>
                    <th className="text-left p-3 font-semibold w-48">Parameters</th>
                  </tr>
                </thead>
                <tbody>
                  {methods.list.map((m: McpMethodDescription, i: number) => (
                    <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">
                        <Badge variant="outline" className="text-xs">{m.method}</Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{m.description}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{m.params}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Stats JSON */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Raw Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] overflow-auto rounded-lg border bg-muted/30 p-4">
              <JsonViewer value={stats} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About MCP Statistics</CardTitle>
          <CardDescription>
            Understanding the metrics collected by the MCP server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                Request Metrics
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                <li>Counts single JSON-RPC requests (object payloads)</li>
                <li>Counts batch JSON-RPC requests (array payloads)</li>
                <li>Updated on each request completion</li>
                <li>Reset via the reset button or query parameter</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4 text-cyan-500" />
                SSE Metrics
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                <li>Total SSE connections established (lifetime)</li>
                <li>Currently active SSE connections (real-time)</li>
                <li>Connections expire after 5 minutes of inactivity</li>
                <li>Auto-reconnects are tracked separately</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Error Metrics
              </h4>
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                <li>Total errors across all request types</li>
                <li>Error rate calculated as percentage of total requests</li>
                <li>High error rate threshold: 10%</li>
                <li>Deprecated status at 100+ errors</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ======================== Memo helper (React.useMemo inline) ========================
// Note: React.useMemo is used in the component above directly.

export default MCPStats;
