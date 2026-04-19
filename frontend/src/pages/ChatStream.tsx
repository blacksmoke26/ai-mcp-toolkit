/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useState, useRef} from 'react';
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
  Brain,
  X,
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Textarea} from '@/components/ui/Textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {listProviders, listProviderModels, type Provider, type Model} from '@/lib/api';

interface StreamMessage {
  /** The role of the message sender. */
  role: 'user' | 'assistant' | 'tool' | 'system';
  /** The text content of the message. */
  content: string;
  /** The name of the tool used, if applicable. */
  toolName?: string;
  /** Indicates if the message content is currently being streamed. */
  isStreaming?: boolean;
  /** The time the message was created or received. */
  timestamp: Date;
}

interface StreamState {
  /** Indicates whether a stream is currently active. */
  isStreaming: boolean;
  /** The name of the LLM provider selected. */
  provider: string;
  /** The specific model name being used. */
  model: string;
  /** The temperature setting for generation randomness. */
  temperature: number;
  /** The maximum number of tokens to generate. */
  maxTokens: number;
}

interface ProviderModels {
  /** The list of available models for the provider. */
  models: Model[];
  /** Indicates whether the models are currently being loaded. */
  loading: boolean;
}

/**
 * ChatStream Component
 *
 * A React component that provides a real-time chat interface using Server-Sent Events (SSE).
 * It manages the streaming of messages from an LLM, handles tool calls, and displays
 * connection statistics.
 */
