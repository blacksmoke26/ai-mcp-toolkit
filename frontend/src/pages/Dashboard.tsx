import * as React from 'react';
import {useEffect, useState} from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  MessageSquare,
  Server,
  Wrench,
  XCircle,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {
  getHealth,
  getHealthReady,
  getServerInfo,
  type HealthReadyResponse,
  type HealthResponse,
  type InfoResponse,
} from '@/lib/api';
import {Link} from 'react-router-dom';

export function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [readiness, setReadiness] = useState<HealthReadyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthData, infoData, readinessData] = await Promise.all([
        getHealth().catch(() => null),
        getServerInfo().catch(() => null),
        getHealthReady().catch(() => null),
      ]);

      setHealth(healthData);
      setInfo(infoData);
      setReadiness(readinessData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    };
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isReady = readiness?.status === 'ready';
  const isServerHealthy = health?.status === 'ok';

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    status,
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    status?: 'success' | 'warning' | 'error';
  }) => {
    const statusColors = {
      success: 'text-green-600',
      warning: 'text-yellow-600',
      error: 'text-red-600',
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <Icon className={`h-5 w-5 ${statusColors[status || 'success']} opacity-60`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );
  };

  const StatusIndicator = ({ status }: { status: boolean }) => {
    if (status) {
      return (
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      );
    }
    return (
      <XCircle className="h-10 w-10 text-red-600" />
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Server status and quick overview</p>
          </div>
          <Button onClick={fetchData} variant="outline">
            <Activity className="mr-2 h-4 w-4" />
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

        <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            MCP Server status and quick overview
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Status Alerts */}
      {!isServerHealthy && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Server is unhealthy</AlertTitle>
          <AlertDescription>
            The server health check failed. Please check the server logs for more information.
          </AlertDescription>
        </Alert>
      )}

      {isServerHealthy && !isReady && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Server is degraded</AlertTitle>
          <AlertDescription>
            Some services may be unavailable. Check the readiness probe for details.
          </AlertDescription>
        </Alert>
      )}

      {isServerHealthy && isReady && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>All systems operational</AlertTitle>
          <AlertDescription>
            All services are running normally.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIndicator status={isServerHealthy} />
              Server Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={isServerHealthy ? 'success' : 'error'}>
                {health?.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uptime:</span>
              <span className="font-mono">{health?.uptime?.toFixed(1) || '0'}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Check:</span>
              <span className="font-mono">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '-'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIndicator status={isReady} />
              Readiness Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={isReady ? 'success' : 'error'}>
                {readiness?.status || 'Unknown'}
              </Badge>
            </div>
            {readiness?.checks && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Database:</span>
                  <Badge variant={readiness.checks.database.status === 'ok' ? 'success' : 'error'}>
                    {readiness.checks.database.status}
                  </Badge>
                </div>
                {Object.entries(readiness.checks)
                  .filter(([key]) => key.startsWith('provider:'))
                  .map(([key, check]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{key}:</span>
                      <Badge variant={check.status === 'ok' ? 'success' : 'error'}>
                        {check.status}
                      </Badge>
                    </div>
                  ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tools"
          value={info?.tools.total || 0}
          description="Registered MCP tools"
          icon={Wrench}
        />
        <StatCard
          title="Enabled Tools"
          value={info?.tools.enabled || 0}
          description="Active and available"
          icon={CheckCircle2}
        />
        <StatCard
          title="Providers"
          value={info?.providers.available.length || 0}
          description="LLM providers configured"
          icon={Server}
        />
        <StatCard
          title="Default Provider"
          value={info?.providers.default || '-'}
          description="Primary LLM provider"
          icon={Bot}
        />
      </div>

      {/* Server Info */}
      {info && (
        <Card>
          <CardHeader>
            <CardTitle>Server Information</CardTitle>
            <CardDescription>
              {info.server.name} v{info.server.version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Protocol</div>
                <div className="font-medium">{info.server.protocol}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Resources</div>
                <div className="font-medium">{info.resources}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Prompts</div>
                <div className="font-medium">{info.prompts}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tool Categories */}
      {info?.tools.categories && Object.keys(info.tools.categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tool Categories</CardTitle>
            <CardDescription>
              {Object.keys(info.tools.categories).length} categories available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(info.tools.categories).map(([category, tools]) => (
                <div
                  key={category}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{category}</div>
                    <Badge variant="secondary">{tools.length}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {tools.slice(0, 2).join(', ')}
                    {tools.length > 2 && ` +${tools.length - 2} more`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/chat">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Chat
              </Button>
            </Link>
            <Link to="/mcp/tools">
              <Button variant="outline" className="w-full justify-start">
                <Wrench className="mr-2 h-4 w-4" />
                Browse Tools
              </Button>
            </Link>
            <Link to="/admin/providers">
              <Button variant="outline" className="w-full justify-start">
                <Server className="mr-2 h-4 w-4" />
                Manage Providers
              </Button>
            </Link>
            <Link to="/chat/conversations">
              <Button variant="outline" className="w-full justify-start">
                <Database className="mr-2 h-4 w-4" />
                View Conversations
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
