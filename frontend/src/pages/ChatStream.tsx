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
  Check,
  Clock,
  Command,
  Copy,
  Info,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Settings,
  StopCircle,
  Trash2,
  User,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Popover} from '@/components/ui/Popover';
import {Textarea} from '@/components/ui/Textarea';
import {ScrollArea} from '@/components/ui/ScrollArea';
import MarkdownViewer from '@/components/ui/MarkdownViewer';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/Select';
import {
  config,
  listProviderModels,
  listProviders,
  type Model,
  type Provider,
  type PromptTemplate,
  getPromptTemplateByName,
  renderPromptTemplate,
} from '@/lib/api';
import {PromptTemplateSelector} from '@/components/ui/PromptTemplateSelector';
import {VariableInputModal} from '@/components/ui/VariableInputModal';

// Types
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
 * Represents statistics related to the current streaming session.
 */
interface StreamStats {
  /** The number of iterations or steps processed during the stream. */
  iterations: number;
  /** The total count of tool calls invoked during the session. */
  toolCalls: number;
  /** Token usage statistics for the session. */
  tokens: {
    /** The number of tokens used in the input prompt. */
    input: number;
    /** The number of tokens generated in the output. */
    output: number;
    /** The total number of tokens used (input + output). */
    total: number;
  };
}

/**
 * Props for the StatsWidget component.
 */
interface StatsWidgetProps {
  /** The label text to display above the value. */
  label: string;
  /** The numerical or string value to display. */
  value: string | number;
  /** The icon element to display alongside the value. */
  icon: React.ReactNode;
  /** The color theme for the widget background and text. */
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'cyan';
  /** Whether to apply a pulse animation to the value. */
  animate?: boolean;
}

/**
 * Props for the ModelGuide component.
 */
interface ModelGuideProps {
  /** The model object containing details and capabilities. */
  model: Model;
  /** The name of the provider supplying the model. */
  provider: string;
  /** Controls the visibility of the guide modal. */
  isOpen: boolean;
  /** Callback function invoked when the modal is closed. */
  onClose: () => void;
}

