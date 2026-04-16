/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  Bot,
  Clock,
  Loader2,
  Menu,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Textarea} from '@/components/ui/Textarea';
import {Badge} from '@/components/ui/Badge';
import {Label} from '@/components/ui/Label';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {
  type ChatMessage,
  type ChatRequest,
  type Conversation,
  deleteConversation,
  getConversation,
  listConversations,
  listProviders,
  type Provider,
  sendChat,
} from '@/lib/api';

interface MessageBubbleProps {
  /** The message content to display, which can be a string or a React node */
  message: ChatMessage & { content: string | React.ReactNode };
  /** Optional flag to indicate if the message is currently loading */
  isLoading?: boolean;
}

/**
 * MessageBubble component displays a single chat message with appropriate styling
 * based on the role (user, assistant, or tool) and loading state.
 *
 * @param message - The message object containing role and content
 * @param isLoading - Optional flag to indicate if the message is currently loading
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLoading = false }) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  if (isTool) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </div>
        <Card className="flex-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                Tool Response
              </Badge>
              <span className="text-xs text-muted-foreground">{formatTime()}</span>
            </div>
            <pre className="text-sm font-mono whitespace-pre-wrap">{message.content}</pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        {isUser ? (
          <div className="inline-block rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm">
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating response...</span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
            {!isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatTime()}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Formats a timestamp into a localized time string (HH:MM).
 *
 * @param timestamp - Optional timestamp in milliseconds. If not provided, returns an empty string.
 * @returns The formatted time string.
 */
function formatTime(timestamp?: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat component manages the main chat interface, including message history,
 * provider selection, and conversation management.
 */
const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await listProviders();
        const allProviders = [
          ...response.active,
          ...response.configured.filter((c) => !response.active.some((a) => a.name === c.name)),
        ];
        setProviders(allProviders as unknown as Provider[]);
        if (allProviders.length > 0) {
          setSelectedProvider(allProviders[0].name);
          setSelectedModel(allProviders[0].defaultModel);
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    };
    fetchProviders();
  }, []);

  // Fetch conversations when panel opens
  useEffect(() => {
    if (showConversations) {
      fetchConversations();
    }
  }, [showConversations]);

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const response = await listConversations();
      setConversations(response.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputMessage.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    const request: ChatRequest = {
      message: userMessage.content as string,
      conversationId: conversationId || undefined,
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
    };

    try {
      const response = await sendChat(request);

      // Update conversation ID if new one was created
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.content },
      ]);

      // Add tool calls if any
      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((toolCall) => {
          setMessages((prev) => [
            ...prev,
            { role: 'tool', content: toolCall.result },
          ]);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  const handleLoadConversation = async (id: string) => {
    try {
      const conv = await getConversation(id);
      setConversationId(id);
      setMessages(
        conv.messages?.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant' | 'tool',
          content: m.content,
        })) || [],
      );
      setError(null);
      setShowConversations(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      fetchConversations();
      if (conversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  const formatTokenUsage = (tokens: { prompt: number; completion: number; total: number }) => {
    return (
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Prompt: {tokens.prompt}</span>
        <span>Completion: {tokens.completion}</span>
        <span>Total: {tokens.total}</span>
      </div>
    );
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLatestTokenInfo = () => {
    // This would come from the actual response - simplified for now
    return null;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <Card className="shrink-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConversations(!showConversations)}
                  className="lg:hidden"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold">MCP Agent</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedProvider ? `Provider: ${selectedProvider}` : 'No provider selected'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conversationId && (
                  <Badge variant="outline" className="text-xs">
                    ID: {conversationId.slice(0, 8)}...
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={handleNewChat}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  New Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearMessages}
                  disabled={messages.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Provider/Model Settings */}
            <div className="mt-4 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label>Provider:</Label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="flex h-8 rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {providers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProvider && (
                <div className="flex items-center gap-2">
                  <Label>Model:</Label>
                  <Input
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="Model name"
                    className="h-8 w-40 text-xs"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="shrink-0 mt-2 mb-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="max-w-md">
                <Bot className="mx-auto h-16 w-16 opacity-20 mb-4" />
                <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                <p className="text-sm text-muted-foreground">
                  Send a message to start interacting with the MCP agent.
                  The agent will automatically use tools when needed.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))
          )}
          {loading && (
            <MessageBubble
              message={{
                role: 'assistant',
                //content: <Loader2 className="h-5 w-5 animate-spin" />,
                content: 'Loading...',
              }}
              isLoading
            />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <Card className="shrink-0">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 min-h-[50px] max-h-[150px] resize-none"
                disabled={loading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !inputMessage.trim()}
                className="shrink-0"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Sidebar */}
      {showConversations && (
        <div className="absolute inset-0 z-50 lg:static lg:z-auto">
          <div className="absolute inset-0 bg-black/50 lg:hidden" onClick={() => setShowConversations(false)} />
          <Card className="absolute right-0 top-0 h-full w-80 lg:static lg:w-80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowConversations(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingConversations ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No conversations yet</p>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between rounded-lg p-3 transition-colors cursor-pointer ${
                        conversationId === conv.id ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => handleLoadConversation(conv.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">{conv.title}</span>
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conv.lastMessage}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(conv.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chat;
