/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  TrendingUp,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {getHealth, type HealthResponse} from '@/lib/api';
import {formatBytes} from '@/lib/utils';
import JsonViewer from '@/components/ui/JsonViewer';

export function HealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'ok';
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Health Check</h2>
            <p className="text-muted-foreground">Check server health and uptime</p>
          </div>
        </div>

        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted rounded"/>
              <div className="h-4 w-64 bg-muted rounded"/>
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="h-12 bg-muted rounded"/>
                <div className="h-12 bg-muted rounded"/>
                <div className="h-12 bg-muted rounded"/>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Health Check</h2>
          <p className="text-muted-foreground">
            Check server health and uptime
          </p>
        </div>
        <Button onClick={fetchHealth} variant="outline" disabled={loading}>
          {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>}
          <Activity className="mr-2 h-4 w-4"/>
          Refresh
        </Button>
      </div>

      {/* Status Alert */}
      {!isHealthy ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4"/>
          <AlertTitle>Server is Unhealthy</AlertTitle>
          <AlertDescription>
            The server is experiencing issues. Please check the logs for more information.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600"/>
          <AlertTitle className="text-green-800">Server is Healthy</AlertTitle>
          <AlertDescription>
            All systems are operational and running normally.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Health Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle2 className="h-6 w-6 text-green-600"/>
            ) : (
              <XCircle className="h-6 w-6 text-red-600"/>
            )}
            Server Status
          </CardTitle>
          <CardDescription>
            Real-time health monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Server className="h-8 w-8 text-primary"/>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Current Status</div>
                  <div className="text-2xl font-bold capitalize">{health?.status || 'unknown'}</div>
                </div>
              </div>
              <Badge variant={isHealthy ? 'success' : 'error'} className="text-lg px-4 py-1">
                {health?.status || 'unknown'}
              </Badge>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="h-4 w-4"/>
                    Uptime
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {health?.uptime ? formatUptime(health.uptime) : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {health?.uptime ? (health.uptime).toFixed(1) + ' seconds' : '-'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1">
                    <Activity className="h-4 w-4"/>
                    Last Check
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {health?.timestamp ? formatTimestamp(health.timestamp) : '-'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4"/>
                    Health Score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isHealthy ? '100%' : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isHealthy ? 'All systems operational' : 'Issues detected'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1">
                    <HardDrive className="h-4 w-4"/>
                    Heap Used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {health?.memory ? formatBytes(health.memory.heapUsed) : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {health?.memory ? `${(health.memory.heapUsed / 1024 / 1024).toFixed(1)} MB` : '-'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1">
                    <HardDrive className="h-4 w-4"/>
                    Heap Total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {health?.memory ? formatBytes(health.memory.heapTotal) : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {health?.memory ? `${(health.memory.heapTotal / 1024 / 1024).toFixed(1)} MB` : '-'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Health Details */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="text-sm font-medium mb-3">Health Check Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endpoint:</span>
                  <span className="font-mono">GET /health</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time:</span>
                  <span className="font-mono">&lt; 100ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check Type:</span>
                  <span className="font-mono">Liveness Probe</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span className="font-mono">{health?.timestamp || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Health Checks</CardTitle>
          <CardDescription>
            Understanding server health monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The health check endpoint provides a basic liveness probe that verifies the server process is running
              and responsive. This endpoint is commonly used by load balancers, orchestrators, and monitoring
              systems to determine if the server is available to handle requests.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-medium mb-2">API Endpoint</h4>
              <code className="text-xs bg-background px-2 py-1 rounded">
                GET /health
              </code>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-medium mb-2">Response Format</h4>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                <JsonViewer value={{
                  status: isHealthy ? 'ok' : 'error',
                  timestamp: new Date().toISOString(),
                  uptime: health?.uptime || 0,
                }}/>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HealthCheck;
