import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Server,
  Wrench,
  Bot,
  Database,
  CheckCircle2,
  Activity,
  HardDrive,
  Clock,
  Package,
  Settings,
  TrendingUp,
  Terminal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getServerInfo, type InfoResponse } from '@/lib/api';

export function ServerInfo() {
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getServerInfo();
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Server Info</h2>
            <p className="text-muted-foreground">Server capabilities and configuration</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-8 w-16 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Server Info</h2>
          <p className="text-muted-foreground">
            Server capabilities and configuration
          </p>
        </div>
        <Button onClick={fetchInfo} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {info && (
        <>
          {/* Server Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Information
              </CardTitle>
              <CardDescription>
                Core server details and protocol version
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Server Name
                  </div>
                  <div className="font-semibold">{info.server.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Settings className="h-4 w-4" />
                    Version
                  </div>
                  <div className="font-semibold">{info.server.version}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Protocol
                  </div>
                  <div className="font-semibold">{info.server.protocol}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Uptime
                  </div>
                  <div className="font-semibold">{info.uptime.toFixed(1)} seconds</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    Total Tools
                  </div>
                  <div className="font-semibold">{info.tools.total}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    Enabled Tools
                  </div>
                  <div className="font-semibold">{info.tools.enabled}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Terminal className="h-4 w-4" />
                    Node.js
                  </div>
                  <div className="font-semibold">{info.server.node}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Settings className="h-4 w-4" />
                    Environment
                  </div>
                  <Badge variant={info.env === 'production' ? 'success' : 'default'}>{info.env}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Providers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                LLM Providers
              </CardTitle>
              <CardDescription>
                Configured language model providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Default Provider</div>
                      <div className="text-sm text-muted-foreground">{info.providers.default}</div>
                    </div>
                  </div>
                  <Badge variant="success">Default</Badge>
                </div>

                {info.providers.available.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Available Providers ({info.providers.available.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {info.providers.available.map((provider) => (
                        <Badge
                          key={provider}
                          variant={provider === info.providers.default ? 'default' : 'secondary'}
                        >
                          {provider}
                          {provider === info.providers.default && (
                            <span className="ml-1">★</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tool Categories */}
          {Object.keys(info.tools.categories).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Tool Categories
                </CardTitle>
                <CardDescription>
                  {Object.keys(info.tools.categories).length} categories available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(info.tools.categories).map(([category, tools]) => (
                    <div
                      key={category}
                      className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{category}</div>
                        <Badge variant="secondary">{tools.length}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {tools.length === 0
                          ? 'No tools'
                          : tools.length === 1
                          ? tools[0]
                          : tools.length === 2
                          ? `${tools[0]} & ${tools[1]}`
                          : `${tools.slice(0, 2).join(', ')} +${tools.length - 2} more`}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resources & Prompts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Resources
                </CardTitle>
                <CardDescription>
                  Available MCP resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{info.resources}</div>
                <div className="text-sm text-muted-foreground">registered resources</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Prompts
                </CardTitle>
                <CardDescription>
                  Available MCP prompts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{info.prompts}</div>
                <div className="text-sm text-muted-foreground">registered prompts</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default ServerInfo;