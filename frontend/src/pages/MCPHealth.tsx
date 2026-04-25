/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/MCPHealth
 * @description MCP Health Check page with debug echo functionality.
 *
 * Provides real-time monitoring of the MCP server health status
 * and a debug echo endpoint for testing MCP request/response structures.
 */

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  RefreshCw,
  Send,
  Copy,
  Check,
  TestTube2,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Textarea} from '@/components/ui/Textarea';
import {Input} from '@/components/ui/Input';
import {getMcpHealth, debugEcho, type McpHealthResponse} from '@/lib/api';
import JsonViewer from '@/components/ui/JsonViewer.tsx';
import CodeEditor from '@/components/ui/CodeEditor.tsx';

interface DebugEchoResult {
  jsonrpc: string;
  result: {
    echoed: Record<string, unknown>;
    meta: {
      receivedAt: string;
      clientIp: string;
    };
  };
  id: string;
}

export function MCPHealth() {
  const [mcpHealth, setMcpHealth] = useState<McpHealthResponse | null>(null);
  const [appHealth, setAppHealth] = useState<null | { status: string; timestamp: string }>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug Echo state
  const [debugPayload, setDebugPayload] = useState<string>(
    JSON.stringify(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
        params: {},
      },
      null,
      2
    )
  );
  const [debugResult, setDebugResult] = useState<DebugEchoResult | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mcpHealthData, appHealthData] = await Promise.allSettled([
        getMcpHealth(),
        (async () => {
          const res = await fetch('/mcp/health');
          return res.json();
        })(),
      ]);

      if (mcpHealthData.status === 'fulfilled') {
        setMcpHealth(mcpHealthData.value);
      }

      if (appHealthData.status === 'fulfilled' && appHealthData.value) {
        setAppHealth(appHealthData.value);
      } else if (mcpHealthData.status === 'rejected') {
        setError('Failed to fetch MCP health');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const handleDebugEcho = async () => {
    try {
      setDebugLoading(true);
      setDebugError(null);
      setDebugResult(null);

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(debugPayload);
      } catch {
        throw new Error('Invalid JSON in payload');
      }

      const result = await debugEcho(payload);
      setDebugResult(result);
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : 'Debug echo failed');
    } finally {
      setDebugLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHealthy = mcpHealth?.status === 'ok';
  const timestamp = mcpHealth?.timestamp || appHealth?.timestamp;

  const formatDuration = (isoString: string | undefined) => {
    if (!isoString) return '-';
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const secs = Math.floor(diffMs / 1000);
    const mins = Math.floor(secs / 60);
    const hrs = Math.floor(mins / 60);

    if (hrs > 0) return `${hrs}h ${mins % 60}m ago`;
    if (mins > 0) return `${mins}m ${secs % 60}s ago`;
    return `${secs}s ago`;
  };

  const codeExamples = {
    health: `curl -X GET http://localhost:3100/mcp/health`,
    debugEcho: `curl -X POST http://localhost:3100/mcp/debug/echo \\
  -H "Content-Type: application/json" \\
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "ping",
  "params": {}
}'`,
    batchRequest: `curl -X POST http://localhost:3100/mcp \\
  -H "Content-Type: application/json" \\
  -d '[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "ping"
  }
]'`,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <h2 className="text-3xl font-bold tracking-tight">Loading MCP Health...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">MCP Health & Debug</h2>
          <p className="text-muted-foreground">
            Monitor MCP server health and test endpoints
          </p>
        </div>
        <Button onClick={fetchHealth} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* MCP Health Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-500" />
              MCP Server Health
            </CardTitle>
            <CardDescription>Status of the MCP protocol endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  {isHealthy ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Current Status
                    </div>
                    <div className="text-2xl font-bold capitalize">{mcpHealth?.status || 'unknown'}</div>
                  </div>
                </div>
                <Badge variant={isHealthy ? 'success' : 'error'} className="text-lg px-4 py-1">
                  {mcpHealth?.status || 'unknown'}
                </Badge>
              </div>

              {timestamp && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last check:</span>
                    <span className="font-mono">{formatDuration(timestamp)}</span>
                  </div>
                </div>
              )}

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-medium mb-1">Endpoint</div>
                <code className="text-xs bg-background px-2 py-1 rounded">
                  GET /mcp/health
                </code>
              </div>

              {mcpHealth?.timestamp && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs font-medium mb-1">Timestamp</div>
                  <code className="text-xs bg-background px-2 py-1 rounded overflow-x-auto block">
                    {mcpHealth.timestamp}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Echo Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-purple-500" />
              Debug Echo
            </CardTitle>
            <CardDescription>Test MCP endpoints with custom payloads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Request Payload</label>
                <CodeEditor value={debugPayload} heightClass="h-[150px]" onChange={setDebugPayload} />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDebugEcho}
                  disabled={debugLoading}
                  className="flex-1"
                >
                  {debugLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(codeExamples.debugEcho)}
                  title="Copy example CURL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              {debugError && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{debugError}</AlertDescription>
                </Alert>
              )}

              {debugResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Response</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(debugResult, null, 2))}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <JsonViewer value={debugResult} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoint Reference</CardTitle>
          <CardDescription>Common MCP endpoint examples</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <h4 className="font-medium">Health Check</h4>
              </div>
              <Button
                onClick={() => copyToClipboard(codeExamples.health)}
                variant="ghost"
                size="sm"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
              <code>{codeExamples.health}</code>
            </pre>
          </div>

          {/* Debug Echo Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TestTube2 className="h-4 w-4 text-purple-500" />
                <h4 className="font-medium">Debug Echo</h4>
              </div>
              <Button
                onClick={() => copyToClipboard(codeExamples.debugEcho)}
                variant="ghost"
                size="sm"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
              <code>{codeExamples.debugEcho}</code>
            </pre>
          </div>

          {/* Batch Request Endpoint */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">Batch Request</h4>
              </div>
              <Button
                onClick={() => copyToClipboard(codeExamples.batchRequest)}
                variant="ghost"
                size="sm"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs">
              <code>{codeExamples.batchRequest}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <Alert>
        <AlertTitle>About MCP Health</AlertTitle>
        <AlertDescription>
          The MCP health endpoint checks the availability of the JSON-RPC 2.0 server.
          The debug echo endpoint allows you to test request/response formatting before
          implementing full MCP clients.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default MCPHealth;
