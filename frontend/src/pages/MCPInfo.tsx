import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Server,
  Wrench,
  Database,
  Zap,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Code2,
  Layers,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import {
  getMcpInfo,
  listTools,
  getServerInfo,
  type InfoResponse,
  type ToolDefinition,
} from '@/lib/api';

export default function MCPInfo() {
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [infoRes, toolsRes] = await Promise.all([
        getMcpInfo(),
        listTools(),
      ]);
      setInfo(infoRes);
      setTools(toolsRes.tools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MCP info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mcpMethods = [
    {
      method: 'initialize',
      description: 'Initialize the MCP session and exchange capabilities',
      params: 'Protocol version, client capabilities, client info',
    },
    {
      method: 'tools/list',
      description: 'List all available tools that can be called',
      params: 'Optional cursor for pagination',
    },
    {
      method: 'tools/call',
      description: 'Invoke a specific tool with arguments',
      params: 'Tool name and input arguments',
    },
    {
      method: 'resources/list',
      description: 'List all available resources (read-only data sources)',
      params: 'Optional cursor for pagination',
    },
    {
      method: 'resources/read',
      description: 'Read the content of a specific resource',
      params: 'Resource URI',
    },
    {
      method: 'prompts/list',
      description: 'List all available prompt templates',
      params: 'Optional cursor for pagination',
    },
    {
      method: 'prompts/get',
      description: 'Get a specific prompt template with variable substitution',
      params: 'Prompt name and argument values',
    },
    {
      method: 'ping',
      description: 'Keep-alive / heartbeat check',
      params: 'None',
    },
  ];

  const codeExamples = {
    listTools: `curl -X POST http://localhost:3100/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}'`,
    callTool: `curl -X POST http://localhost:3100/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "echo",
    "arguments": {
      "message": "Hello MCP!"
    }
  }
}'`,
    initialize: `curl -X POST http://localhost:3100/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "my-client",
      "version": "1.0.0"
    }
  }
}'`,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <h2 className="text-3xl font-bold tracking-tight">Loading MCP Info...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h2 className="text-3xl font-bold tracking-tight">Error Loading Info</h2>
        </div>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">MCP Protocol Information</h2>
          <p className="text-muted-foreground">
            Model Context Protocol — Standardized interface for AI tools
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Server Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{info?.server.name}</div>
            <p className="text-xs text-muted-foreground">v{info?.server.version}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocol</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{info?.server.protocol}</div>
            <p className="text-xs text-muted-foreground">JSON-RPC 2.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{info?.providers.available.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Default: {info?.providers.default}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(info?.uptime || 0)}s</div>
            <p className="text-xs text-muted-foreground">{Math.floor((info?.uptime || 0) / 60)}m</p>
          </CardContent>
        </Card>
      </div>

      {/* Capabilities Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Server Capabilities</CardTitle>
          <CardDescription>Available MCP primitives and their current state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Tools */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Tools</h3>
                <Badge variant="outline">{info?.tools.total || 0} total</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {info?.tools.enabled || 0} enabled tools ready to be called by the AI.
              </p>
              <div className="space-y-1">
                {info?.tools.categories && Object.entries(info.tools.categories).map(([category, toolNames]) => (
                  <div key={category} className="text-xs">
                    <Badge variant="secondary" className="mr-2">{category}</Badge>
                    {toolNames.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline" className="mr-1">{t}</Badge>
                    ))}
                    {toolNames.length > 2 && (
                      <span className="text-muted-foreground">+{toolNames.length - 2} more</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">Resources</h3>
                <Badge variant="outline">{info?.resources || 0} available</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Read-only data sources that the AI can access for context.
              </p>
            </div>

            {/* Prompts */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold">Prompts</h3>
                <Badge variant="outline">{info?.prompts || 0} available</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Reusable prompt templates with variable substitution.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MCP Methods Reference */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Methods Reference</CardTitle>
          <CardDescription>Available JSON-RPC methods for interacting with the server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Method</th>
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-left p-2 font-medium">Parameters</th>
                </tr>
              </thead>
              <tbody>
                {mcpMethods.map((method) => (
                  <tr key={method.method} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <Badge variant="outline">{method.method}</Badge>
                    </td>
                    <td className="p-2 text-sm">{method.description}</td>
                    <td className="p-2 text-sm text-muted-foreground">{method.params}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>CURL examples for common MCP operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* List Tools Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">List Tools</h4>
              </div>
              <Button
                onClick={() => copyToClipboard(codeExamples.listTools)}
                variant="ghost"
                size="sm"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{codeExamples.listTools}</code>
            </pre>
          </div>

          {/* Call Tool Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <h4 className="font-medium">Call Tool</h4>
              </div>
              <Button
                onClick={() => copyToClipboard(codeExamples.callTool)}
                variant="ghost"
                size="sm"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{codeExamples.callTool}</code>
            </pre>
          </div>

          {/* Initialize Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <h4 className="font-medium">Initialize Session</h4>
              </div>
              <Button
                onClick={() => copyToClipboard(codeExamples.initialize)}
                variant="ghost"
                size="sm"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
              <code>{codeExamples.initialize}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* MCP Protocol Specification */}
      <Card>
        <CardHeader>
          <CardTitle>Protocol Specification</CardTitle>
          <CardDescription>Understanding the MCP protocol fundamentals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              The <strong>Model Context Protocol (MCP)</strong> is a standardized interface for
              connecting AI models to external tools, resources, and data sources. It uses{' '}
              <strong>JSON-RPC 2.0</strong> as its transport layer.
            </p>

            <h4>Core Primitives</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Tools:</strong> Functions the model can invoke (e.g., "search database", "read file")
              </li>
              <li>
                <strong>Resources:</strong> Read-only data sources the model can access
              </li>
              <li>
                <strong>Prompts:</strong> Reusable prompt templates with variable substitution
              </li>
            </ul>

            <h4>Transport Modes</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>stdio:</strong> Bidirectional pipe for CLI tools and local processes</li>
              <li><strong>HTTP+SSE:</strong> Server-Sent Events for real-time streaming</li>
            </ul>

            <h4>Request/Response Format</h4>
            <p>All MCP communication uses JSON-RPC 2.0 format:</p>
            <pre className="bg-muted p-3 rounded-md overflow-x-auto">
{`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Explore more features of the MCP server</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/mcp/tools">
                <Wrench className="h-4 w-4 mr-2" />
                Browse Tools
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/mcp/call">
                <Zap className="h-4 w-4 mr-2" />
                Call Tool
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/admin/tools">
                <Settings className="h-4 w-4 mr-2" />
                Admin Tools
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/simulate">
                <Activity className="h-4 w-4 mr-2" />
                Simulator
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* External Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>Learn more about MCP</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full justify-start" asChild>
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              MCP Specification (modelcontextprotocol.io)
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
