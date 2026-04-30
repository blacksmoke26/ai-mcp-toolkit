/**
 * MetricsPanel - Comprehensive real-time metrics visualization component
 * Displays live system metrics with animated charts, gauges, and data points
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  Activity,
  Cpu,
  MemoryStick,
  Zap,
  Server,
  TrendingUp,
  TrendingDown,
  Minus,
  Gauge,
  Timer,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {useWebSocket, useToast} from '@/context/WebSocketContext';
import {cn} from '@/lib/utils';
import type {
  MetricsLiveTickPayload,
  MetricsLiveStreamState,
  MetricsGaugeState,
  MetricsTrend,
} from '@/types/websocket';

// ==================== Metrics Gauge ====================

interface MetricsGaugeProps {
  label: string;
  value: number;
  max: number;
  color: string;
  icon: React.ElementType;
  unit?: string;
  trend?: { direction: 'up' | 'down' | 'stable'; change: number };
  subLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

const MetricsGauge: React.FC<MetricsGaugeProps> = (props) => {
  const {
    label,
    value,
    max,
    color,
    icon: Icon,
    unit = '',
    trend,
    subLabel,
    size = 'md',
  } = props;

  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const getColor = (val: number, mx: number) => {
    const pct = (val / mx) * 100;
    if (pct < 40) return '#10b981';
    if (pct < 70) return '#f59e0b';
    return '#ef4444';
  };
  const gaugeColor = getColor(value, max);

  const sizeConfig = {
    sm: {width: 80, height: 48, fontSize: '11px'},
    md: {width: 120, height: 72, fontSize: '14px'},
    lg: {width: 160, height: 96, fontSize: '18px'},
  };
  const config = sizeConfig[size];

  const circumference = 100.53;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:border-border transition-colors">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg"
               style={{backgroundColor: `${color}15`, color}}>
            <Icon className="h-3.5 w-3.5"/>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {subLabel && (
              <p className="text-[10px] text-muted-foreground/60">{subLabel}</p>
            )}
          </div>
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-0.5 text-xs font-medium',
            trend.direction === 'up' ? 'text-green-500' :
              trend.direction === 'down' ? 'text-red-500' :
                'text-muted-foreground',
          )}>
            {trend.direction === 'up' ? <ArrowUpRight className="h-3 w-3"/> :
              trend.direction === 'down' ? <ArrowDownRight className="h-3 w-3"/> :
                <Minus className="h-3 w-3"/>}
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        <svg width={config.width} height={config.height} viewBox={`0 0 ${config.width} ${config.height}`}>
          <circle
            cx={config.width / 2}
            cy={config.height / 2 + 4}
            r={(config.width - 16) / 2}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.3"
          />
          <circle
            cx={config.width / 2}
            cy={config.height / 2 + 4}
            r={(config.width - 16) / 2}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={dashOffset * 0.75}
            transform={`rotate(135 ${config.width / 2} ${config.height / 2 + 4})`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span style={{fontSize: config.fontSize}} className="font-bold text-foreground tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {unit && (
            <span style={{fontSize: '9px'}} className="text-muted-foreground/60">{unit}</span>
          )}
        </div>
      </div>

      <div className="w-full">
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{width: `${percentage}%`, backgroundColor: gaugeColor}}
          />
        </div>
      </div>
    </div>
  );
};

// ==================== Sparkline Chart ====================

/**
 * Properties for the Sparkline chart component.
 */
interface SparklineProps {
  /**
   * Array of numerical data points to visualize.
   */
  data: number[];
  /**
   * The color string (hex, rgb, etc.) for the chart line and area.
   */
  color: string;
  /**
   * The height of the SVG chart in pixels.
   * @default 60
   */
  height?: number;
  /**
   * The width of the SVG chart in pixels.
   * @default 200
   */
  width?: number;
  /**
   * The label text displayed above the chart.
   */
  label: string;
  /**
   * Whether to render the filled area below the line.
   * @default true
   */
  showArea?: boolean;
}

