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
  Brain,
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
import {Textarea} from '@/components/ui/Textarea';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  type ChatMessage,
  type ChatRequest,
  type Conversation,
  type Model,
  type Provider,
  deleteConversation,
  getConversation,
  listConversations,
  listProviders,
  listProviderModels,
  sendChat,
} from '@/lib/api';

/**
 * Props for the MessageBubble component.
 */
interface MessageBubbleProps {
  /** The message content and metadata to display. */
  message: ChatMessage;
  /** Whether the message is currently in a loading state. */
  isLoading?: boolean;
}

/**
 * MessageBubble component renders a single chat message bubble.
 * It handles different roles (user, assistant, tool) with distinct styles.
 *
 * @param props - The component props.
 * @returns The rendered message bubble.
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({message, isLoading = false}) => {
  /** Flag indicating if the message is from the user. */
  const isUser = message.role === 'user';
  /** Flag indicating if the message is a tool execution result. */
  const isTool = message.role === 'tool';

  if (isTool) {
    return (
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Wrench className="h-4 w-4 text-purple-600 dark:text-purple-400"/>
        </div>
        <div className="flex-1 rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">
              Tool Execution
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </span>
          </div>
          <pre className="text-sm font-mono whitespace-pre-wrap text-muted-foreground">
            {message.content}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-primary shadow-md'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md'
        }`}
      >
        {isUser ? (
          <User className="h-5 w-5 text-primary-foreground"/>
        ) : (
          <Bot className="h-5 w-5 text-white"/>
        )}
      </div>
      <div className={`flex-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted border rounded-tl-sm'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin"/>
              <span className="text-sm">AI is thinking...</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        {!isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3"/>
            <span>
              {new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Interface to track the state of models for a specific provider.
 */
interface ProviderModels {
  /** List of available models for the provider. */
  models: Model[];
  /** Loading state indicating if models are currently being fetched. */
  loading: boolean;
}

/**
 * Main Chat component.
 * Manages the chat interface, message history, provider/model selection,
 * and conversation persistence.
 */
const Chat = () => {
  /** Array of chat messages in the current session. */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** Current text input in the message box. */
  const [inputMessage, setInputMessage] = useState('');
  /** Loading state for message sending operations. */
  const [loading, setLoading] = useState(false);
  /** ID of the current conversation, or null if a new chat. */
  const [conversationId, setConversationId] = useState<string | null>(null);
  /** Error message string, or null if no error. */
  const [error, setError] = useState<string | null>(null);
  /** List of available AI providers. */
  const [providers, setProviders] = useState<Provider[]>([]);
  /** Name of the currently selected provider. */
  const [selectedProvider, setSelectedProvider] = useState('');
  /** Record mapping provider names to their available models and loading state. */
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModels>>({});
  /** ID or name of the currently selected model. */
  const [selectedModel, setSelectedModel] = useState('');
  /** State to toggle the visibility of the conversations sidebar. */
  const [showConversations, setShowConversations] = useState(false);
  /** List of past conversations. */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  /** Loading state for fetching the conversation list. */
  const [loadingConversations, setLoadingConversations] = useState(false);
  /** Flag to enable/disable auto-scrolling to the bottom of the chat. */
  const [autoScroll, setAutoScroll] = useState(true);

  /** Ref to the end of the messages list for auto-scrolling. */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** Ref to the textarea input element. */
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: 'smooth'});
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await listProviders();
        const allProviders: Provider[] = [
          ...response.active,
          ...response.configured?.filter(
            (c) => !response.active.some((a) => a.name === c.name),
          ).map((c) => ({...c, id: c.id.toString()})) || [],
        ];
        setProviders(allProviders);
        if (allProviders.length > 0) {
          const firstProvider = allProviders[0];
          setSelectedProvider(firstProvider.name);
          setSelectedModel(firstProvider.defaultModel);

          // Fetch models for the first provider
          await loadProviderModels(firstProvider.name);
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
        setError('Failed to load providers. Please check your connection.');
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    if (showConversations) {
      fetchConversations();
    }
  }, [showConversations]);

  /**
   * Fetches the list of available models for a specific provider.
   * @param providerName - The name of the provider to fetch models for.
   */
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

      if (response.models?.length > 0 && !selectedModel) {
        setSelectedModel(response.models[0].id || response.models[0].name || '');
      }
    } catch (err) {
      console.error(`Failed to fetch models for ${providerName}:`, err);
      setProviderModels((prev) => ({
        ...prev,
        [providerName]: {models: [], loading: false},
      }));
    }
  };

  /**
   * Fetches the list of user conversations from the API.
   */
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

  /**
   * Handles changes to the selected provider.
   * Loads models for the new provider if necessary.
   * @param value - The name of the selected provider.
   */
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    if (!providerModels[value]) {
      loadProviderModels(value);
      setSelectedModel('');
    } else {
      const models = providerModels[value].models;
      if (models.length > 0) {
        setSelectedModel(models[0].id || models[0].name || '');
      }
    }
  };

  /**
   * Sends the user's message to the API and handles the response.
   */
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: ChatMessage = {role: 'user', content: inputMessage.trim()};
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const request: ChatRequest = {
      message: userMessage.content,
      conversationId: conversationId || undefined,
      provider: selectedProvider || undefined,
      model: selectedModel || undefined,
    };

    try {
      const response = await sendChat(request);

      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {role: 'assistant', content: response.content || ''},
      ]);

      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((toolCall) => {
          setMessages((prev) => [
            ...prev,
            {role: 'tool', content: toolCall.result || ''},
          ]);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages((prev) => [
        ...prev,
        {role: 'assistant', content: '⚠️ Error: Could not process your request. Please try again.'},
      ]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles keyboard events within the textarea.
   * Sends message on Enter, allows new line on Shift+Enter.
   * @param e - The keyboard event.
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handles changes to the textarea input.
   * Auto-resizes the textarea height based on content.
   * @param e - The change event.
   */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  /**
   * Resets the chat state to start a new conversation.
   */
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  /**
   * Loads a specific conversation from the API by ID.
   * @param id - The ID of the conversation to load.
   */
  const handleLoadConversation = async (id: string) => {
    try {
      const conv = await getConversation(id);
      setConversationId(id);
      setMessages(
        conv.messages?.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant' | 'tool',
          content: m.content || '',
        })) || [],
      );
      setError(null);
      setShowConversations(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    }
  };

  /**
   * Deletes a specific conversation.
   * @param id - The ID of the conversation to delete.
   * @param e - The mouse event to stop propagation.
   */
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

  /**
   * Clears the current messages and resets the conversation ID.
   */
  const handleClearMessages = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  };

  /** Derived list of models for the currently selected provider. */
  const currentModels = providerModels[selectedProvider]?.models || [];
  /** Derived loading state for the current provider's models. */
  const isModelsLoading = providerModels[selectedProvider]?.loading || false;

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 p-6">
      <div className="flex-1 flex flex-col min-w-0 gap-4">
        {/* Header */}
        <Card className="shrink-0 border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowConversations(!showConversations)}
                  className="lg:hidden"
                >
                  <Menu className="h-4 w-4"/>
                </Button>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                    <Bot className="h-6 w-6 text-white"/>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">MCP AI Assistant</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Badge
                        variant={selectedProvider ? 'default' : 'outline'}
                        className="text-xs px-1.5 py-0"
                      >
                        {selectedProvider || 'No provider'}
                      </Badge>
                      {selectedModel && (
                        <span className="text-muted-foreground">• {selectedModel}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {conversationId && (
                  <Badge variant="outline" className="text-xs hidden sm:flex">
                    Active Session
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNewChat}
                  disabled={loading}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4"/>
                  <span className="hidden sm:inline">New Chat</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearMessages}
                  disabled={messages.length === 0 || loading}
                  className="text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>

            {/* Settings Row */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground"/>
                <Select value={selectedProvider} onValueChange={handleProviderChange} disabled={loading}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Select provider"/>
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        <div className="flex items-center gap-2">
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
              {selectedProvider && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Bot
                      className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"/>
                    <Select
                      value={selectedModel}
                      onValueChange={setSelectedModel}
                      disabled={loading || isModelsLoading}
                    >
                      <SelectTrigger className="w-[200px] h-8 pl-7">
                        <SelectValue placeholder={isModelsLoading ? 'Loading...' : 'Select model'}/>
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
                </div>
              )}
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

        {/* Messages Area */}
        <div
          className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-2xl border shadow-inner min-h-[400px]"
          onScroll={(e) => {
            const {scrollTop, scrollHeight, clientHeight} = e.currentTarget;
            setAutoScroll(scrollTop > scrollHeight - clientHeight - 10);
          }}
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="max-w-md space-y-6">
                <div className="flex justify-center">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl">
                    <Bot className="h-10 w-10 text-white"/>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Welcome to MCP AI</h3>
                  <p className="text-muted-foreground">
                    Select a provider and model above, then start a conversation.
                    The AI assistant can use tools to help you accomplish tasks.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-muted/50 p-3">
                    <Sparkles className="h-4 w-4 mb-2 text-emerald-500"/>
                    <p className="font-medium">Smart Responses</p>
                    <p className="text-xs text-muted-foreground">AI-powered assistance</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3">
                    <Wrench className="h-4 w-4 mb-2 text-purple-500"/>
                    <p className="font-medium">Tool Support</p>
                    <p className="text-xs text-muted-foreground">Execute MCP tools</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <MessageBubble key={index} message={msg}/>
              ))}
              {loading && (
                <MessageBubble
                  message={{role: 'assistant', content: ''}}
                  isLoading
                />
              )}
              <div ref={messagesEndRef}/>
            </>
          )}
        </div>

        {/* Input Area */}
        <Card className="shrink-0 border-0 shadow-md">
          <CardContent className="p-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={handleTextareaChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here... (Shift+Enter for new line)"
                  className="flex-1 min-h-[44px] max-h-[150px] resize-none pr-12 rounded-xl border-0 ring-1 ring-input focus:ring-2 focus:ring-ring"
                  disabled={loading}
                  rows={1}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || !inputMessage.trim()}
                size="lg"
                className="h-[44px] px-6 rounded-xl gap-2 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin"/>
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Send</span>
                    <Send className="h-5 w-5"/>
                  </>
                )}
              </Button>
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs text-muted-foreground">
                MCP AI can make mistakes. Consider checking important information.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Sidebar */}
      {showConversations && (
        <>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowConversations(false)}
          />
          <Card
            className="absolute right-0 top-0 h-full w-80 lg:static lg:w-80 z-50 shadow-2xl lg:shadow-none border-l">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5"/>
                  <CardTitle className="text-base">Conversations</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleNewChat} title="New Chat">
                    <Sparkles className="h-4 w-4"/>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setShowConversations(false)}
                  >
                    <X className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3 h-[calc(100%-80px)] overflow-y-auto">
              {loadingConversations ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-xl animate-pulse"/>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40"/>
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center justify-between rounded-xl p-3 transition-all cursor-pointer ${
                        conversationId === conv.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                      onClick={() => handleLoadConversation(conv.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                          <span className={`font-medium text-sm truncate ${
                            conversationId === conv.id ? 'text-primary' : ''
                          }`}>
                            {conv.title || 'Untitled'}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.lastMessage}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        title="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive"/>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Chat;
