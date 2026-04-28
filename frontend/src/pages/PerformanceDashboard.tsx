/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Flame,
  Gauge,
  Network,
  RefreshCw,
  Server,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/Tabs';
import {
  getDeepHealthCheck,
  getErrorMetrics,
  getMetrics, getMetricsAnomalies, getMetricsTrends,
  getProviderMetrics,
  getSystemMetrics,
  getTokenMetrics,
  getToolMetrics,
  type MetricsResponse,
  type SystemMetricsResponse,
} from '@/lib/api';
import type {DeepHealthCheckResponse, MetricsAnomaliesResponse, MetricsTrendsResponse} from '@/types/api';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';

/**
 * Props for the BarChart component.
 */
interface BarChartProps {
  /** Array of data points to display in the chart. */
  data: { label: string; value: number }[];
  /** Maximum number of bars to display. Defaults to 10. */
  maxBars?: number;
  /** Tailwind CSS color class for the bars. Defaults to 'bg-blue-500'. */
  color?: string;
}

// Simple bar chart component
const BarChart: React.FC<BarChartProps> = (props) => {
  const {data, maxBars = 10, color = 'bg-blue-500'} = props;

  /** The maximum value in the dataset, used to calculate bar widths. */
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  /** The dataset limited to the specified number of bars. */
  const limitedData = data.slice(0, maxBars);

  return (
    <div className="space-y-2">
      {limitedData.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-medium truncate">{item.label}</span>
            <span className="text-muted-foreground">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${color} transition-all duration-300`}
              style={{width: `${(item.value / maxValue) * 100}%`}}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Props for the CircularProgress component.
 */
interface CircularProgressProps {
  /** The current progress value. */
  value: number;
  /** The maximum value representing 100% progress. Defaults to 100. */
  max?: number;
  /** The width and height of the SVG in pixels. Defaults to 80. */
  size?: number;
  /** The width of the progress stroke in pixels. Defaults to 8. */
  strokeWidth?: number;
  /** Tailwind CSS text color class for the progress circle. Defaults to 'text-blue-500'. */
  color?: string;
}

// Simple circular progress component
const CircularProgress = (props: CircularProgressProps) => {
  const {
    value,
    max = 100,
    size = 80,
    strokeWidth = 8,
    color = 'text-blue-500',
  } = props;

  /** Calculated radius of the circle based on size and stroke width. */
  const radius = (size - strokeWidth) / 2;
  /** The total circumference of the circle. */
  const circumference = radius * 2 * Math.PI;
  /** The stroke dash offset to create the progress effect. */
  const offset = circumference - (value / max) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={color}
      />
    </svg>
  );
};

/**
 * Props for the StatCard component.
 */
interface StatCardProps {
  /** The title of the stat card. */
  title: string;
  /** The main value to display. */
  value: string | number;
  /** Optional description text below the title. */
  description?: string;
  /** The Lucide React icon component to display. */
  icon: React.ElementType;
  /** The trend direction of the value. */
  trend?: 'up' | 'down' | 'neutral';
  /** The string value to display for the trend (e.g., '5% vs last week'). */
  trendValue?: string;
  /** The color theme for the card. Defaults to 'blue'. */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

// Stat card component
const StatCard = (props: StatCardProps) => {
  const {
    title,
    value,
    description,
    icon: Icon,
    trend,
    trendValue,
    color = 'blue',
  } = props;

  /** Mapping of color names to Tailwind CSS classes for icon background and text. */
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    red: 'text-red-500 bg-red-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4"/>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trendValue && (
          <div className="flex items-center mt-2 text-xs">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1"/>
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1"/>
            ) : null}
            <span
              className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function PerformanceDashboard() {
  /** General metrics data including requests, tokens, and tools summary. */
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  /** System-level metrics such as memory usage and uptime. */
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricsResponse | null>(null);
  /** Metrics specific to tool execution and performance. */
  const [toolMetrics, setToolMetrics] = useState<any | null>(null);
  /** Metrics related to token usage and costs. */
  const [tokenMetrics, setTokenMetrics] = useState<any | null>(null);
  /** Metrics regarding provider status and health. */
  const [providerMetrics, setProviderMetrics] = useState<any | null>(null);
  /** Aggregated error metrics and recent error logs. */
  const [errorMetrics, setErrorMetrics] = useState<any | null>(null);
  /** Trend analysis data comparing current and previous periods. */
  const [trends, setTrends] = useState<MetricsTrendsResponse | null>(null);
  /** Detected anomalies in request latency. */
  const [anomalies, setAnomalies] = useState<MetricsAnomaliesResponse | null>(null);
  /** Deep health check results providing an overall system score. */
  const [deepHealth, setDeepHealth] = useState<DeepHealthCheckResponse | null>(null);
  /** Loading state indicating if data is currently being fetched. */
  const [loading, setLoading] = useState<boolean>(true);
  /** Error message string if any data fetch fails. */
  const [error, setError] = useState<string | null>(null);
  /** Flag indicating whether auto-refresh is enabled. */
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  /** The time range in hours for which metrics are displayed. */
  const [hours, setHours] = useState<number>(1);

  /**
   * Fetches all metrics data from the API.
   * Handles errors for individual endpoints silently where appropriate.
   */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsData, systemData, toolData, tokenData, providerData, errorData, trendsData, anomaliesData, healthData] = await Promise.all([
        getMetrics(hours).catch((e) => ({error: e.message})),
        getSystemMetrics().catch((e) => ({error: e.message})),
        getToolMetrics().catch((e) => ({error: e.message})),
        getTokenMetrics().catch((e) => ({error: e.message})),
        getProviderMetrics().catch((e) => ({error: e.message})),
        getErrorMetrics().catch((e) => ({error: e.message})),
        getMetricsTrends(hours).catch(() => null),
        getMetricsAnomalies(hours, 2).catch(() => null),
        getDeepHealthCheck().catch(() => null),
      ]);

      if ('error' in metricsData) {
        setError('Failed to fetch metrics');
      } else {
        setMetrics(metricsData);
      }

      if ('error' in systemData) {
        // Silent fail for system metrics
      } else {
        setSystemMetrics(systemData);
      }

      if ('error' in toolData) {
        // Silent fail
      } else {
        setToolMetrics(toolData);
      }

      if ('error' in tokenData) {
        // Silent fail
      } else {
        setTokenMetrics(tokenData);
      }

      if ('error' in providerData) {
        // Silent fail
      } else {
        setProviderMetrics(providerData);
      }

      if ('error' in errorData) {
        // Silent fail
      } else {
        setErrorMetrics(errorData);
      }

      if (trendsData) {
        setTrends(trendsData);
      }

      if (anomaliesData) {
        setAnomalies(anomaliesData);
      }

      if (healthData) {
        setDeepHealth(healthData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (autoRefresh) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line
  }, [autoRefresh, hours]);

  /**
   * Formats a number into a human-readable string (e.g., 1.5M, 20K).
   * @param num - The number to format.
   * @returns The formatted string.
   */
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
            <p className="text-muted-foreground">Real-time metrics and system monitoring</p>
          </div>
          <Button variant="outline" disabled>
            <RefreshCw className="mr-2 h-4 w-4"/>
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted rounded mb-2"/>
                <div className="h-8 w-16 bg-muted rounded mb-2"/>
                <div className="h-3 w-32 bg-muted rounded"/>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 w-48 bg-muted rounded mb-4"/>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full bg-muted rounded"/>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time metrics and system monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="block text-[11px] text-muted-foreground">Time Range:</span>
            <Select
              value={String(hours)}
              onValueChange={x => setHours(Number(x))}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose interval"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="6">6 hours</SelectItem>
                <SelectItem value="12">12 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deep Health Check */}
      {deepHealth && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5"/>
                  System Health Score
                </CardTitle>
                <CardDescription>
                  Comprehensive health assessment based on system, providers, and stability
                </CardDescription>
              </div>
              <Badge
                variant={
                  deepHealth.status === 'healthy' ? 'success'
                    : deepHealth.status === 'degraded' ? 'warning'
                      : 'destructive'
                }
                className="text-lg px-4 py-1"
              >
                {deepHealth.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Score Circle */}
              <div className="flex flex-col items-center justify-center">
                <CircularProgress
                  value={deepHealth.score}
                  max={100}
                  size={120}
                  strokeWidth={10}
                  color={
                    deepHealth.score >= 80 ? 'text-green-500'
                      : deepHealth.score >= 50 ? 'text-yellow-500'
                        : 'text-red-500'
                  }
                />
                <div className={`text-3xl font-bold mt-2 ${
                  deepHealth.score >= 80 ? 'text-green-500'
                    : deepHealth.score >= 50 ? 'text-yellow-500'
                      : 'text-red-500'
                }`}>
                  {deepHealth.score}/100
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {new Date(deepHealth.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">System Resources</span>
                    <span className="font-medium">{deepHealth.breakdown.system.score}/40</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        deepHealth.breakdown.system.score >= 30 ? 'bg-green-500'
                          : deepHealth.breakdown.system.score >= 15 ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{width: `${(deepHealth.breakdown.system.score / 40) * 100}%`}}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Memory: {deepHealth.breakdown.system.memUsagePercent}% used
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Provider Health</span>
                    <span className="font-medium">{deepHealth.breakdown.providers.score}/30</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        deepHealth.breakdown.providers.score >= 22 ? 'bg-green-500'
                          : deepHealth.breakdown.providers.score >= 11 ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{width: `${(deepHealth.breakdown.providers.score / 30) * 100}%`}}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {providerMetrics?.registeredProviders?.filter((p: string) =>
                      providerMetrics?.liveStatus?.[p]?.status === 'ok',
                    ).length || 0} of {providerMetrics?.registeredProviders?.length || 0} providers healthy
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Stability (Error Rate)</span>
                    <span className="font-medium">{deepHealth.breakdown.stability.score}/30</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        deepHealth.breakdown.stability.score >= 22 ? 'bg-green-500'
                          : deepHealth.breakdown.stability.score >= 11 ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{width: `${(deepHealth.breakdown.stability.score / 30) * 100}%`}}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Error rate: {(deepHealth.breakdown.stability.errorRate * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={formatNumber(metrics?.summary.requests.total || 0)}
          description="In selected period"
          icon={Activity}
          color="blue"
          trend={trends?.comparison.requests.changePercent !== undefined ? (trends.comparison.requests.changePercent >= 0 ? 'up' : 'down') : 'neutral'}
          trendValue={trends?.comparison.requests.changePercent !== undefined ? `${Math.abs(trends.comparison.requests.changePercent).toFixed(1)}% vs previous` : undefined}
        />
        <StatCard
          title="Avg Latency"
          value={`${metrics?.summary.requests.avgLatencyMs || 0}ms`}
          description="Average response time"
          icon={Clock}
          color="green"
          trend={trends?.comparison.latency.changePercent !== undefined ? (trends.comparison.latency.changePercent >= 0 ? 'up' : 'down') : 'neutral'}
          trendValue={trends?.comparison.latency.changePercent !== undefined ? `${Math.abs(trends.comparison.latency.changePercent).toFixed(1)}% vs previous` : undefined}
        />
        <StatCard
          title="Total Tokens"
          value={formatNumber((metrics?.summary.tokens.totalInput || 0) + (metrics?.summary.tokens.totalOutput || 0))}
          description="Input + Output"
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Error Rate"
          value={`${metrics?.summary.tools.successRate !== undefined ? (100 - metrics.summary.tools.successRate).toFixed(1) : 0}%`}
          description="Tool failures"
          icon={AlertCircle}
          color="red"
          trend={trends?.comparison.errors.changePercent !== undefined ? (trends.comparison.errors.changePercent >= 0 ? 'up' : 'down') : 'neutral'}
          trendValue={trends?.comparison.errors.changePercent !== undefined ? `${Math.abs(trends.comparison.errors.changePercent).toFixed(1)}% vs previous` : undefined}
        />
      </div>

      {/* Tabs for different metric views */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="requests">
            <BarChart3 className="mr-2 h-4 w-4"/>
            Requests
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Server className="mr-2 h-4 w-4"/>
            Tools
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <Flame className="mr-2 h-4 w-4"/>
            Tokens
          </TabsTrigger>
          <TabsTrigger value="system">
            <Cpu className="mr-2 h-4 w-4"/>
            System
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertCircle className="mr-2 h-4 w-4"/>
            Errors
          </TabsTrigger>
          <TabsTrigger value="trends">
            <Activity className="mr-2 h-4 w-4"/>
            Trends
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <Flame className="mr-2 h-4 w-4"/>
            Anomalies
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request Latency Percentiles</CardTitle>
                <CardDescription>Latency distribution across all requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {metrics?.summary.requests.p50LatencyMs || 0}ms
                    </div>
                    <div className="text-sm text-muted-foreground">P50</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">
                      {metrics?.summary.requests.p95LatencyMs || 0}ms
                    </div>
                    <div className="text-sm text-muted-foreground">P95</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {metrics?.summary.requests.p99LatencyMs || 0}ms
                    </div>
                    <div className="text-sm text-muted-foreground">P99</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requests by Endpoint</CardTitle>
                <CardDescription>Top endpoints by request count</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.summary.requests.byEndpoint && Object.keys(metrics.summary.requests.byEndpoint).length > 0 ? (
                  <BarChart
                    data={Object.entries(metrics.summary.requests.byEndpoint)
                      .sort((a, b) => b[1] - a[1])
                      .map(([label, value]) => ({label, value}))}
                    maxBars={5}
                    color="bg-blue-500"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No request data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Code Distribution</CardTitle>
                <CardDescription>HTTP response codes</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.summary.requests.byStatusCode && Object.keys(metrics.summary.requests.byStatusCode).length > 0 ? (
                  <BarChart
                    data={Object.entries(metrics.summary.requests.byStatusCode)
                      .map(([label, value]) => ({label, value}))}
                    color="bg-green-500"
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No status code data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Tool Calls"
              value={formatNumber(toolMetrics?.totalCalls || 0)}
              description="All tool executions"
              icon={Server}
              color="blue"
            />
            <StatCard
              title="Success Rate"
              value={`${toolMetrics?.successRate || 0}%`}
              description="Tool execution success"
              icon={CheckCircle2}
              color={toolMetrics?.successRate >= 95 ? 'green' : toolMetrics?.successRate >= 80 ? 'yellow' : 'red'}
            />
            <StatCard
              title="Avg Duration"
              value={`${toolMetrics?.avgDurationMs || 0}ms`}
              description="Average execution time"
              icon={Clock}
              color="purple"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tool Performance</CardTitle>
              <CardDescription>Execution metrics by tool</CardDescription>
            </CardHeader>
            <CardContent>
              {toolMetrics?.byTool && Object.keys(toolMetrics.byTool).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(toolMetrics.byTool).map(([name, stats]: [string, any]) => (
                    <div key={name} className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{name}</div>
                        <Badge variant={stats.successRate >= 90 ? 'default' : 'destructive'}>
                          {stats.successRate}% success
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Calls: </span>
                          <span className="font-medium">{stats.calls}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg: </span>
                          <span className="font-medium">{stats.avgDurationMs}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Errors: </span>
                          <span className="font-medium">{Math.round(stats.calls * (1 - stats.successRate / 100))}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No tool metrics available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Input Tokens"
              value={formatNumber(tokenMetrics?.totalInput || 0)}
              description="Prompt tokens"
              icon={Database}
              color="blue"
            />
            <StatCard
              title="Output Tokens"
              value={formatNumber(tokenMetrics?.totalOutput || 0)}
              description="Completion tokens"
              icon={Zap}
              color="green"
            />
            <StatCard
              title="Est. Cost"
              value={`$${tokenMetrics?.estimatedCost?.toFixed(4) || '0.0000'}`}
              description="Estimated cost"
              icon={Gauge}
              color="purple"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Token Usage by Provider</CardTitle>
              <CardDescription>Token consumption breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {tokenMetrics?.byProvider && Object.keys(tokenMetrics.byProvider).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(tokenMetrics.byProvider).map(([provider, stats]: [string, any]) => (
                    <div key={provider} className="rounded-lg border p-4 space-y-3">
                      <div className="font-medium">{provider}</div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Input: </span>
                          <span className="font-medium">{formatNumber(stats.inputTokens)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Output: </span>
                          <span className="font-medium">{formatNumber(stats.outputTokens)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total: </span>
                          <span className="font-medium">{formatNumber(stats.totalTokens)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Network className="h-3 w-3"/>
                        {stats.requests} requests
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No token metrics available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Memory Used</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {systemMetrics?.system.memoryUsedMb || 0} MB
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of {systemMetrics?.system.memoryTotalMb || 0} MB
                  </div>
                </div>
                <CircularProgress
                  value={systemMetrics?.system.memoryUsedMb || 0}
                  max={systemMetrics?.system.memoryTotalMb || 100}
                  size={60}
                  strokeWidth={6}
                  color="text-blue-500"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Event Loop Lag</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics?.system.eventLoopLagMs || 0} ms
                </div>
                <div className="text-xs text-muted-foreground">
                  Lower is better {'(< 5ms ideal)'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor((systemMetrics?.platform.uptime || 0) / 3600)}h{' '}
                  {Math.floor(((systemMetrics?.platform.uptime || 0) % 3600) / 60)}m
                </div>
                <div className="text-xs text-muted-foreground">
                  Node.js {systemMetrics?.platform.nodeVersion || 'unknown'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {systemMetrics?.platform.platform || 'unknown'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {systemMetrics?.platform.arch || 'unknown'} • PID: {systemMetrics?.platform.pid || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Errors"
              value={errorMetrics?.total || 0}
              description="In selected period"
              icon={AlertCircle}
              color="red"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Latest error occurrences</CardDescription>
            </CardHeader>
            <CardContent>
              {errorMetrics?.recentErrors && errorMetrics.recentErrors.length > 0 ? (
                <div className="space-y-2">
                  {errorMetrics.recentErrors.slice(0, 10).map((error: any, index: number) => (
                    <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-red-700">{error.type || 'Unknown'}</div>
                        <div className="text-xs text-red-500">
                          {error.timestamp ? new Date(error.timestamp).toLocaleTimeString() : ''}
                        </div>
                      </div>
                      <div className="text-sm text-red-600 mt-1">{error.message || 'No message'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2"/>
                  No errors recorded in this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          {trends ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Period-over-Period Comparison</CardTitle>
                  <CardDescription>
                    Comparing {trends.period.lengthHours}h current period vs previous {trends.period.lengthHours}h
                    period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Requests Comparison */}
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Total Requests</div>
                        <Badge variant={trends.comparison.requests.changePercent >= 0 ? 'default' : 'secondary'}>
                          {trends.comparison.requests.changePercent >= 0 ? (
                            <TrendingUp className="mr-1 h-3 w-3 text-green-500"/>
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3 text-red-500"/>
                          )}
                          {Math.abs(trends.comparison.requests.changePercent).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium text-blue-500">{trends.comparison.requests.current}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Previous: </span>
                          <span className="font-medium text-gray-500">{trends.comparison.requests.previous}</span>
                        </div>
                      </div>
                    </div>

                    {/* Errors Comparison */}
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Total Errors</div>
                        <Badge variant={trends.comparison.errors.changePercent <= 0 ? 'success' : 'destructive'}>
                          {trends.comparison.errors.changePercent >= 0 ? (
                            <TrendingUp className="mr-1 h-3 w-3 text-red-500"/>
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3 text-green-500"/>
                          )}
                          {Math.abs(trends.comparison.errors.changePercent).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium text-red-500">{trends.comparison.errors.current}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Previous: </span>
                          <span className="font-medium text-gray-500">{trends.comparison.errors.previous}</span>
                        </div>
                      </div>
                    </div>

                    {/* Latency Comparison */}
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Avg Latency</div>
                        <Badge variant={trends.comparison.latency.changePercent <= 0 ? 'success' : 'destructive'}>
                          {trends.comparison.latency.changePercent >= 0 ? (
                            <TrendingUp className="mr-1 h-3 w-3 text-red-500"/>
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3 text-green-500"/>
                          )}
                          {Math.abs(trends.comparison.latency.changePercent).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium text-yellow-500">{trends.comparison.latency.current}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Previous: </span>
                          <span className="font-medium text-gray-500">{trends.comparison.latency.previous}ms</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Period Timelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Period:</span>
                      <span className="font-mono">
                        {new Date(trends.period.current.start).toLocaleString()} → {new Date(trends.period.current.end).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Previous Period:</span>
                      <span className="font-mono">
                        {new Date(trends.period.previous.start).toLocaleString()} → {new Date(trends.period.previous.end).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4"/>
              <AlertTitle>Trend data unavailable</AlertTitle>
              <AlertDescription>
                Insufficient data to calculate trends. Try selecting a longer time range.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-4">
          {anomalies ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Latency Anomaly Detection</CardTitle>
                  <CardDescription>
                    Z-score analysis with threshold of {anomalies.analysis.threshold}σ
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div
                        className="text-2xl font-bold text-blue-500">{anomalies.analysis.meanLatencyMs.toFixed(1)}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Mean Latency</div>
                    </div>
                    <div className="text-center">
                      <div
                        className="text-2xl font-bold text-yellow-500">{anomalies.analysis.standardDeviation.toFixed(1)}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Standard Deviation</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-2xl font-bold ${anomalies.count > 0 ? 'text-red-500' : 'text-green-500'}`}>{anomalies.count}</div>
                      <div className="text-sm text-muted-foreground">Anomalies Found</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {anomalies.anomalies.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Detect Anomalies</CardTitle>
                    <CardDescription>{anomalies.anomalies.length} unusual requests detected</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {anomalies.anomalies.map((anomaly, index: number) => (
                        <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                          <div className="flex justify-between items-start">
                            <div className="font-medium">
                              <Badge variant="destructive" className="mr-2">
                                {anomaly.zScore.toFixed(2)}σ
                              </Badge>
                              {anomaly.method} {anomaly.path}
                            </div>
                            <div className="text-xs text-red-500">
                              {anomaly.latencyMs}ms
                            </div>
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            {new Date(anomaly.timestamp).toLocaleString()}
                          </div>
                          {/* Show bar for visualization */}
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{width: `${Math.min(Math.abs(anomaly.zScore) / 5 * 100, 100)}%`}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3"/>
                      <h3 className="text-lg font-medium">No Anomalies Detected</h3>
                      <p className="text-muted-foreground mt-1">
                        All request latencies are within normal range.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4"/>
              <AlertTitle>Anomaly data unavailable</AlertTitle>
              <AlertDescription>
                Insufficient data to detect anomalies. Try selecting a longer time range.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PerformanceDashboard;