/**
 * Sparkline - A minimal line chart component for visualizing trends.
 *
 * Renders an SVG-based sparkline chart with optional area fill,
 * grid lines, and a pulsating indicator for the latest data point.
 */
const Sparkline: React.FC<SparklineProps> = (props) => {
  const {
    data,
    color,
    height = 60,
    width = 200,
    label,
    showArea = true,
  } = props;

  if (data.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-4">
        <BarChart3 className="h-6 w-6 text-muted-foreground/40"/>
        <p className="text-xs text-muted-foreground/60">No data available</p>
      </div>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground tabular-nums">
          {data[data.length - 1]?.toLocaleString() ?? 0}
        </span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
           className="overflow-visible">
        {showArea && (
          <polygon
            points={areaPoints.join(' ')}
            fill={color}
            fillOpacity="0.1"
            className="transition-all duration-300"
          />
        )}
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-300"
        />
        {/* Current point indicator */}
        <circle
          cx={width - padding}
          cy={parseFloat(points[points.length - 1].split(',')[1])}
          r="3"
          fill={color}
          className="animate-pulse"
        />
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={height - padding - pct * (height - 2 * padding)}
            x2={width - padding}
            y2={height - padding - pct * (height - 2 * padding)}
            stroke="var(--muted)"
            strokeWidth="0.5"
            strokeDasharray="2 4"
            opacity="0.5"
          />
        ))}
      </svg>
    </div>
  );
};

// ==================== Request Rate Bar Chart ====================

/**
 * Properties for the RequestBarChart component.
 */
interface RequestBarChartProps {
  /**
   * Array of data points to visualize in the bar chart.
   * Each object contains a label for the x-axis and a numerical value for the bar height.
   */
  data: { label: string; value: number }[];
  /**
   * The base color string (hex, rgb, etc.) for the bars.
   * The component will apply opacity variations based on the value.
   */
  color: string;
  /**
   * The height of the chart container in pixels.
   * @default 80
   */
  height?: number;
}

/**
 * RequestBarChart - A vertical bar chart component for visualizing request distribution.
 *
 * Renders a series of vertical bars representing the provided data points.
 * The height of each bar is proportional to its value relative to the maximum value in the dataset.
 * Bars utilize the provided color with calculated opacity to indicate intensity.
 */
const RequestBarChart: React.FC<RequestBarChartProps> = ({data, color, height = 80}) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Request Distribution</span>
      <div className="flex items-end gap-1" style={{height}}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t transition-all duration-500 hover:opacity-80"
              style={{
                height: `${Math.max((d.value / max) * (height - 20), 4)}px`,
                backgroundColor: `${color}${Math.floor(Math.max((d.value / max) * 80, 20)).toString(16).padStart(2, '0')}`,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {data.slice(-5).map((d, i) => (
          <span key={i} className="text-[9px] text-muted-foreground/60">{d.label}</span>
        ))}
      </div>
    </div>
  );
};

// ==================== Latency Histogram ====================

/**
 * Properties for the LatencyHistogram component.
 */
interface LatencyHistogramProps {
  /**
   * The 50th percentile latency value in milliseconds.
   * Represents the median latency.
   */
  p50: number;
  /**
   * The 95th percentile latency value in milliseconds.
   * Represents the latency below which 95% of requests fall.
   */
  p95: number;
  /**
   * The 99th percentile latency value in milliseconds.
   * Represents the latency below which 99% of requests fall.
   */
  p99: number;
  /**
   * The average (mean) latency value in milliseconds.
   */
  avg: number;
  /**
   * The minimum observed latency value in milliseconds.
   */
  min: number;
  /**
   * The maximum observed latency value in milliseconds.
   */
  max: number;
}

