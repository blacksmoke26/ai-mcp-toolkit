import * as React from 'react';
import {useEffect, useState} from 'react';
import {Activity, AlertCircle, Bot, CheckCircle2, Clock, Database, RefreshCw, Server, XCircle} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {getHealthReady, type HealthCheck, type HealthReadyResponse} from '@/lib/api';

export function ReadinessCheck() {
  const [readiness, setReadiness] = useState<HealthReadyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHealthReady();
      setReadiness(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch readiness status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  const getStatusBadge = (status: 'ok' | 'error' | 'ready' | 'degraded') => {
    switch (status) {
      case 'ok':
      case 'ready':
        return <Badge variant="success">OK</Badge>;
      case 'error':
      case 'degraded':
        return <Badge variant="error">ERROR</Badge>;
      default:
        return <Badge variant="secondary">UNKNOWN</Badge>;
    }
  };

  const getStatusIcon = (status: 'ok' | 'error') => {
    return status === 'ok' ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const formatLatency = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    if (ms < 100) return `${ms}ms`;
    if (ms < 500) return `${ms}ms`;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Readiness Probe</h2>
            <p className="text-muted-foreground">Detailed readiness checks for all services</p>
          </div>
        </div>

        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-6 w-48 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 w-full bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isReady = readiness?.status === 'ready';
  const allChecks = (readiness?.checks || {}) as HealthCheck;
  const checkEntries = Object.entries(allChecks);
  const failedChecks = checkEntries.filter(([, check]) => check.status === 'error');
  const passedChecks = checkEntries.filter(([, check]) => check.status === 'ok');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Readiness Probe</h2>
          <p className="text-muted-foreground">
            Detailed readiness checks for all services
          </p>
        </div>
        <Button onClick={fetchReadiness} variant="outline" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status Alert */}
      {!isReady && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Service Not Ready</AlertTitle>
          <AlertDescription>
            {failedChecks.length} check(s) failed. The service is not ready to accept traffic.
          </AlertDescription>
        </Alert>
      )}

      {isReady && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Service Ready</AlertTitle>
          <AlertDescription>
            All systems operational. The service is ready to accept traffic.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to fetch readiness status</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {readiness && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {getStatusIcon(isReady ? 'ok' : 'error')}
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{readiness.status}</div>
                    <div className="text-xs text-muted-foreground">
                      {passedChecks.length} passed, {failedChecks.length} failed
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{checkEntries.length}</div>
                    <div className="text-xs text-muted-foreground">health checks</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <div className="text-2xl font-bold">
                      {(() => {
                        const latencies = checkEntries
                          .map(([, check]) => check.latencyMs)
                          .filter((ms): ms is number => ms !== undefined);
                        if (latencies.length === 0) return 'N/A';
                        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                        return formatLatency(avg);
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">across all checks</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Last Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <div className="text-lg font-bold">
                      {readiness.timestamp
                        ? new Date(readiness.timestamp).toLocaleTimeString()
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {readiness.timestamp
                        ? new Date(readiness.timestamp).toLocaleDateString()
                        : ''}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Checks */}
          <Card>
            <CardHeader>
              <CardTitle>Health Check Details</CardTitle>
              <CardDescription>
                Individual component health status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Database Check */}
                {checkEntries.find(([key]) => key === 'database') && (
                  <CheckItem
                    key="database"
                    icon={Database}
                    title="Database"
                    check={checkEntries?.find?.(([key]) => key === 'database')?.[1]}
                  />
                )}

                {/* Provider Checks */}
                {checkEntries
                  .filter(([key]) => key.startsWith('provider:'))
                  .map(([key, check]) => {
                    const providerName = key.replace('provider:', '');
                    return (
                      <CheckItem
                        key={key}
                        icon={Bot}
                        title={`Provider: ${providerName}`}
                        check={check}
                      />
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Check Details by Category */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Status
                </CardTitle>
                <CardDescription>
                  Database connectivity check
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const dbCheck = allChecks.database;
                  if (!dbCheck) return <div className="text-muted-foreground">No database configured</div>;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(dbCheck.status)}
                          {getStatusBadge(dbCheck.status)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Latency</span>
                        <span className="font-mono">{formatLatency(dbCheck.latencyMs)}</span>
                      </div>
                      {dbCheck.error && (
                        <div className="rounded bg-red-50 p-3 text-sm text-red-800">
                          {dbCheck.error}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Provider Statuses
                </CardTitle>
                <CardDescription>
                  LLM provider connectivity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const providerChecks = checkEntries.filter(([key]) => key.startsWith('provider:'));
                  if (providerChecks.length === 0) {
                    return <div className="text-muted-foreground">No providers configured</div>;
                  }

                  return (
                    <div className="space-y-2">
                      {providerChecks.map(([key, check]) => {
                        const providerName = key.replace('provider:', '');
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{providerName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {formatLatency(check.latencyMs)}
                              </span>
                              {getStatusBadge(check.status)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface CheckItemProps {
  icon: React.ElementType;
  title: string;
  check: HealthCheck;
}

function CheckItem({ icon: Icon, title, check }: CheckItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium">{title}</div>
          {check.latencyMs !== undefined && (
            <div className="text-xs text-muted-foreground">
              Latency: {check.latencyMs}ms
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {check.error && (
          <span className="text-xs text-red-600">{check.error}</span>
        )}
        {check.status === 'ok' ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </div>
    </div>
  );
}

export default ReadinessCheck;
