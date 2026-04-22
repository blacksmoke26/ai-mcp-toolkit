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
  Check,
  Clock,
  Copy,
  FileText,
  Flame,
  Globe,
  Hash,
  Info,
  Loader2,
  Menu,
  MessageSquare,
  MessagesSquare,
  Play,
  Search,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Button} from '@/components/ui/Button';
import {Textarea} from '@/components/ui/Textarea';
import {Badge} from '@/components/ui/Badge';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {Popover} from '@/components/ui/Popover';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import {ScrollArea} from '@/components/ui/ScrollArea';
import {
  type ChatMessage,
  type ChatRequest,
  type Conversation,
  deleteConversation,
  getConversation,
  listConversations,
  listProviderModels,
  listProviders,
  type Model,
  type Provider,
  sendChat,
} from '@/lib/api';

// Types
interface MessageBubbleProps {
  /** The message content and metadata to display. */
  message: ChatMessage;
  /** Whether the message is currently in a loading state. */
  isLoading?: boolean;

  /** Callback function triggered when the user requests to copy the message content. */
  onCopy?(content: string): void;
}

/** Represents the state of available models for a specific provider. */
interface ProviderModels {
  /** The list of models available for the provider. */
  models: Model[];
  /** Indicates whether the models are currently being fetched. */
  loading: boolean;
}

/** Props for the StatsWidget component, displaying a single statistic. */
interface StatsWidgetProps {
  /** The label text to display above the value. */
  label: string;
  /** The numerical or string value to display. */
  value: string | number;
  /** The icon element to display next to the value. */
  icon: React.ReactNode;
  /** The trend direction of the statistic, affecting the icon and status text. */
  trend?: 'up' | 'down' | 'neutral';
  /** The color theme for the widget background and text. */
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
}

/** Props for the ModelGuide component, a modal showing model details. */
interface ModelGuideProps {
  /** The model object containing information to display. */
  model: Model;
  /** Controls the visibility of the guide modal. */
  isOpen: boolean;

  /** Callback function triggered when the modal is closed. */
  onClose(): void;
}

// Stats Widget Component
const StatsWidget: React.FC<StatsWidgetProps> = (props) => {
  const {label, value, icon, trend, color = 'blue'} = props;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-background/50">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend === 'up' && (
            <Sparkles className="h-3 w-3 text-green-500"/>
          )}
          {trend === 'down' && (
            <AlertCircle className="h-3 w-3 text-red-500"/>
          )}
          {trend === 'neutral' && (
            <Hash className="h-3 w-3"/>
          )}
          <span className="opacity-70">{trend === 'up' ? 'Active' : trend === 'down' ? 'Warning' : 'Normal'}</span>
        </div>
      )}
    </div>
  );
};