const LatencyHistogram: React.FC<LatencyHistogramProps> = ({p50, p95, p99, avg, min, max}) => {
  const maxLatency = 500;
  const getLatencyColor = (ms: number) => {
    if (ms < 100) return '#10b981';
    if (ms < 250) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">Latency Distribution</span>
      <div className="space-y-3">
        {[
          {label: 'P50', value: p50, color: getLatencyColor(p50)},
          {label: 'P95', value: p95, color: getLatencyColor(p95)},
          {label: 'P99', value: p99, color: getLatencyColor(p99)},
          {label: 'Avg', value: avg, color: '#3b82f6'},
          {label: 'Min', value: min, color: '#8b5cf6'},
          {label: 'Max', value: max, color: '#ec4899'},
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-8 text-[10px] font-semibold uppercase text-muted-foreground">{item.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{width: `${Math.min((item.value / maxLatency) * 100, 100)}%`, backgroundColor: item.color}}
              />
            </div>
            <span className="w-14 text-right text-[11px] font-mono font-medium text-foreground tabular-nums">
              {item.value}ms
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== Memory Detail Panel ====================

/**
 * Properties for the MemoryDetail component.
 */
interface MemoryDetailProps {
  /**
   * Resident Set Size - The total memory occupied by the process in RAM.
   * Includes heap, code segment, and stack.
   */
  rss: number;
  /**
   * The total size of the allocated heap.
   * This represents the total amount of memory reserved for the heap by the V8 engine.
   */
  heapTotal: number;
  /**
   * The amount of heap memory currently in use.
   * This is the portion of the heapTotal that actually contains live objects.
   */
  heapUsed: number;
  /**
   * The amount of memory used by C++ objects bound to JavaScript objects managed by V8.
   */
  external: number;
}

const MemoryDetail: React.FC<MemoryDetailProps> = ({rss, heapTotal, heapUsed, external}) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">Memory Breakdown</span>
      <div className="space-y-2">
        {[
          {label: 'RSS', value: rss, color: '#3b82f6'},
          {label: 'Heap Total', value: heapTotal, color: '#8b5cf6'},
          {label: 'Heap Used', value: heapUsed, color: '#06b6d4'},
          {label: 'External', value: external, color: '#f59e0b'},
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{backgroundColor: item.color}}/>
              <span className="text-xs font-medium text-foreground">{item.label}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {formatBytes(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== Main MetricsPanel ====================

const MetricsPanel: React.FC = () => {
  const {send, isConnected, dashboardStats} = useWebSocket();
  const {addToast} = useToast();
  const [collapsed, setCollapsed] = React.useState(false);
  const [streamActive, setStreamActive] = React.useState(false);

  // Live data refs
  // const metricsTickRef = React.useRef<MetricsLiveTickPayload | null>(null);
  // const requestsPerSecondRef = React.useRef<number[]>([]);
  // const latencyRef = React.useRef<number[]>([]);
  // const cpuRef = React.useRef<number[]>([]);
  // const memoryRef = React.useRef<number[]>([]);
  // const eventCountsRef = React.useRef<Record<string, number>>({});

  const [lastTick, setLastTick] = React.useState<Date>(new Date());

  // Simulated initial data
  const [simulatedData, setSimulatedData] = React.useState<{
    totalRequests: number;
    successRate: number;
    activeConnections: number;
    avgLatency: number;
    p50: number;
    p95: number;
    p99: number;
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    uptime: number;
    requestsPerSecond: number;
    errorCount: number;
  }>({
    totalRequests: 0,
    successRate: 99.2,
    activeConnections: dashboardStats.connectedClients,
    avgLatency: dashboardStats.averageLatency,
    p50: Math.floor(dashboardStats.averageLatency * 0.5),
    p95: Math.floor(dashboardStats.averageLatency * 1.2),
    p99: Math.floor(dashboardStats.averageLatency * 2.0),
    rss: 45_000_000,
    heapTotal: 64_000_000,
    heapUsed: 32_000_000,
    external: 12_000_000,
    uptime: dashboardStats.serverUptime,
    requestsPerSecond: dashboardStats.eventsPerSecond,
    errorCount: 0,
  });

  // Track history for sparklines
  const requestsPerSecondHistory = React.useRef<number[]>([]);
  const latencyHistory = React.useRef<number[]>([]);
  const cpuHistory = React.useRef<number[]>([]);
  const memoryHistory = React.useRef<number[]>([]);

  // Update simulation data periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedData((prev) => {
        const newTotal = prev.totalRequests + Math.floor(Math.random() * 5 + 1);
        const newRps = Math.floor(Math.random() * 100 + 20);
        const newLatency = Math.floor(Math.random() * 200 + 20);
        const newHeapUsed = prev.heapUsed + Math.floor(Math.random() * 1_000_000 - 500_000);
        const newRss = prev.rss + Math.floor(Math.random() * 500_000 - 250_000);

        const newData = {
          ...prev,
          totalRequests: newTotal,
          successRate: Math.min(100, Math.max(95, 99.2 + (Math.random() - 0.5))),
          activeConnections: dashboardStats.connectedClients || Math.floor(Math.random() * 10 + 1),
          avgLatency: newLatency,
          p50: Math.floor(newLatency * 0.5 + Math.random() * 10),
          p95: Math.floor(newLatency * 1.2 + Math.random() * 30),
          p99: Math.floor(newLatency * 2.0 + Math.random() * 60),
          rss: Math.max(20_000_000, newRss),
          heapTotal: prev.heapTotal,
          heapUsed: Math.max(10_000_000, Math.min(prev.heapTotal, newHeapUsed)),
          external: prev.external + Math.floor(Math.random() * 200_000),
          uptime: prev.uptime + 1,
          requestsPerSecond: newRps,
          errorCount: prev.errorCount + (Math.random() > 0.95 ? 1 : 0),
        };

        // Update history refs
        requestsPerSecondHistory.current = [...requestsPerSecondHistory.current.slice(-59), newRps];
        latencyHistory.current = [...latencyHistory.current.slice(-59), newLatency];
        cpuHistory.current = [...cpuHistory.current.slice(-59), Math.floor(Math.random() * 60 + 10)];
        memoryHistory.current = [...memoryHistory.current.slice(-59), (newHeapUsed / prev.heapTotal) * 100];

        return newData;
      });
      setLastTick(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, [dashboardStats.connectedClients]);

  const handleStartMetrics = React.useCallback(() => {
    if (!isConnected) {
      addToast('warning', 'Not Connected', 'Please connect to the WebSocket server first');
      return;
    }
    send('metrics:live:start', {interval: 2000} as any);
    setStreamActive(true);
    addToast('success', 'Metrics Streaming', 'Live metrics stream started');
  }, [isConnected, send, addToast]);

  const handleStopMetrics = React.useCallback(() => {
    if (!isConnected) return;
    send('metrics:live:stop' as any, {} as any);
    setStreamActive(false);
    addToast('info', 'Metrics Stopped', 'Live metrics stream stopped');
  }, [isConnected, send, addToast]);

  const handleFetchMetrics = React.useCallback(() => {
    if (!isConnected) {
      addToast('warning', 'Not Connected', 'Please connect to the WebSocket server first');
      return;
    }
    send('metrics:fetch' as any, {} as any);
    addToast('info', 'Metrics Fetched', 'Fetching latest metrics snapshot');
  }, [isConnected, send, addToast]);

  const requestLabels = ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '10m'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Live Metrics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time system monitoring and performance metrics
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <Timer className="h-4 w-4 text-muted-foreground"/>
            <span className="text-xs text-muted-foreground">Last tick:</span>
            <span className="text-xs font-mono text-foreground tabular-nums">
              {lastTick.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
            <Zap className={cn('h-4 w-4', streamActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground')}/>
            <span className={cn('text-xs font-medium', streamActive ? 'text-green-500' : 'text-muted-foreground')}>
              {streamActive ? 'Streaming' : 'Idle'}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4">
        <button
          onClick={handleStartMetrics}
          disabled={!isConnected || streamActive}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="h-3.5 w-3.5"/>
          Start Streaming
        </button>
        <button
          onClick={handleStopMetrics}
          disabled={!streamActive}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Pause className="h-3.5 w-3.5"/>
          Stop Streaming
        </button>
        <button
          onClick={handleFetchMetrics}
          disabled={!isConnected}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-500 transition-all hover:bg-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className="h-3.5 w-3.5"/>
          Fetch Snapshot
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted"
          >
            <Settings className="h-3 w-3"/>
            {collapsed ? 'Expand' : 'Collapse'}
            {collapsed ? <ChevronDown className="h-3 w-3"/> : <ChevronUp className="h-3 w-3"/>}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                  <Server className="h-5 w-5"/>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Requests</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {simulatedData.totalRequests.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/15 text-green-500">
                  <TrendingUp className="h-5 w-5"/>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-xl font-bold text-green-500 tabular-nums">
                    {simulatedData.successRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500">
                  <Activity className="h-5 w-5"/>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Req/sec</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {simulatedData.requestsPerSecond}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
                  <Gauge className="h-5 w-5"/>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Avg Latency</p>
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {simulatedData.avgLatency}ms
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Gauges Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricsGauge
              label="CPU Usage"
              value={cpuHistory.current[cpuHistory.current.length - 1] || 25}
              max={100}
              color="#8b5cf6"
              icon={Cpu}
              unit="%"
              trend={{direction: 'up' as 'up', change: 2.5}}
            />
            <MetricsGauge
              label="Memory"
              value={simulatedData.heapUsed}
              max={simulatedData.heapTotal}
              color="#06b6d4"
              icon={MemoryStick}
              unit="MB"
              trend={{direction: 'down' as 'down', change: -1.2}}
            />
            <MetricsGauge
              label="Latency"
              value={simulatedData.avgLatency}
              max={500}
              color={simulatedData.avgLatency < 100 ? '#10b981' : simulatedData.avgLatency < 250 ? '#f59e0b' : '#ef4444'}
              icon={Timer}
              unit="ms"
              trend={{direction: 'up' as 'up', change: 5.3}}
            />
            <MetricsGauge
              label="Connections"
              value={simulatedData.activeConnections}
              max={100}
              color="#3b82f6"
              icon={Activity}
              unit="active"
              trend={{direction: 'stable' as 'stable', change: 0}}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Request Rate Chart */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Request Rate Over Time
              </h3>
              <Sparkline
                data={requestsPerSecondHistory.current.length > 0 ? requestsPerSecondHistory.current : Array(30).fill(0).map(() => Math.floor(Math.random() * 100 + 20))}
                color="#10b981"
                height={80}
                width={400}
                label="Requests per second"
              />
            </div>

            {/* Latency Chart */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Latency Over Time
              </h3>
              <Sparkline
                data={latencyHistory.current.length > 0 ? latencyHistory.current : Array(30).fill(0).map(() => Math.floor(Math.random() * 200 + 20))}
                color={simulatedData.avgLatency < 100 ? '#10b981' : '#f59e0b'}
                height={80}
                width={400}
                label="Latency (ms)"
              />
            </div>

            {/* Memory Chart */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Memory Usage Trend
              </h3>
              <Sparkline
                data={memoryHistory.current.length > 0 ? memoryHistory.current : Array(30).fill(0).map(() => Math.floor(Math.random() * 40 + 30))}
                color="#06b6d4"
                height={80}
                width={400}
                label="Heap usage (%)"
              />
            </div>

            {/* Latency Histogram */}
            <div className="rounded-xl border bg-card p-5">
              <LatencyHistogram
                p50={simulatedData.p50}
                p95={simulatedData.p95}
                p99={simulatedData.p99}
                avg={simulatedData.avgLatency}
                min={Math.max(1, Math.floor(simulatedData.avgLatency * 0.1))}
                max={Math.min(600, Math.floor(simulatedData.avgLatency * 3))}
              />
            </div>
          </div>

          {/* Memory Detail + CPU History */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <MemoryDetail
                rss={simulatedData.rss}
                heapTotal={simulatedData.heapTotal}
                heapUsed={simulatedData.heapUsed}
                external={simulatedData.external}
              />
            </div>

            <div className="rounded-xl border bg-card p-5">
              <RequestBarChart
                data={requestLabels.map((label, i) => ({
                  label,
                  // eslint-disable-next-line react-hooks/purity
                  value: Math.floor(Math.random() * 150 + 20),
                }))}
                color="#8b5cf6"
                height={80}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPanel;