// Stats Widget Component
const StatsWidget: React.FC<StatsWidgetProps> = (props) => {
  const {
    label,
    value,
    icon,
    color = 'blue',
    animate = false,
  } = props;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    teal: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  };

  return (
    <div
      className={`rounded-xl border p-4 backdrop-blur-sm ${colorClasses[color]} transition-all hover:shadow-lg hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-1">
            {animate ? (
              <span className="inline-block animate-pulse">{value}</span>
            ) : (
              value
            )}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-background/50 backdrop-blur-sm">
          {icon}
        </div>
      </div>
    </div>
  );
};

// Model Guide Component
const ModelGuide: React.FC<ModelGuideProps> = ({model, provider, isOpen, onClose}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-background rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto border border-border/50">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
                  <Brain className="h-5 w-5 text-white"/>
                </div>
                <div>
                  <CardTitle className="text-lg">{model.name || model.id}</CardTitle>
                  <p className="text-sm text-muted-foreground">provided by {provider}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4"/>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-muted to-muted/50 p-5 border border-border/50">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary"/>
                  <span className="font-medium">Model ID:</span>
                  <code
                    className="bg-background px-2 py-0.5 rounded-md text-xs border border-border/50">{model.id}</code>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-primary"/>
                  <span className="font-medium">Type:</span>
                  <Badge variant="outline" className="text-xs">LLM</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2 text-foreground">Capabilities:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Natural language processing</li>
                    <li>Conversational AI responses</li>
                    <li>Context-aware messaging</li>
                    <li>Real-time streaming support</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-primary"/>
                <span className="font-medium text-sm text-primary">Usage Tips</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0"/>
                  <span>Be specific in your prompts for optimal results</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0"/>
                  <span>Use streaming for real-time feedback and control</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0"/>
                  <span>Adjust temperature for creativity vs precision</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0"/>
                  <span>Monitor token usage for cost optimization</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0"/>
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Important Notes</p>
                  <ul className="list-disc list-inside space-y-1 text-xs opacity-80">
                    <li>AI can make mistakes - verify critical information</li>
                    <li>Respect rate limits and usage policies</li>
                    <li>Don't share sensitive or personal information</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Search Panel Component
const SearchPanel: React.FC<{
  /** The list of messages to search through. */
  messages: StreamMessage[];
  /** Callback function invoked when the panel is closed. */
  onClose(): void;
}> = ({messages, onClose}) => {
  /** The current text string entered by the user to filter messages. */
  const [searchTerm, setSearchTerm] = useState('');
  /** The selected role filter to apply to the message list. */
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'assistant'>('all');

  /** The list of messages that match both the search term and the selected role filter. */
  const filteredMessages = messages.filter(msg => {
    /** Checks if the message content contains the search term (case-insensitive). */
    const matchesSearch = msg.content.toLowerCase().includes(searchTerm.toLowerCase());
    /** Checks if the message role matches the selected filter. */
    const matchesRole = filterRole === 'all' || msg.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-border/50">
        <Card className="border-0 shadow-none flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-primary"/>
                <CardTitle className="text-lg">Search Messages</CardTitle>
                <Badge variant="outline" className="text-xs px-2">
                  {filteredMessages.length} results
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
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
                    className="w-full bg-muted rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border/50"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {(['all', 'user', 'assistant'] as const).map((role) => (
                  <Button
                    key={role}
                    variant={filterRole === role ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterRole(role)}
                    className="text-xs capitalize flex-1"
                  >
                    {role}
                  </Button>
                ))}
              </div>

              <ScrollArea className="h-[calc(100%-10rem)] pr-4">
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-3 opacity-30"/>
                    <p className="text-sm">No messages found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                          msg.role === 'user'
                            ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                            : 'bg-muted/50 border-border/30 hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {msg.role === 'user' ? (
                              <User className="h-3.5 w-3.5 text-blue-500"/>
                            ) : (
                              <Bot className="h-3.5 w-3.5 text-emerald-500"/>
                            )}
                            <span className="text-xs font-medium capitalize">{msg.role}</span>
                            <span className="text-xs text-muted-foreground">
                              {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
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

// Connection Status Indicator Component
const ConnectionStatus: React.FC<{ status: 'disconnected' | 'connecting' | 'connected' | 'error' }> = ({status}) => {
  const statusConfig = {
    disconnected: {
      badge: 'bg-red-500/10 text-red-500 border-red-500/20',
      dot: 'bg-red-500',
      label: 'Disconnected',
    },
    connecting: {
      badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      dot: 'bg-yellow-500 animate-pulse',
      label: 'Connecting...',
    },
    connected: {
      badge: 'bg-green-500/10 text-green-500 border-green-500/20',
      dot: 'bg-green-500',
      label: 'Connected',
    },
    error: {
      badge: 'bg-red-500/10 text-red-500 border-red-500/20',
      dot: 'bg-red-500',
      label: 'Error',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.badge}`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`}/>
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{
  /** The message object containing content, role, and metadata. */
  message: StreamMessage;
  /** Optional callback function triggered when the copy action is invoked. */
  onCopy?(content: string): void;
}> = ({message, onCopy}) => {
  /** Local state to track the "copied" feedback status. */
  const [isCopied, setIsCopied] = useState<boolean>(false);
  /** Determines if the message sender is the user. */
  const isUser: boolean = message.role === 'user';
  /** Determines if the message sender is the AI assistant. */
  const isAssistant: boolean = message.role === 'assistant';

  /**
   * Handles the copy-to-clipboard action.
   * Invokes the `onCopy` callback and temporarily sets the copied state.
   */
  const handleCopy = (): void => {
    if (onCopy) {
      onCopy(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  /**
   * Formats a Date object into a localized time string (HH:MM).
   * @param date - The date object to format.
   * @returns The formatted time string.
   */
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className="flex items-start gap-3 max-w-[85%] lg:max-w-[75%]">
        {isAssistant && (
          <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shrink-0">
            <Bot className="h-4 w-4 text-white"/>
          </div>
        )}

        <div className={`rounded-2xl px-5 py-4 shadow-md transition-all group-hover:shadow-lg ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-cyan-700 text-white rounded-tr-sm'
            : 'bg-card border border-border/50 rounded-tl-sm'
        }`}>
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {isUser ? 'YOU' : 'AI ASSISTANT'}
            </span>
            <span className="opacity-60">•</span>
            <Clock className="h-3 w-3"/>
            <span className="text-xs">{formatTime(message.timestamp)}</span>
            {message.isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin"/>
            )}
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none break-words text-sm">
            <MarkdownViewer content={message.content}/>
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse align-middle"/>
            )}
          </div>
        </div>

        {isUser && (
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shrink-0">
            <User className="h-4 w-4 text-white"/>
          </div>
        )}
      </div>

      {!isUser && !message.isStreaming && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500"/>
                  ) : (
                    <Copy className="h-4 w-4"/>
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
  );
};

// Main ChatStream Component
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
  const {isStreaming, provider, model, temperature, maxTokens} = streamState;
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerModels, setProviderModels] = useState<Record<string, ProviderModels>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [streamStats, setStreamStats] = useState<StreamStats>({
    iterations: 0,
    toolCalls: 0,
    tokens: {input: 0, output: 0, total: 0},
  });
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [selectedModelGuide, setSelectedModelGuide] = useState<Model | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Template State ─────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [prefilledContent, setPrefilledContent] = useState('');

  // Fetch default template on mount
  useEffect(() => {
    const fetchDefaultTemplate = async () => {
      try {
        const template = await getPromptTemplateByName('general');
        setSelectedTemplate(template);
      } catch {
        // Use default
      }
    };
    fetchDefaultTemplate();
  }, []);

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
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  };

  /** Initiates the message sending process and handles the streaming response. */
    // ─── Template Handlers ─────────────────────────────────────────────
  const handleApplyTemplate = async (template: PromptTemplate | null) => {
      if (!template) {
        setSelectedTemplate(null);
        setTemplateVariables({});
        setPrefilledContent('');
        return;
      }
      setSelectedTemplate(template);
      if (template.variables && template.variables.length > 0) {
        setTemplateVariables({});
        setShowVariableModal(true);
      } else {
        setPrefilledContent(template.content);
      }
    };

  const handleVariableSubmit = async (values: Record<string, string>) => {
    if (!selectedTemplate) return;
    setTemplateVariables(values);
    try {
      const rendered = await renderPromptTemplate({
        templateId: selectedTemplate.id,
        variables: values,
      });
      setPrefilledContent(rendered.renderedContent);
      setShowVariableModal(false);
    } catch {
      setPrefilledContent(selectedTemplate.content);
      setShowVariableModal(false);
    }
  };

  const handleClearTemplate = () => {
    setPrefilledContent('');
    setTemplateVariables({});
    setSelectedTemplate(null);
  };

  /** Initiates the message sending process and handles the streaming response. */
  const handleSendMessage = async () => {
    const finalMessage = (prefilledContent.trim() || inputMessage.trim());
    if (!finalMessage || isStreaming) return;

    const userMessage: StreamMessage = {
      role: 'user',
      content: finalMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setPrefilledContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setStreamState((prev) => ({...prev, isStreaming: true}));
    setConnectionStatus('connecting');
    setError(null);
    setStreamStats({iterations: 0, toolCalls: 0, tokens: {input: 0, output: 0, total: 0}});

    // Create assistant message placeholder for streaming
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      },
    ]);

    const controller = new AbortController();
    setAbortController(controller);

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
        signal: controller.signal,
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
          if (done) break;

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
                    const toolNames = data.tools.map((t: { name: string }) => t.name).join(', ');
                    setMessages((prev) => {
                      if (prev.length === 0) return prev;
                      const updated = [...prev];
                      const lastMsgIndex = prev.length - 1;
                      const msg = updated[lastMsgIndex];
                      if (msg && !msg.content.includes('[Calling tools...]')) {
                        updated[lastMsgIndex] = {
                          ...msg,
                          content: msg.content + `\n🔧 Calling tools: ${toolNames}`,
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
                    if (prev.length === 0) return prev;
                    const updated = [...prev];
                    const lastMsgIndex = prev.length - 1;
                    const msg = updated[lastMsgIndex];
                    if (msg) {
                      updated[lastMsgIndex] = {
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
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const lastMsgIndex = prev.length - 1;
            const msg = updated[lastMsgIndex];
            if (msg && msg.isStreaming) {
              updated[lastMsgIndex] = {
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
        if (readError instanceof Error && readError.name === 'AbortError') {
          console.log('Stream aborted by user');
        } else {
          console.error('Error reading stream:', readError);
        }
        cleanup();
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Request aborted by user');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to stream response');
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const lastMsgIndex = prev.length - 1;
          const msg = updated[lastMsgIndex];
          if (msg) {
            updated[lastMsgIndex] = {
              ...msg,
              content: '⚠️ Error: Failed to stream response. Please try again.',
              isStreaming: false,
            };
          }
          return updated;
        });
      }
      setStreamState((prev) => ({...prev, isStreaming: false}));
      setConnectionStatus('disconnected');
    }
  };

  /** Stops the active stream and updates the UI to reflect the stop action. */
  const handleStopStream = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }

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
    setPrefilledContent('');
    setSelectedTemplate(null);
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

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
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
      <div
        className="min-h-screen bg-gradient-to-br from-background via-background to-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping"/>
                <div className="relative p-4 rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-xl">
                  <Loader2 className="h-12 w-12 animate-spin text-white"/>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h2
                className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Initializing Stream Chat
              </h2>
              <p className="text-muted-foreground">Loading providers and models...</p>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                  style={{animationDelay: `${i * 0.1}s`}}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto space-y-4">
          {/* Header Section */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-background to-background/95 backdrop-blur-sm">
            <CardHeader
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-xl">
                  <Activity className="h-6 w-6 text-white"/>
                </div>
                <div>
                  <CardTitle
                    className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Real-time Stream Chat
                  </CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Server-Sent Events
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Real-time streaming with instant feedback</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ConnectionStatus status={connectionStatus}/>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Provider Selector */}
                <div className="relative flex-1">
                  <Select value={provider} onValueChange={handleProviderChange} disabled={isStreaming}>
                    <SelectTrigger className="w-full bg-background/50 border-border/50 h-10">
                      <Settings className="h-4 w-4 mr-2 text-muted-foreground"/>
                      <SelectValue placeholder="Select provider"/>
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          <div className="flex items-center justify-between">
                            <span>{p.name}</span>
                            {p.name === 'ollama' && (
                              <Badge variant="outline" className="ml-2 text-[8px] h-4">default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selector */}
                <div className="relative flex-1">
                  <Select
                    value={model}
                    onValueChange={(m) => setStreamState((prev) => ({...prev, model: m}))}
                    disabled={isStreaming || currentModels.length === 0}
                  >
                    <SelectTrigger className="w-full bg-background/50 border-border/50 h-10">
                      <Brain className="h-4 w-4 mr-2 text-muted-foreground"/>
                      <SelectValue placeholder="Select model"/>
                    </SelectTrigger>
                    <SelectContent>
                      {currentModels.map((m) => (
                        <SelectItem key={m.id || m.name} value={m.id || m.name || ''}>
                          <div className="flex items-center gap-2">
                            <span>{m.name || m.id}</span>
                            <Popover
                              trigger={() => (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Info className="h-3 w-3"/>
                                </Button>
                              )}>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Brain className="h-4 w-4 text-primary"/>
                                  <span className="font-semibold">{m.name || m.id}</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Model ID: <code className="bg-muted px-1 rounded text-xs">{m.id}</code>
                                </p>
                                <Button
                                  size="sm"
                                  className="w-full mt-2"
                                  onClick={() => setSelectedModelGuide(m)}
                                >
                                  Learn more
                                </Button>
                              </div>
                            </Popover>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature Control */}
                <div
                  className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg px-3 py-2 h-10 w-full lg:w-auto">
                  <Settings className="h-4 w-4 text-muted-foreground"/>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) =>
                              setStreamState((prev) => ({...prev, temperature: parseFloat(e.target.value)}))
                            }
                            disabled={isStreaming}
                            className="w-20 lg:w-28 h-1 bg-secondary rounded-lg appearance-none cursor-pointer"
                          />
                          <Info className="h-3 w-3 text-muted-foreground cursor-help"/>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px]">Lower = precise, Higher = creative</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-sm font-mono w-10 text-right">{temperature.toFixed(1)}</span>
                </div>

                {/* Max Tokens Input */}
                <div className="relative w-full lg:w-32 h-10">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) =>
                      setStreamState((prev) => ({...prev, maxTokens: parseInt(e.target.value) || 4096}))
                    }
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
            <Alert variant="destructive"
                   className="border-0 bg-red-500/10 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 shadow-lg">
              <AlertCircle className="h-5 w-5"/>
              <AlertTitle className="text-base">Error</AlertTitle>
              <AlertDescription className="text-sm">{error}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="h-auto p-0 ml-auto hover:bg-red-500/20"
              >
                <X className="h-4 w-4"/>
              </Button>
            </Alert>
          )}

          {/* Chat Messages Section */}
          <div className="flex flex-col gap-4 h-[calc(100vh-340px)] min-h-[500px]">
            <Card className="border-0 shadow-lg flex-1 flex flex-col min-h-0">
              <CardHeader className="border-b border-border/50 py-3 px-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary"/>
                    <CardTitle className="text-lg font-semibold">Conversation</CardTitle>
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary">
                      {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowSearch(true)}
                            className="h-8 w-8"
                          >
                            <Search className="h-4 w-4"/>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Search messages (Ctrl+K)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {isStreaming && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleStopStream}
                              variant="destructive"
                              size="sm"
                              className="gap-2 h-8 animate-pulse"
                            >
                              <StopCircle className="h-4 w-4"/>
                              <span className="hidden sm:inline">Stop</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Stop generating response</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleClearMessages}
                            variant="ghost"
                            size="icon"
                            disabled={messages.length === 0 || isStreaming}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
              </CardHeader>
              <CardContent className="py-4 flex-1 min-h-0 px-4">
                <ScrollArea
                  className="h-full pr-4"
                  onScroll={(e) => {
                    const {scrollTop, scrollHeight, clientHeight} = e.currentTarget;
                    setAutoScroll(scrollTop > scrollHeight - clientHeight - 10);
                  }}
                >
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-12">
                        <div
                          className="p-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <Bot className="h-12 w-12 text-primary opacity-50"/>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-medium text-foreground mb-2">No messages yet</p>
                          <p className="text-sm opacity-70">Start a conversation by typing a message below</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                          <Keyboard className="h-3 w-3"/>
                          <span>Press Enter to send, Shift+Enter for new line</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, index) => (
                          <MessageBubble key={index} message={msg} onCopy={handleCopyMessage}/>
                        ))}
                        <div ref={messagesEndRef}/>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Stats Section */}
            {hasActiveStreamStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-4">
                <StatsWidget
                  label="Iterations"
                  value={streamStats.iterations}
                  icon={<Activity className="h-5 w-5"/>}
                  color="teal"
                />
                <StatsWidget
                  label="Tool Calls"
                  value={streamStats.toolCalls}
                  icon={<Zap className="h-5 w-5"/>}
                  color="purple"
                />
                <StatsWidget
                  label="Total Tokens"
                  value={formatTokenUsage(streamStats.tokens)}
                  icon={<Clock className="h-5 w-5"/>}
                  color="cyan"
                />
                <StatsWidget
                  label="Status"
                  value={isStreaming ? 'Streaming...' : 'Complete'}
                  icon={isStreaming ? <Loader2 className="h-5 w-5 animate-spin"/> : <Check className="h-5 w-5"/>}
                  color={isStreaming ? 'orange' : 'green'}
                  animate={isStreaming}
                />
              </div>
            )}
          </div>

          {/* Template Selector & Input Section */}
          <div className="space-y-2 shrink-0">
            {/* Template Selector Bar */}
            {(selectedTemplate || messages.length > 0) && (
              <div className="flex items-center gap-2">
                <PromptTemplateSelector
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={handleApplyTemplate}
                  onApply={() => {
                    if (selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0) {
                      setShowVariableModal(true);
                    } else if (selectedTemplate) {
                      setPrefilledContent(selectedTemplate.content);
                    }
                  }}
                  inputPlaceholder="Select a template or type your own message..."
                  disabled={isStreaming}
                  showPreview={false}
                />
                {prefilledContent && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Badge variant="outline" className="gap-1 px-2 py-0.5 text-xs">
                      <Wand2 className="h-3 w-3"/>
                      {selectedTemplate?.displayName || selectedTemplate?.name}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={handleClearTemplate} className="h-6 w-6 p-0">
                      <X className="h-3 w-3"/>
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Card className="border-0 shadow-lg">
              <CardContent className="p-2">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={prefilledContent || inputMessage}
                      onChange={(e) => {
                        if (prefilledContent) {
                          setPrefilledContent(e.target.value);
                        } else {
                          handleTextareaChange(e);
                        }
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder={prefilledContent ? 'Modify the template content or clear it to type freely...' : 'Type your message here... (Shift+Enter for new line)'}
                      disabled={isStreaming}
                      rows={1}
                      className="min-h-[48px] max-h-[150px] resize-none rounded-2xl pr-10 border-0 ring-1 ring-input focus:ring-2 focus:ring-primary/50 bg-background/50"
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Command className="h-3 w-3"/>
                      <span>K</span>
                      <span className="hidden sm:inline">to search</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!inputMessage.trim() && !prefilledContent.trim()) || isStreaming}
                    size="lg"
                    className="h-[48px] px-6 rounded-2xl gap-2 shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStreaming ? (
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

          {/* Variable Input Modal for Templates */}
          <VariableInputModal
            isOpen={showVariableModal}
            onClose={() => setShowVariableModal(false)}
            variables={selectedTemplate?.variables || []}
            onSubmit={handleVariableSubmit}
            prefillValues={templateVariables}
          />
        </div>

        {/* Search Panel */}
        {showSearch && (
          <SearchPanel
            messages={messages}
            onClose={() => setShowSearch(false)}
          />
        )}

        {/* Model Guide Modal */}
        {selectedModelGuide && (
          <ModelGuide
            model={selectedModelGuide}
            provider={provider}
            isOpen={true}
            onClose={() => setSelectedModelGuide(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

// Helper component for keyboard hint
const Keyboard: React.FC<{ className?: string }> = ({className}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="M6 8h.001"/>
    <path d="M10 8h.001"/>
    <path d="M14 8h.001"/>
    <path d="M18 8h.001"/>
    <path d="M6 12h.001"/>
    <path d="M10 12h.001"/>
    <path d="M14 12h.001"/>
    <path d="M18 12h.001"/>
    <path d="M7 16h10"/>
  </svg>
);

// Helper component for file text icon
const FileText: React.FC<{ className?: string }> = ({className}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <path d="M16 13H8"/>
    <path d="M16 17H8"/>
    <path d="M10 9H8"/>
  </svg>
);

export default ChatStream;
