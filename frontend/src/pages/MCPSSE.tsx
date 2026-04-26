import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  Server,
  Square,
  SquareActivity,
  Terminal,
} from 'lucide-react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {getMcpSSE, type JsonRpcRequest, type JsonRpcResponse, sendMcpRequest} from '@/lib/api';
import CodeEditor from '@/components/ui/CodeEditor';
import JsonViewer from '@/components/ui/JsonViewer';

export function MCPSSE() {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState<Array<{ type: string; data: string; timestamp: string }>>([]);
  const [requestBody, setRequestBody] = useState<string>(
    JSON.stringify(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      },
      null,
      2
    )
  );
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResponse, setSendResponse] = useState<JsonRpcResponse | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [connectionTime, setConnectionTime] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  const connectToSSE = () => {
    setConnecting(true);
    setEvents([]);
    setEventCount(0);
    setConnectionTime(null);

    try {
      const eventSource = getMcpSSE();
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionTime(Date.now());
        addEvent('system', 'Connected to SSE endpoint');
      };

      eventSource.onmessage = (event) => {
        setEventCount((prev) => prev + 1);
        addEvent('message', event.data);
      };

      /*eventSource.onendpoint = (event) => {
        addEvent('endpoint', `SSE endpoint: ${event.data}`);
      };*/

      eventSource.onerror = (error) => {
        setIsConnected(false);
        addEvent('error', 'Connection lost or error occurred');
        setSendError('SSE connection failed. Check console for details.');
        eventSource.close();
      };

      // Add keep-alive event handler
      eventSource.addEventListener('keepalive', () => {
        addEvent('ping', 'keepalive');
      });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to connect to SSE');
      setIsConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectFromSSE = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      setConnectionTime(null);
      addEvent('system', 'Disconnected from SSE endpoint');
    }
  };

  const addEvent = (type: string, data: string) => {
    const timestamp = new Date().toISOString();
    setEvents((prev) => [
      ...prev,
      {
        type,
        data: data.length > 500 ? `${data.substring(0, 500)}...` : data,
        timestamp,
      },
    ]);

    if (autoScroll) {
      setTimeout(() => {
        eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSendRequest = async () => {
    if (!isConnected) {
      setSendError('Not connected to SSE endpoint. Connect first.');
      return;
    }

    try {
      setSendLoading(true);
      setSendError(null);
      setSendResponse(null);

      let rpcRequest: JsonRpcRequest;
      try {
        rpcRequest = JSON.parse(requestBody);
      } catch (err) {
        throw new Error('Invalid JSON in request body');
      }

      const response = await sendMcpRequest(rpcRequest);
      setSendResponse(response);
      addEvent('request', `Sent: ${JSON.stringify(rpcRequest)}`);
      addEvent('response', `Response: ${JSON.stringify(response)}`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send request');
      addEvent('error', err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSendLoading(false);
    }
  };

  const clearEvents = () => {
    setEvents([]);
    setEventCount(0);
    setSendResponse(null);
    setSendError(null);
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatDuration = (startTime: number | null) => {
    if (!startTime) return '-';
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <SquareActivity className="h-4 w-4 text-blue-500" />;
      case 'system':
        return <Server className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'request':
        return <ArrowUp className="h-4 w-4 text-purple-500" />;
      case 'response':
        return <ArrowDown className="h-4 w-4 text-teal-500" />;
      case 'ping':
        return <Activity className="h-4 w-4 text-gray-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      keepAliveInterval.current = setInterval(() => {
        // Check if connection is still alive
        if (!eventSourceRef.current?.readyState || eventSourceRef.current.readyState !== EventSource.OPEN) {
          setIsConnected(false);
          addEvent('system', 'Connection lost');
          if (keepAliveInterval.current) {
            clearInterval(keepAliveInterval.current);
          }
        }
      }, 30000);
    }

    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    };
  }, [isConnected]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">MCP SSE Stream</h2>
          <p className="text-muted-foreground">
            Server-Sent Events endpoint for MCP streaming
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button onClick={connectToSSE} disabled={connecting}>
              {connecting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Connect SSE
                </>
              )}
            </Button>
          ) : (
            <Button onClick={disconnectFromSSE} variant="destructive">
              <Square className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div className="flex-1">
                <div className="text-lg font-bold capitalize">{isConnected ? 'Connected' : 'Disconnected'}</div>
                <div className="text-xs text-muted-foreground">
                  {isConnected ? 'SSE stream active' : 'No active connection'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="text-lg font-bold">{formatDuration(connectionTime)}</div>
                <div className="text-xs text-muted-foreground">active connection</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="text-lg font-bold">{eventCount}</div>
                <div className="text-xs text-muted-foreground">total events</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Log Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Terminal className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="text-lg font-bold">{events.length}</div>
                <div className="text-xs text-muted-foreground">logged events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {!isConnected && !connecting && (
        <Alert>
          <Activity className="h-4 w-4" />
          <AlertTitle>Not Connected</AlertTitle>
          <AlertDescription>
            Click "Connect SSE" to establish a Server-Sent Events connection to the MCP endpoint.
          </AlertDescription>
        </Alert>
      )}

      {isConnected && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>SSE Connection Active</AlertTitle>
          <AlertDescription>
            Connected to /mcp/sse endpoint. Events will appear in the log below.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* SSE Request Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send JSON-RPC Request
              </CardTitle>
              <CardDescription>
                Send requests through the SSE connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label htmlFor="request-body" className="text-sm font-medium mb-2 block">
                    Request Body
                  </label>
                  <CodeEditor language="json" onChange={setRequestBody} value={requestBody}
                  editorProps={{placeholder:'{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'}}/>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Button
                    onClick={clearEvents}
                    variant="ghost"
                    size="sm"
                    disabled={events.length === 0}
                  >
                    Clear Logs
                  </Button>
                  <Button onClick={handleSendRequest} disabled={sendLoading || !isConnected}>
                    {sendLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Request
                      </>
                    )}
                  </Button>
                </div>

                {sendError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{sendError}</AlertDescription>
                  </Alert>
                )}

                {sendResponse && (
                  <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Response</h4>
                      <Badge variant="secondary">JSON-RPC</Badge>
                    </div>
                    <pre className="text-xs bg-background p-2 rounded overflow-x-auto max-h-[200px] overflow-y-auto">
                      <JsonViewer value={sendResponse}/>
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Request Templates */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Quick Requests</CardTitle>
              <CardDescription>
                Common JSON-RPC requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() =>
                    setRequestBody(
                      JSON.stringify(
                        {
                          jsonrpc: '2.0',
                          id: 1,
                          method: 'tools/list',
                        },
                        null,
                        2
                      )
                    )
                  }
                >
                  tools/list
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() =>
                    setRequestBody(
                      JSON.stringify(
                        {
                          jsonrpc: '2.0',
                          id: 2,
                          method: 'resources/list',
                        },
                        null,
                        2
                      )
                    )
                  }
                >
                  resources/list
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() =>
                    setRequestBody(
                      JSON.stringify(
                        {
                          jsonrpc: '2.0',
                          id: 3,
                          method: 'prompts/list',
                        },
                        null,
                        2
                      )
                    )
                  }
                >
                  prompts/list
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SSE Events Log */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    SSE Events Log
                  </CardTitle>
                  <CardDescription>
                    Real-time event stream from /mcp/sse
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    {autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-2 rounded-lg border bg-muted/30 p-4 min-h-0">
                {events.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Terminal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No events yet</p>
                      <p className="text-xs mt-1">
                        {isConnected
                          ? 'Waiting for events from SSE stream...'
                          : 'Connect to SSE to start receiving events'}
                      </p>
                    </div>
                  </div>
                ) : (
                  events.map((event, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm"
                    >
                      <div className="flex-shrink-0 mt-0.5">{getEventIcon(event.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {event.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm break-all">
                          {event.type === 'request' || event.type === 'response' ? (
                            <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                              {event.data}
                            </pre>
                          ) : (
                            <div className="font-mono text-xs">{event.data}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={eventsEndRef} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SSE Info */}
      <Card>
        <CardHeader>
          <CardTitle>About SSE</CardTitle>
          <CardDescription>
            Server-Sent Events protocol information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What is SSE?</h4>
              <p className="text-sm text-muted-foreground">
                Server-Sent Events (SSE) provides a standard way for servers to push real-time updates
                to clients over HTTP. Unlike WebSockets, SSE is unidirectional (server to client) but
                offers automatic reconnection and simpler implementation.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">MCP SSE Endpoint</h4>
              <div className="rounded-lg border bg-muted/30 p-3">
                <code className="text-xs">GET /mcp/sse</code>
                <p className="text-xs text-muted-foreground mt-1">
                  Establishes a long-lived connection for receiving MCP events and notifications
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Supported Events</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="font-mono text-xs">endpoint</span>
                  <span>— Initial connection event</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="font-mono text-xs">message</span>
                  <span>— Incoming messages</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="font-mono text-xs">keepalive</span>
                  <span>— Connection keep-alive</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Use Cases</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  <span>Real-time tool execution results</span>
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  <span>Progress notifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <Server className="h-3 w-3" />
                  <span>Server-initiated events</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function XCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export default MCPSSE;
