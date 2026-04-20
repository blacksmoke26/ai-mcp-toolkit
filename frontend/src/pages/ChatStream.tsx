/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  Brain,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Settings,
  StopCircle,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Textarea} from '@/components/ui/Textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {config, listProviderModels, listProviders, type Model, type Provider} from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
const ChatStream: React.FC = () => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    provider: '',
    model: '',
    temperature: 0.7,
    maxTokens: 4096,
  });
  const {
    isStreaming,
    provider,
    model,
    temperature,
    maxTokens,
  } = streamState;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModels>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [streamStats, setStreamStats] = useState({
    iterations: 0,
    toolCalls: 0,
    tokens: {
      input: 0,
      output: 0,
      total: 0,
    },
  });
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    return () => {
      closeEventSource();
    };
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
        [providerName]: {
          models: response.models || [],
          loading: false,
        },
      }));

      if (response.models?.length > 0 && !model) {
        setStreamState((prev) => ({
          ...prev,
          model: response.models[0].id || response.models[0].name || '',
        }));
      }
    } catch (err) {
      console.error(`Failed to fetch models for ${providerName}:`, err);
      setProviderModels((prev) => ({
        ...prev,
        [providerName]: {
          models: [],
          loading: false,
        },
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
    if (!inputMessage.trim() || isStreaming) return;

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

    // Reset stream state
    setStreamState((prev) => ({
      ...prev,
      isStreaming: true,
    }));
    setConnectionStatus('connecting');
    setError(null);
    setStreamStats({
      iterations: 0,
      toolCalls: 0,
      tokens: {input: 0, output: 0, total: 0},
    });

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
      const response = await fetch(`${config.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          message: userMessage.content,
          provider: provider,
          model: model,
          temperature: temperature,
          maxTokens: maxTokens,
        }),
      });

      if (!response.ok || !response.body) {
        // noinspection ExceptionCaughtLocallyJS
        throw new Error(`Stream failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamCompleted = false;

      setConnectionStatus('connected');

      const cleanup = () => {
        if (!streamCompleted) {
          streamCompleted = true;
          setStreamState((prev) => ({...prev, isStreaming: false}));
          setConnectionStatus('connected');
          reader.releaseLock();
        }
      };

      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, {stream: true});
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEventType: string | null = null;
          let currentDataLine: string | null = null;

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:') && currentEventType) {
              currentDataLine = line;

              if (currentEventType === 'tool_call' && currentDataLine) {
                try {
                  const data = JSON.parse(currentDataLine.replace('data:', '').trim());
                  setStreamStats((prev) => ({
                    ...prev,
                    iterations: data.iteration || prev.iterations,
                    toolCalls: data.tools?.length || prev.toolCalls,
                  }));

                  if (data.tools && data.tools.length > 0) {
                    setMessages((prev) => {
                      const updated = [...prev];
                      const msg = updated[assistantMessageIndex];
                      if (msg && !msg.content.includes('[Calling tools...]')) {
                        updated[assistantMessageIndex] = {
                          ...msg,
                          content: msg.content + '\n🔧 Calling tools...',
                        };
                      }
                      return updated;
                    });
                  }
                } catch (e) {
                  console.error('Failed to parse tool_call event:', e);
                }
              } else if (currentEventType === 'result' && currentDataLine) {
                try {
                  const data = JSON.parse(currentDataLine.replace('data:', '').trim());
                  setMessages((prev) => {
                    const updated = [...prev];
                    const msg = updated[assistantMessageIndex];
                    if (msg) {
                      updated[assistantMessageIndex] = {
                        ...msg,
                        content: data.content || msg.content,
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

                  // Stop the global streaming state when result is received
                  setStreamState((prev) => ({...prev, isStreaming: false}));
                } catch (e) {
                  console.error('Failed to parse result event:', e);
                }
              } else if (currentEventType === 'error' && currentDataLine) {
                try {
                  const data = JSON.parse(currentDataLine.replace('data:', '').trim());
                  setError(data.error || 'An error occurred during streaming');
                } catch (e) {
                  console.error('Failed to parse error event:', e);
                }
              }
            } else if (line === '') {
              currentEventType = null;
              currentDataLine = null;
            }
          }
        }

        if (!streamCompleted) {
          streamCompleted = true;
          setMessages((prev) => {
            const updated = [...prev];
            const msg = updated[assistantMessageIndex];
            if (msg && msg.isStreaming) {
              updated[assistantMessageIndex] = {
                ...msg,
                isStreaming: false,
              };
            }
            return updated;
          });
          setStreamState((prev) => ({...prev, isStreaming: false}));
          setConnectionStatus('connected');
          reader.releaseLock();
        }
      } catch (readError) {
        console.error('Error reading stream:', readError);
        cleanup();
        // noinspection ExceptionCaughtLocallyJS
        throw readError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stream response');
      setMessages((prev) => {
        const updated = [...prev];
        const msg = updated[assistantMessageIndex];
        if (msg) {
          updated[assistantMessageIndex] = {
            ...msg,
            content: '⚠️ Error: Failed to stream response. Please try again.',
            isStreaming: false,
          };
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
        updated[updated.length - 1] = {
          ...lastMessage,
          isStreaming: false,
          content: lastMessage.content + '\n\n[Stream stopped by user]',
        };
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

  const formatTokenUsage = (tokens: { input: number; output: number; total: number }): string => {
    return tokens.total.toLocaleString();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentModels = providerModels[provider]?.models || [];
  //const isModelsLoading = providerModels[provider]?.loading || false;
  const hasActiveStreamStats = streamStats.iterations > 0 || streamStats.toolCalls > 0 || streamStats.tokens.total > 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-primary"/>
              <Bot className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto space-y-4">
        {/* Header Section */}
        <Card className="border border-border/50 shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 shadow-md">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Real-time Stream Chat
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">Server-Sent Events streaming</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && (
                <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                  Connected
                </Badge>
              )}
              {connectionStatus === 'connecting' && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Connecting
                </Badge>
              )}
              {connectionStatus === 'disconnected' && (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  <AlertCircle className="h-3 w-3 mr-2" />
                  Disconnected
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Select
                  value={provider}
                  onValueChange={handleProviderChange}
                  disabled={isStreaming}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50 h-10">
                    <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        <div className="flex items-center justify-between">
                          <span>{p.name}</span>
                          {p.name === 'ollama' && <Badge variant="outline" className="ml-2 text-[8px] h-5">default</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative flex-1">
                <Select
                  value={model}
                  onValueChange={(m) => setStreamState((prev) => ({...prev, model: m}))}
                  disabled={isStreaming || currentModels.length === 0}
                >
                  <SelectTrigger className="w-full bg-background/50 border-border/50 h-10">
                    <Brain className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentModels.map((m) => (
                      <SelectItem key={m.id || m.name} value={m.id || m.name || ''}>
                        {m.name || m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg px-3 py-2 h-10 w-full sm:w-auto">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setStreamState((prev) => ({...prev, temperature: parseFloat(e.target.value)}))}
                  disabled={isStreaming}
                  className="w-20 sm:w-28 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-mono w-10 text-right">{temperature.toFixed(1)}</span>
              </div>
              <div className="relative w-full sm:w-28 h-10">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setStreamState((prev) => ({...prev, maxTokens: parseInt(e.target.value) || 4096}))}
                  disabled={isStreaming}
                  className="w-full bg-background/50 border border-border/50 rounded-lg pl-9 pr-3 py-2 text-sm font-mono h-full"
                  placeholder="4096"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-none bg-red-500/10 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-auto p-0 ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Chat Messages Section */}
        <div className="flex flex-col gap-4 h-[calc(100vh-320px)] min-h-[500px]">
          <Card className="border border-border/50 shadow-lg flex-1 flex flex-col min-h-0">
            <CardHeader className="border-b border-border/50 py-3 px-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-semibold">Conversation</CardTitle>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {isStreaming && (
                    <Button
                      onClick={handleStopStream}
                      variant="destructive"
                      size="sm"
                      className="gap-2 h-8"
                    >
                      <StopCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Stop</span>
                    </Button>
                  )}
                  <Button
                    onClick={handleClearMessages}
                    variant="ghost"
                    size="sm"
                    disabled={messages.length === 0 || isStreaming}
                    className="gap-2 h-8"
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-4 flex-1 min-h-0 px-4">
              <div
                className="h-full overflow-y-auto space-y-4 pr-2"
                style={{scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--muted-foreground)) transparent'}}
                onScroll={(e) => {
                  const {scrollTop, scrollHeight, clientHeight} = e.currentTarget;
                  setAutoScroll(scrollTop > scrollHeight - clientHeight - 10);
                }}
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                    <div className="p-4 rounded-full bg-muted/50">
                      <Bot className="h-12 w-12 opacity-30" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium mb-1">No messages yet</p>
                      <p className="text-sm opacity-70">Start a conversation by typing a message below</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[75%]">
                          {msg.role === 'assistant' && (
                            <div className="p-1.5 rounded-full bg-green-500/20 text-green-400 flex-shrink-0 shadow-sm">
                              <Bot className="h-4 w-4" />
                            </div>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-3 shadow-sm ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-secondary text-secondary-foreground rounded-tl-sm border border-border/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 text-xs opacity-80">
                              <span className="font-semibold uppercase tracking-wide">
                                {msg.role === 'user' ? 'YOU' : 'ASSISTANT'}
                              </span>
                              <span className="opacity-60">•</span>
                              <span>{formatTime(msg.timestamp)}</span>
                              {msg.isStreaming && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  code: ({node, className, children, ...props}) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    // @ts-expect-error IGNORE
                                    const isInline = !node || !node.type || node.type !== 'code';
                                    return !isInline && match ? (
                                      <code className={className} {...props}>{children}</code>
                                    ) : (
                                      <code className="bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>
                                    );
                                  },
                                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                  h1: ({children}) => <h1 className="text-lg font-semibold mt-4 mb-2">{children}</h1>,
                                  h2: ({children}) => <h2 className="text-base font-semibold mt-3 mb-2">{children}</h2>,
                                  ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                  ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                  a: ({children, href}) => (
                                    <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                                      {children}
                                    </a>
                                  ),
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                              {msg.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                              )}
                            </div>
                          </div>
                          {msg.role === 'user' && (
                            <div className="p-1.5 rounded-full bg-primary/20 text-primary flex-shrink-0 shadow-sm">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Stats Section - Only show when there's data */}
          {hasActiveStreamStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <Card className="border border-border/50 shadow-md transition-all hover:shadow-lg">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center space-y-1">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                  <span className="text-xl sm:text-2xl font-bold">{streamStats.iterations}</span>
                  <span className="text-xs text-muted-foreground">Iterations</span>
                </CardContent>
              </Card>
              <Card className="border border-border/50 shadow-md transition-all hover:shadow-lg">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center space-y-1">
                  <Wrench className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                  <span className="text-xl sm:text-2xl font-bold">{streamStats.toolCalls}</span>
                  <span className="text-xs text-muted-foreground">Tool Calls</span>
                </CardContent>
              </Card>
              <Card className="border border-border/50 shadow-md transition-all hover:shadow-lg">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center space-y-1">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  <span className="text-xl sm:text-2xl font-bold">{formatTokenUsage(streamStats.tokens)}</span>
                  <span className="text-xs text-muted-foreground">Total Tokens</span>
                </CardContent>
              </Card>
              <Card className="border border-border/50 shadow-md transition-all hover:shadow-lg">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center justify-center space-y-1">
                  {isStreaming ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 animate-spin" />
                  ) : (
                    <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  )}
                  <span className="text-xs sm:text-sm font-semibold">
                    {isStreaming ? 'Streaming...' : 'Complete'}
                  </span>
                  <span className="text-xs text-muted-foreground">Status</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Input Section */}
        <Card className="border border-border/50 shadow-lg shrink-0">
          <CardContent className="p-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message here... (Shift+Enter for new line)"
                  disabled={isStreaming}
                  rows={1}
                  className="min-h-[44px] max-h-[150px] resize-none rounded-xl pr-10 border-border/50 bg-background/50"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isStreaming}
                size="lg"
                className="h-[44px] px-6 rounded-xl gap-2 shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="hidden sm:inline">Streaming...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Send</span>
                    <Send className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatStream;
