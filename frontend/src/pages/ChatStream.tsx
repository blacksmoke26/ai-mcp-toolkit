import * as React from "react";
import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Send,
  StopCircle,
  Bot,
  User,
  Loader2,
  Settings,
  AlertCircle,
  Activity,
  Clock,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { listProviders, type Provider } from "@/lib/api";

interface StreamMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  toolName?: string;
  isStreaming?: boolean;
  timestamp: Date;
}

interface StreamState {
  isStreaming: boolean;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export function ChatStream() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    provider: "",
    model: "",
    temperature: 0.7,
    maxTokens: 4096,
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const [streamStats, setStreamStats] = useState({
    iterations: 0,
    toolCalls: 0,
    tokens: { input: 0, output: 0, total: 0 },
  });

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchProviders = async () => {
    try {
      const response = await listProviders();
      setProviders(response.providers || []);
      if (response.providers?.length > 0) {
        const defaultProvider = response.providers.find((p) => p.isDefault) || response.providers[0];
        setStreamState((prev) => ({
          ...prev,
          provider: defaultProvider?.name || "",
          model: defaultProvider?.config?.defaultModel || "",
        }));
      }
    } catch (err) {
      console.error("Failed to fetch providers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnectionStatus("disconnected");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || streamState.isStreaming) return;

    const userMessage: StreamMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setStreamState((prev) => ({ ...prev, isStreaming: true }));
    setConnectionStatus("connecting");
    setError(null);
    setStreamStats({ iterations: 0, toolCalls: 0, tokens: { input: 0, output: 0, total: 0 } });

    // Create assistant message placeholder for streaming
    const assistantMessageIndex = messages.length;
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        isStreaming: true,
        timestamp: new Date(),
      },
    ]);

