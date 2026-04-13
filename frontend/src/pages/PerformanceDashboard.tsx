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
  getErrorMetrics,
  getMetrics,
  getProviderMetrics,
  getSystemMetrics,
  getTokenMetrics,
  getToolMetrics,
  type MetricsResponse,
  type SystemMetricsResponse,
} from '@/lib/api';

// Simple bar chart component
const BarChart = ({
  data,
  maxBars = 10,
  color = 'bg-blue-500',
}: {
  data: { label: string; value: number }[];
  maxBars?: number;
  color?: string;
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
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
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple circular progress component
const CircularProgress = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'text-blue-500',
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
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

// Stat card component
const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) => {
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
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trendValue && (
          <div className="flex items-center mt-2 text-xs">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            ) : null}
            <span className={trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetricsResponse | null>(null);
  const [toolMetrics, setToolMetrics] = useState<any | null>(null);
  const [tokenMetrics, setTokenMetrics] = useState<any | null>(null);
  const [providerMetrics, setProviderMetrics] = useState<any | null>(null);
  const [errorMetrics, setErrorMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hours, setHours] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsData, systemData, toolData, tokenData, providerData, errorData] = await Promise.all([
        getMetrics(hours).catch((e) => ({ error: e.message })),
        getSystemMetrics().catch((e) => ({ error: e.message })),
        getToolMetrics().catch((e) => ({ error: e.message })),
        getTokenMetrics().catch((e) => ({ error: e.message })),
        getProviderMetrics().catch((e) => ({ error: e.message })),
        getErrorMetrics().catch((e) => ({ error: e.message })),
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
  }, [autoRefresh, hours]);

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
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 w-48 bg-muted rounded mb-4" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full bg-muted rounded" />
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
            <span className="text-sm text-muted-foreground">Time Range:</span>
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="text-sm rounded-md border bg-background px-2 py-1"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={formatNumber(metrics?.summary.requests.total || 0)}
          description="In selected period"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Avg Latency"
          value={`${metrics?.summary.requests.avgLatencyMs || 0}ms`}
          description="Average response time"
          icon={Clock}
          color="green"
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
        />
      </div>

      {/* Tabs for different metric views */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            <BarChart3 className="mr-2 h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Server className="mr-2 h-4 w-4" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <Flame className="mr-2 h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="system">
            <Cpu className="mr-2 h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertCircle className="mr-2 h-4 w-4" />
            Errors
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
                      .map(([label, value]) => ({ label, value }))}
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
                      .map(([label, value]) => ({ label, value }))}
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
                        <Network className="h-3 w-3" />
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
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  No errors recorded in this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PerformanceDashboard;