const ChatStream = () => {
  /** State storing the history of messages in the chat. */
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  /** State storing the current text input in the message box. */
  const [inputMessage, setInputMessage] = useState('');
  /** State storing the current configuration and status of the stream. */
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    provider: '',
    model: '',
    temperature: 0.7,
    maxTokens: 4096,
  });
  /** State storing the list of available LLM providers. */
  const [providers, setProviders] = useState<Provider[]>([]);
  /** State storing the available models for each provider, keyed by provider name. */
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModels>>({});
  /** State indicating if the component is in the initial loading state. */
  const [loading, setLoading] = useState(true);
  /** State storing any error message encountered during operation. */
  const [error, setError] = useState<string | null>(null);
  /** State storing the current connection status to the stream endpoint. */
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  /** State storing statistics about the current or last stream session. */
  const [streamStats, setStreamStats] = useState({
    iterations: 0,
    toolCalls: 0,
    tokens: {input: 0, output: 0, total: 0},
  });
  /** State indicating whether the chat view should auto-scroll to the bottom on new messages. */
  const [autoScroll, setAutoScroll] = useState(true);

  /** Ref to the bottom of the message list for auto-scrolling. */
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  /** Ref to the textarea element for input handling. */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** Ref to the EventSource connection for managing the SSE lifecycle. */
  const eventSourceRef = useRef<EventSource | null>(null);

  /** Scrolls the chat view to the bottom if auto-scroll is enabled. */
  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  };

  /** Effect hook to trigger scrolling whenever messages or auto-scroll preference changes. */
  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, autoScroll]);

  /** Fetches the list of available providers from the API. */
  const fetchProviders = async () => {
    try {
      const response = await listProviders();
      setProviders(response.active || []);
      if (response.active?.length > 0) {
        const defaultProvider = response.active.find((p) => p.name === response.default) || response.active[0];
        setStreamState((prev) => ({
          ...prev,
          provider: defaultProvider?.name || '',
          model: defaultProvider?.defaultModel || '',
        }));

        // Load models for the default provider
        if (defaultProvider?.name) {
          await loadProviderModels(defaultProvider.name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setError('Failed to load providers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  /** Effect hook to fetch providers on component mount. */
  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Loads the list of models for a specific provider. */
  const loadProviderModels = async (providerName: string) => {
    setProviderModels((prev) => ({
      ...prev,
      [providerName]: {models: [], loading: true},
    }));
    try {
      const response = await listProviderModels(providerName);
      setProviderModels((prev) => ({
        ...prev,
        [providerName]: {models: response.models || [], loading: false},
      }));

      if (response.models?.length > 0 && !streamState.model) {
        setStreamState((prev) => ({
          ...prev,
          model: response.models[0].id || response.models[0].name || '',
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch models for ${providerName}:`, err);
      setProviderModels((prev) => ({
        ...prev,
        [providerName]: {models: [], loading: false},
      }));
    }
  };

  /** Handles changes to the selected provider dropdown. */
  const handleProviderChange = (value: string) => {
    setStreamState((prev) => ({...prev, provider: value}));
    if (!providerModels[value]) {
      loadProviderModels(value);
      setStreamState((prev) => ({...prev, model: ''}));
    } else {
      const models = providerModels[value].models;
      if (models.length > 0) {
        setStreamState((prev) => ({
          ...prev,
          model: models[0].id || models[0].name || '',
        }));
      }
    }
  };

  /** Closes the active EventSource connection and updates status. */
  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnectionStatus('disconnected');
    }
  };

  /** Initiates the message sending process and handles the streaming response. */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || streamState.isStreaming) return;

    const userMessage: StreamMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setStreamState((prev) => ({...prev, isStreaming: true}));
    setConnectionStatus('connecting');
    setError(null);
    setStreamStats({iterations: 0, toolCalls: 0, tokens: {input: 0, output: 0, total: 0}});

    // Create assistant message placeholder for streaming
    const assistantMessageIndex = messages.length;
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      },
    ]);

    try {
      // Send message to stream endpoint
      const response = await fetch('/chat/stream', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
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
      let buffer = '';

      setConnectionStatus('connected');

      while (true) {
        const {done, value} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        buffer += chunk;

        // Parse SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const eventType = line.replace('event:', '').trim();
            const dataLine = lines.find((l) => l.startsWith('data:'));

            if (eventType === 'tool_call' && dataLine) {
              try {
                const data = JSON.parse(dataLine.replace('data:', '').trim());
                setStreamStats((prev) => ({
                  ...prev,
                  iterations: data.iteration || prev.iterations,
                  toolCalls: data.tools?.length || prev.toolCalls,
                }));

                // Update message to show tool call
                if (data.tools && data.tools.length > 0) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    if (updated[assistantMessageIndex]) {
                      if (!updated[assistantMessageIndex].content.includes('[Calling tools...]')) {
                        updated[assistantMessageIndex] = {
                          ...updated[assistantMessageIndex],
                          content: updated[assistantMessageIndex].content + `\n🔧 Calling tools...`,
                        };
                      }
                    }
                    return updated;
                  });
                }
              } catch (e) {
                console.error('Failed to parse tool_call event:', e);
              }
            } else if (eventType === 'result' && dataLine) {
              try {
                const data = JSON.parse(dataLine.replace('data:', '').trim());
                setMessages((prev) => {
                  const updated = [...prev];
                  if (updated[assistantMessageIndex]) {
                    updated[assistantMessageIndex] = {
                      ...updated[assistantMessageIndex],
                      content: data.content || updated[assistantMessageIndex].content,
                      isStreaming: false,
                    };
                  }
                  return updated;
                });

                setStreamStats((prev) => ({
                  ...prev,
                  iterations: data.iterations || prev.iterations,
                  toolCalls: data.toolCalls || prev.toolCalls,
                  tokens: data.tokens || prev.tokens,
                }));
              } catch (e) {
                console.error('Failed to parse result event:', e);
              }
            } else if (eventType === 'error' && dataLine) {
              try {
                const data = JSON.parse(dataLine.replace('data:', '').trim());
                setError(data.error || 'An error occurred during streaming');
              } catch (e) {
                console.error('Failed to parse error event:', e);
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

      setStreamState((prev) => ({...prev, isStreaming: false}));
      setConnectionStatus('connected');

      // Close the reader
      reader.releaseLock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stream response');
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[assistantMessageIndex]) {
          updated[assistantMessageIndex].content = '⚠️ Error: Failed to stream response. Please try again.';
          updated[assistantMessageIndex].isStreaming = false;
        }
        return updated;
      });
      setStreamState((prev) => ({...prev, isStreaming: false}));
      setConnectionStatus('disconnected');
    }
  };

  /** Stops the active stream and updates the UI to reflect the stop action. */
  const handleStopStream = () => {
    closeEventSource();
    setMessages((prev) => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage?.isStreaming) {
        lastMessage.isStreaming = false;
        lastMessage.content += '\n\n[Stream stopped by user]';
      }
      return updated;
    });
    setStreamState((prev) => ({...prev, isStreaming: false}));
    setConnectionStatus('disconnected');
  };

  /** Clears all messages from the chat and resets statistics. */
  const handleClearMessages = () => {
    setMessages([]);
    setStreamStats({iterations: 0, toolCalls: 0, tokens: {input: 0, output: 0, total: 0}});
    setError(null);
  };

  /** Handles keyboard events within the textarea to send messages on Enter. */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /** Handles changes to the textarea input, including auto-resizing. */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  /** Formats the token usage numbers for display. */
  const formatTokenUsage = (tokens: { input: number; output: number; total: number }) => {
    return `${tokens.total.toLocaleString()}`;
  };

  /** Formats a Date object into a time string (HH:MM). */
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /** Derived state: The list of models for the currently selected provider. */
  const currentModels = providerModels[streamState.provider]?.models || [];
  /** Derived state: Whether the models for the current provider are loading. */
  const isModelsLoading = providerModels[streamState.provider]?.loading || false;

  // Loading state
  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-emerald-500"/>
              <Bot className="h-6 w-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-1">Initializing Stream Chat</h2>
            <p className="text-muted-foreground">Loading providers and models...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col p-6 gap-4">
      {/* Header */}
      <Card className="shrink-0 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Activity className="h-6 w-6 text-white"/>
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Real-time Stream Chat</h2>
                <p className="text-xs text-muted-foreground">
                  Server-Sent Events streaming
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  connectionStatus === 'connected'
                    ? 'default'
                    : connectionStatus === 'connecting'
                      ? 'secondary'
                      : 'outline'
                }
                className="gap-1.5 px-3"
              >
                <span className={`relative flex h-2 w-2`}>
                  {connectionStatus === 'connected' && (
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500'
                      : connectionStatus === 'connecting'
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                  }`}></span>
                </span>
                <span className="text-xs">
                  {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </span>
              </Badge>
            </div>
          </div>

          {/* Settings Row */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground"/>
              <Select
                value={streamState.provider}
                onValueChange={handleProviderChange}
                disabled={streamState.isStreaming}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="Provider"/>
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      <div className="flex items-center justify-between">
                        <span>{p.name}</span>
                        {p.isDefault && (
                          <Badge variant="outline" className="text-[8px] px-1 h-5">
                            default
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground"/>
              <Select
                value={streamState.model}
                onValueChange={(value) => setStreamState((prev) => ({...prev, model: value}))}
                disabled={streamState.isStreaming || isModelsLoading}
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder={isModelsLoading ? 'Loading...' : 'Model'}/>
                </SelectTrigger>
                <SelectContent>
                  {isModelsLoading ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin"/>
                        Loading models...
                      </div>
                    </SelectItem>
                  ) : (
                    currentModels.map((m) => (
                      <SelectItem key={m.id} value={m.id || m.name || ''}>
                        {m.name || m.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground"/>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Temperature</span>
                  <span className="font-medium">{streamState.temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={streamState.temperature}
                  onChange={(e) => setStreamState((prev) => ({...prev, temperature: parseFloat(e.target.value)}))}
                  disabled={streamState.isStreaming}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, #22c55e 0%, #3b82f6 ${streamState.temperature * 50}%, #e5e7eb ${streamState.temperature * 50}%, #e5e7eb 100%)`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground"/>
              <input
                type="number"
                value={streamState.maxTokens}
                onChange={(e) => setStreamState((prev) => ({...prev, maxTokens: parseInt(e.target.value) || 4096}))}
                disabled={streamState.isStreaming}
                className="flex-1 h-8 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                min="1"
                max="32000"
                placeholder="Max tokens"
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="shrink-0">
          <AlertCircle className="h-4 w-4"/>
          <AlertTitle className="text-sm">Error</AlertTitle>
          <AlertDescription className="text-sm">{error}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-auto p-0 ml-auto"
          >
            <X className="h-4 w-4"/>
          </Button>
        </Alert>
      )}

      {/* Messages Display */}
      <Card className="flex-1 flex flex-col min-h-[400px] overflow-hidden">
        <CardHeader className="py-3 px-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground"/>
              <CardTitle className="text-base">Conversation</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {messages.length} {messages.length === 1 ? 'message' : 'messages'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {streamState.isStreaming && (
                <Button
                  onClick={handleStopStream}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4"/>
                  Stop
                </Button>
              )}
              <Button
                onClick={handleClearMessages}
                variant="ghost"
                size="icon"
                disabled={messages.length === 0 || streamState.isStreaming}
                title="Clear conversation"
              >
                <Wrench className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4"
                     onScroll={(e) => {
                       const {scrollTop, scrollHeight, clientHeight} = e.currentTarget;
                       setAutoScroll(scrollTop > scrollHeight - clientHeight - 10);
                     }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl mb-6">
                <Bot className="h-10 w-10 text-white"/>
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Streaming</h3>
              <p className="text-muted-foreground max-w-md">
                Select a provider and model above, then type a message to start receiving real-time streamed responses
                via Server-Sent Events.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-md ${
                      msg.role === 'user'
                        ? 'bg-primary'
                        : msg.role === 'assistant'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                          : 'bg-gradient-to-br from-purple-500 to-pink-600'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-5 w-5 text-primary-foreground"/>
                    ) : msg.role === 'assistant' ? (
                      <Bot className="h-5 w-5 text-white"/>
                    ) : (
                      <Wrench className="h-5 w-5 text-white"/>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] ${msg.role === 'user' ? 'text-right' : ''}`}
                  >
                    <div
                      className={`inline-block rounded-2xl px-5 py-3 shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : msg.role === 'assistant'
                            ? 'bg-muted border rounded-tl-sm'
                            : 'bg-purple-50 border border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 rounded-xl'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {msg.role === 'assistant' ? 'Assistant' : msg.role === 'user' ? 'You' : 'Tool'}
                        </span>
                        <span className="text-xs text-muted-foreground/70">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`text-sm ${msg.role === 'tool' ? 'font-mono' : ''} whitespace-pre-wrap break-words`}
                      >
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 animate-pulse bg-current"/>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stream Statistics */}
      {(streamStats.iterations > 0 || streamStats.toolCalls > 0 || streamStats.tokens.total > 0) && (
        <Card className="shrink-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <Activity className="h-5 w-5 mx-auto mb-1 text-emerald-500"/>
                <div className="text-2xl font-bold">{streamStats.iterations}</div>
                <div className="text-xs text-muted-foreground">Iterations</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <Wrench className="h-5 w-5 mx-auto mb-1 text-purple-500"/>
                <div className="text-2xl font-bold">{streamStats.toolCalls}</div>
                <div className="text-xs text-muted-foreground">Tool Calls</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <Bot className="h-5 w-5 mx-auto mb-1 text-blue-500"/>
                <div className="text-2xl font-bold">
                  {streamStats.tokens.total > 0 ? formatTokenUsage(streamStats.tokens) : '-'}
                </div>
                <div className="text-xs text-muted-foreground">Total Tokens</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-muted/30">
                <Clock className="h-5 w-5 mx-auto mb-1 text-orange-500"/>
                <div className="text-sm font-medium">
                  {streamState.isStreaming ? 'Streaming...' : 'Complete'}
                </div>
                <div className="text-xs text-muted-foreground">Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Area */}
      <Card className="shrink-0 border-0 shadow-md">
        <CardContent className="p-2">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here... (Shift+Enter for new line)"
                disabled={streamState.isStreaming}
                className="flex-1 min-h-[44px] max-h-[150px] resize-none pr-12 rounded-xl border-0 ring-1 ring-input focus:ring-2 focus:ring-ring"
                rows={1}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || streamState.isStreaming}
              size="lg"
              className="h-[44px] px-6 rounded-xl gap-2 shadow-md"
            >
              {streamState.isStreaming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin"/>
                  <span className="hidden sm:inline">Streaming...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <Send className="h-5 w-5"/>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatStream;