    try {
      // Send message to stream endpoint
      const response = await fetch("/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          provider: streamState.provider,
          model: streamState.model,
          temperature: streamState.temperature,
          maxTokens: streamState.maxTokens,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      setConnectionStatus("connected");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Parse SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("event:")) {
            const eventType = line.replace("event:", "").trim();
            const dataLine = lines.find((l) => l.startsWith("data:"));

            if (eventType === "tool_call" && dataLine) {
              try {
                const data = JSON.parse(dataLine.replace("data:", "").trim());
                setStreamStats((prev) => ({
                  ...prev,
                  iterations: data.iteration || prev.iterations,
                  toolCalls: data.tools?.length || prev.toolCalls,
                }));

                // Add tool call messages
                if (data.tools && data.tools.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[assistantMessageIndex] = {
                      ...updated[assistantMessageIndex],
                      content: updated[assistantMessageIndex].content + `\n[Calling tools...]`,
                    };
                    return updated;
                  });
                }
              } catch (e) {
                console.error("Failed to parse tool_call event:", e);
              }
            } else if (eventType === "result" && dataLine) {
              try {
                const data = JSON.parse(dataLine.replace("data:", "").trim());
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMessageIndex] = {
                    ...updated[assistantMessageIndex],
                    content: data.content || updated[assistantMessageIndex].content,
                    isStreaming: false,
                  };
                  return updated;
                });

                setStreamStats((prev) => ({
                  ...prev,
                  iterations: data.iterations || prev.iterations,
                  toolCalls: data.toolCalls || prev.toolCalls,
                  tokens: data.tokens || prev.tokens,
                }));
              } catch (e) {
                console.error("Failed to parse result event:", e);
              }
            } else if (eventType === "error" && dataLine) {
              try {
                const data = JSON.parse(dataLine.replace("data:", "").trim());
                setError(data.error || "An error occurred during streaming");
              } catch (e) {
                console.error("Failed to parse error event:", e);
              }
            }
          }
        }
      }

      // Finalize streaming
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[assistantMessageIndex]) {
          updated[assistantMessageIndex].isStreaming = false;
        }
        return updated;
      });

      setStreamState((prev) => ({ ...prev, isStreaming: false }));
      setConnectionStatus("connected");

      // Close the reader
      reader.releaseLock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stream response");
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[assistantMessageIndex]) {
          updated[assistantMessageIndex].content = "Error: Failed to stream response.";
          updated[assistantMessageIndex].isStreaming = false;
        }
        return updated;
      });
      setStreamState((prev) => ({ ...prev, isStreaming: false }));
      setConnectionStatus("disconnected");
    }
  };

  const handleStopStream = () => {
    closeEventSource();
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage?.isStreaming) {
        lastMessage.isStreaming = false;
        lastMessage.content += "\n[Stream stopped by user]";
      }
      return updated;
    });
    setStreamState((prev) => ({ ...prev, isStreaming: false }));
    setConnectionStatus("disconnected");
  };

  const handleClearMessages = () => {
    setMessages([]);
    setStreamStats({ iterations: 0, toolCalls: 0, tokens: { input: 0, output: 0, total: 0 } });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTokenUsage = (tokens: { input: number; output: number; total: number }) => {
    return `${tokens.total.toLocaleString()} (${tokens.input.toLocaleString()} in, ${tokens.output.toLocaleString()} out)`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Stream Chat</h2>
            <p className="text-muted-foreground">Stream chat responses via SSE</p>
          </div>
        </div>

        <Card className="animate-pulse h-[600px]">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stream Chat</h2>
          <p className="text-muted-foreground">Stream chat responses via Server-Sent Events</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === "connected" ? "success" : connectionStatus === "connecting" ? "info" : "secondary"}>
            <Activity className="mr-1 h-3 w-3" />
            {connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Stream Settings
          </CardTitle>
          <CardDescription>Configure streaming options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <select
                value={streamState.provider}
                onChange={(e) => setStreamState((prev) => ({ ...prev, provider: e.target.value }))}
                disabled={streamState.isStreaming}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none"
              >
                {providers.map((provider) => (
                  <option key={provider.name} value={provider.name}>
                    {provider.name} {provider.isDefault && "(default)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <input
                type="text"
                value={streamState.model}
                disabled={streamState.isStreaming}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Model name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temperature: {streamState.temperature}</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={streamState.temperature}
                onChange={(e) => setStreamState((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                disabled={streamState.isStreaming}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Tokens</label>
              <input
                type="number"
                value={streamState.maxTokens}
                onChange={(e) => setStreamState((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                disabled={streamState.isStreaming}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                min="1"
                max="32000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages Display */}
      <Card className="min-h-[500px] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation
              </CardTitle>
              <CardDescription>
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {streamState.isStreaming && (
                <Button onClick={handleStopStream} variant="destructive" size="sm">
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Stream
                </Button>
              )}
              <Button onClick={handleClearMessages} variant="ghost" size="sm" disabled={messages.length === 0}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bot className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground max-w-md">
                Type a message below and press Enter or click Send to stream responses from the LLM in real-time
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : msg.role === "assistant"
                        ? "bg-green-600 text-white"
                        : msg.role === "tool"
                          ? "bg-purple-600 text-white"
                          : "bg-gray-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : msg.role === "assistant" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium capitalize">
                      {msg.role === "assistant" ? "Assistant" : msg.role === "user" ? "You" : msg.role}
                    </span>
                    {msg.toolName && (
                      <Badge variant="secondary" className="text-xs">
                        {msg.toolName}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                    {msg.isStreaming && <span className="inline-block h-4-2 ml-1 animate-pulse bg-current" />}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Stats */}
      {(streamStats.iterations > 0 || streamStats.toolCalls > 0 || streamStats.tokens.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stream Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-4">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Iterations:</span>
                <span className="font-medium">{streamStats.iterations}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tool Calls:</span>
                <span className="font-medium">{streamStats.toolCalls}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tokens:</span>
                <span className="font-medium">{formatTokenUsage(streamStats.tokens)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={streamState.isStreaming ? "info" : "success"}>{streamState.isStreaming ? "Streaming" : "Complete"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Area */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={streamState.isStreaming}
              rows={2}
              className="flex-1 resize-none"
            />
            <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || streamState.isStreaming} size="lg">
              {streamState.isStreaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Streaming...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>Provider: {streamState.provider || "Not configured"}</span>
          </div>
        </CardContent>
      </Card>

      {/* SSE Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            About SSE Streaming
          </CardTitle>
          <CardDescription>Server-Sent Events for real-time streaming</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This page uses Server-Sent Events (SSE) to stream responses from the backend in real-time. SSE provides a lightweight,
              persistent connection for receiving continuous updates from the server.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <h4 className="font-medium mb-1">tool_call event</h4>
                <p className="text-xs text-muted-foreground">Sent when tools are invoked during the agent loop</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <h4 className="font-medium mb-1">result event</h4>
                <p className="text-xs text-muted-foreground">Final response with content and token statistics</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <h4 className="font-medium mb-1">error event</h4>
                <p className="text-xs text-muted-foreground">Error notifications during streaming</p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <h4 className="font-medium mb-2">Endpoint</h4>
              <code className="text-xs bg-background px-2 py-1 rounded">POST /chat/stream</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChatStream;