// Model Guide Component
const ModelGuide: React.FC<ModelGuideProps> = ({model, isOpen, onClose}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary"/>
                </div>
                <div>
                  <CardTitle className="text-lg">{model.name || model.id}</CardTitle>
                  <p className="text-sm text-muted-foreground">Model Information</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4"/>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground"/>
                <span className="font-medium">Model ID:</span>
                <code className="bg-background px-2 py-0.5 rounded text-xs">{model.id}</code>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground"/>
                <span className="font-medium">Capabilities:</span>
                <Badge variant="outline" className="text-xs">Text Generation</Badge>
                <Badge variant="outline" className="text-xs">Chat</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Usage Guide:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Best for: General chat and text generation</li>
                  <li>Recommended for: Conversations, writing assistance</li>
                  <li>Context window: Varies by provider</li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary"/>
                <span className="font-medium text-sm text-primary">Tips</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5"/>
                  <span>Be specific in your prompts for better results</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5"/>
                  <span>You can ask follow-up questions in the same conversation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5"/>
                  <span>Use the copy button to save important responses</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<MessageBubbleProps> = (props) => {
  const {message, isLoading = false, onCopy} = props;

  /** State to track if the message content has been copied to the clipboard. */
  const [isCopied, setIsCopied] = useState(false);
  /** Determines if the message was sent by the user. */
  const isUser = message.role === 'user';
  /** Determines if the message is a tool execution result. */
  const isTool = message.role === 'tool';
  /** Determines if the message is from the AI assistant. */
  const isAssistant = message.role === 'assistant';

  /**
   * Handles the copy action for the message content.
   * Triggers the `onCopy` callback and temporarily sets the copied state.
   */
  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  /** Formats the message timestamp into a localized time string (HH:MM). */
  const timeString = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '';

  if (isTool) {
    return (
      <div className="flex items-start gap-3 group">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg">
          <Wrench className="h-5 w-5 text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border-2 border-purple-500/20 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Wrench className="h-3 w-3 mr-1"/>
                  Tool Execution
                </Badge>
                <span className="text-xs text-muted-foreground">{timeString}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {isCopied ? (
                  <Check className="h-3.5 w-3.5 text-green-500"/>
                ) : (
                  <Copy className="h-3.5 w-3.5"/>
                )}
              </Button>
            </div>
            <pre
              className="text-sm font-mono whitespace-pre-wrap text-muted-foreground bg-purple-500/5 rounded-lg p-3 overflow-x-auto">
              {message.content}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-105 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-cyan-600'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        }`}
      >
        {isUser ? (
          <User className="h-5 w-5 text-white"/>
        ) : (
          <Bot className="h-5 w-5 text-white"/>
        )}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-5 py-4 shadow-md transition-all group-hover:shadow-lg ${
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-cyan-700 text-white rounded-tr-sm'
              : 'bg-card border border-border/50 rounded-tl-sm'
          }`}
        >
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"/>
                  <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"/>
                  <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"/>
                </div>
                <span className="text-sm text-muted-foreground">AI is thinking...</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3"/>
                <span>Generating response...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2 opacity-70">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {isUser ? 'YOU' : 'AI ASSISTANT'}
                </span>
                <span className="text-xs opacity-60">•</span>
                <span className="text-xs">{timeString}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
        </div>
        {!isLoading && !isUser && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-green-500"/>
                    ) : (
                      <Copy className="h-3.5 w-3.5"/>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCopied ? 'Copied!' : 'Copy message'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
};

interface SearchPanelProps {
  /** The list of chat messages to search through. */
  messages: ChatMessage[];
  /** Callback function triggered when a user selects a message from the search results. */
  onSelectMessage: (index: number) => void;
  /** Callback function triggered when the search panel is closed. */
  onClose: () => void;
}

// Search Panel Component
const SearchPanel: React.FC<SearchPanelProps> = ({messages, onSelectMessage, onClose}) => {
  /** The current text string entered by the user to filter messages. */
  const [searchTerm, setSearchTerm] = useState<string>('');
  /** The currently selected role filter ('all', 'user', or 'assistant'). */
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'assistant'>('all');

  /** The list of messages that match both the search term and the selected role filter. */
  const filteredMessages = messages.filter((msg) => {
    const matchesSearch = msg.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || msg.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <Card className="border-0 shadow-none flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-primary"/>
                <CardTitle className="text-lg">Search Messages</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {filteredMessages.length} results
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4"/>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-4">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search in messages..."
                    className="w-full bg-muted rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                </div>
                <div className="flex gap-1">
                  {(['all', 'user', 'assistant'] as const).map((role) => (
                    <Button
                      key={role}
                      variant={filterRole === role ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterRole(role)}
                      className="text-xs capitalize"
                    >
                      {role}
                    </Button>
                  ))}
                </div>
              </div>

              <ScrollArea className="h-[calc(100%-8rem)] pr-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-30"/>
                    <p>No messages found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSelectMessage(idx);
                          onClose();
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          msg.role === 'user' ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'bg-muted hover:bg-muted/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.role === 'user' ? (
                            <User className="h-3.5 w-3.5 text-blue-500"/>
                          ) : (
                            <Bot className="h-3.5 w-3.5 text-emerald-500"/>
                          )}
                          <span className="text-xs font-medium capitalize">{msg.role}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2 text-muted-foreground">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Main Chat Component
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
  /** State to control the visibility of the search panel. */
  const [showSearch, setShowSearch] = useState(false);
  /** The currently selected model object to display in the guide modal. */
  const [selectedModelGuide, setSelectedModelGuide] = useState<Model | null>(null);
  /** The AbortController instance for the current active request, allowing cancellation. */
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  /** Statistics about the current chat session, including message counts and performance metrics. */
  const [stats, setStats] = useState({
    totalMessages: 0,
    userMessages: 0,
    aiMessages: 0,
    toolCalls: 0,
    avgResponseTime: 0,
  });

  /** Ref to the DOM element at the end of the message list for auto-scrolling. */
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** Ref to the textarea input element for focus and height management. */
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
          ...(response.configured?.filter(
            (c) => !response.active.some((a) => a.name === c.name),
          ).map((c) => ({...c, id: c.id.toString()})) || []),
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
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (showConversations) {
      fetchConversations();
    }
  }, [showConversations]);

  useEffect(() => {
    const userMsgs = messages.filter((m) => m.role === 'user').length;
    const aiMsgs = messages.filter((m) => m.role === 'assistant').length;
    const toolMsgs = messages.filter((m) => m.role === 'tool').length;
    setStats({
      totalMessages: messages.length,
      userMessages: userMsgs,
      aiMessages: aiMsgs,
      toolCalls: toolMsgs,
      avgResponseTime: aiMsgs > 0 ? Math.round(messages.length / aiMsgs * 1000) : 0,
    });
  }, [messages]);

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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: Date.now(),
    };

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
      const controller = new AbortController();
      setAbortController(controller);

      const response = await sendChat(request);

      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: response.content || '',
          timestamp: Date.now(),
        },
      ]);

      if (response.toolCalls && response.toolCalls.length > 0) {
        response.toolCalls.forEach((toolCall) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'tool',
              content: toolCall.result || '',
              timestamp: Date.now(),
            },
          ]);
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request aborted by user');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: '⚠️ Error: Could not process your request. Please try again.',
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  /**
   * Aborts the currently active message generation request.
   * Resets the loading state and clears the abort controller.
   */
  const handleAbort = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
      setAbortController(null);
    }
  };

  /**
   * Copies the specified text content to the user's clipboard.
   * @param content - The string content to be copied.
   */
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  /**
   * Handles keyboard events within the message input textarea.
   * Triggers message sending on 'Enter' key press, unless 'Shift' is held.
   * @param e - The keyboard event object.
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

  const dateToTimestamp = (date: string): number => {
    return new Date(date).getTime();
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
        conv.messages?.map((m, index) => ({
          id: `loaded-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          role: m.role as 'system' | 'user' | 'assistant' | 'tool',
          content: m.content || '',
          timestamp: m?.createdAt?.trim?.() ? dateToTimestamp(m.createdAt) : Date.now(),
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
    <TooltipProvider>
      <div className="h-[calc(100vh-8rem)] flex gap-6 p-6">
        <div className="flex-1 flex flex-col min-w-0 gap-4">
          {/* Header */}
          <Card
            className="shrink-0 border-0 shadow-lg bg-gradient-to-r from-background to-background/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowConversations(!showConversations)}
                    className="lg:hidden hover:bg-primary/10"
                  >
                    <Menu className="h-4 w-4"/>
                  </Button>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl">
                      <Bot className="h-7 w-7 text-white"/>
                    </div>
                    <div>
                      <h2
                        className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        MCP AI Assistant
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={selectedProvider ? 'default' : 'outline'}
                          className="text-xs px-2 py-0.5"
                        >
                          {selectedProvider || 'No provider'}
                        </Badge>
                        {selectedModel && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Brain className="h-3 w-3"/>
                            {selectedModel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conversationId && (
                    <Badge variant="outline" className="text-xs hidden sm:flex gap-1">
                      <Play className="h-3 w-3"/>
                      Active Session
                    </Badge>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSearch(true)}
                          className="hover:bg-primary/10"
                        >
                          <Search className="h-4 w-4"/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Search messages (Ctrl+K)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNewChat}
                          disabled={loading}
                          className="gap-2 hover:bg-primary/10"
                        >
                          <Sparkles className="h-4 w-4"/>
                          <span className="hidden sm:inline">New Chat</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Start a new conversation</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleClearMessages}
                          disabled={messages.length === 0 || loading}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4"/>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear all messages</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Settings Row */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-muted-foreground"/>
                  <Select
                    value={selectedProvider}
                    onValueChange={handleProviderChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="Select provider"/>
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.isDefault && (
                              <Badge variant="outline" className="text-[8px] px-1 h-4">
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
                        className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                        disabled={loading || isModelsLoading}
                      >
                        <SelectTrigger className="w-[200px] h-9 pl-9">
                          <SelectValue
                            placeholder={isModelsLoading ? 'Loading...' : 'Select model'}
                          />
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
                                <div className="flex items-center gap-2">
                                  <span>{m.name || m.id}</span>
                                  <Popover
                                    trigger={() => (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 opacity-0 group-hover:opacity-100"
                                      >
                                        <Info className="h-3 w-3"/>
                                      </Button>
                                    )}
                                  >
                                    <div className="p-4">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Brain className="h-4 w-4 text-primary"/>
                                        <span className="font-semibold">{m.name || m.id}</span>
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-3">
                                        Model ID: <code className="bg-muted px-1 rounded">{m.id}</code>
                                      </p>
                                      <Button
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                          setSelectedModelGuide(m);
                                        }}
                                      >
                                        Learn more
                                      </Button>
                                    </div>
                                  </Popover>
                                </div>
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
            <Alert variant="destructive" className="shrink-0 animate-in slide-in-from-top-4">
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
          <Card className="flex-1 border-0 shadow-lg overflow-hidden">
            <CardContent className="p-4 h-full flex flex-col">
              <div
                className="flex-1 overflow-y-auto space-y-4 pr-2"
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
                          className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-2xl">
                          <Bot className="h-12 w-12 text-white"/>
                        </div>
                      </div>
                      <div>
                        <h3
                          className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                          Welcome to MCP AI
                        </h3>
                        <p className="text-muted-foreground">
                          Select a provider and model above, then start a conversation.
                          The AI assistant can use tools to help you accomplish tasks.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 border border-blue-500/20">
                          <Sparkles className="h-5 w-5 mb-2 text-blue-500"/>
                          <p className="font-semibold text-sm">Smart Responses</p>
                          <p className="text-xs text-muted-foreground">AI-powered assistance</p>
                        </div>
                        <div
                          className="rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-4 border border-purple-500/20">
                          <Wrench className="h-5 w-5 mb-2 text-purple-500"/>
                          <p className="font-semibold text-sm">Tool Support</p>
                          <p className="text-xs text-muted-foreground">Execute MCP tools</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id || msg.content}
                        message={msg}
                        onCopy={handleCopyMessage}
                      />
                    ))}
                    {loading && (
                      <MessageBubble
                        message={{role: 'assistant', content: ''}}
                        isLoading={true}
                      />
                    )}
                    <div ref={messagesEndRef}/>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Widgets */}
          {messages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <StatsWidget
                label="Messages"
                value={stats.totalMessages}
                icon={<MessageSquare className="h-5 w-5"/>}
                trend="neutral"
                color="blue"
              />
              <StatsWidget
                label="Your Msgs"
                value={stats.userMessages}
                icon={<User className="h-5 w-5"/>}
                trend="up"
                color="teal"
              />
              <StatsWidget
                label="AI Msgs"
                value={stats.aiMessages}
                icon={<Bot className="h-5 w-5"/>}
                trend="up"
                color="purple"
              />
              <StatsWidget
                label="Tool Calls"
                value={stats.toolCalls}
                icon={<Wrench className="h-5 w-5"/>}
                trend={stats.toolCalls > 0 ? 'up' : 'neutral'}
                color="orange"
              />
            </div>
          )}

          {/* Input Area */}
          <Card className="shrink-0 border-0 shadow-lg">
            <CardContent className="p-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={handleTextareaChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message here... (Shift+Enter for new line)"
                    className="flex-1 min-h-[48px] max-h-[150px] resize-none pr-12 rounded-2xl border-0 ring-1 ring-input focus:ring-2 focus:ring-primary/50"
                    disabled={loading}
                    rows={1}
                  />
                </div>
                {loading ? (
                  <Button
                    onClick={handleAbort}
                    variant="destructive"
                    size="lg"
                    className="h-[48px] px-6 rounded-2xl gap-2 shadow-md animate-pulse"
                  >
                    <StopCircle className="h-5 w-5"/>
                    <span className="hidden sm:inline">Stop</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    size="lg"
                    className="h-[48px] px-6 rounded-2xl gap-2 shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    <span className="hidden sm:inline">Send</span>
                    <Send className="h-5 w-5"/>
                  </Button>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3"/>
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
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessagesSquare className="h-5 w-5 text-primary"/>
                    <CardTitle className="text-base">Conversations</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNewChat}
                            title="New Chat"
                            className="h-8 w-8"
                          >
                            <Sparkles className="h-4 w-4"/>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>New chat</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden h-8 w-8"
                      onClick={() => setShowConversations(false)}
                    >
                      <X className="h-4 w-4"/>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="h-[calc(100%-80px)] pr-4">
                <div className="space-y-1 p-2">
                  {loadingConversations ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-muted rounded-xl animate-pulse"/>
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessagesSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40"/>
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conv) => (
                        <div
                          key={conv.id}
                          className={`group flex items-center justify-between rounded-xl p-3 transition-all cursor-pointer border ${
                            conversationId === conv.id
                              ? 'bg-primary/10 border-primary/30 shadow-sm'
                              : 'hover:bg-muted border-transparent'
                          }`}
                          onClick={() => handleLoadConversation(conv.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
                              <span
                                className={`font-medium text-sm truncate ${
                                  conversationId === conv.id ? 'text-primary' : ''
                                }`}
                              >
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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground group-hover:text-destructive"/>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete conversation</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </>
        )}

        {/* Search Panel */}
        {showSearch && (
          <SearchPanel
            messages={messages}
            onSelectMessage={(index) => {
              const msgEndRef = document.querySelectorAll('[data-message-bubble]')[index];
              if (msgEndRef) {
                msgEndRef.scrollIntoView({behavior: 'smooth', block: 'center'});
              }
            }}
            onClose={() => setShowSearch(false)}
          />
        )}

        {/* Model Guide Modal */}
        {selectedModelGuide && (
          <ModelGuide
            model={selectedModelGuide}
            isOpen={true}
            onClose={() => setSelectedModelGuide(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default Chat;
