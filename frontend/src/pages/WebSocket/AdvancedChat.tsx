/**
 * AdvancedChat - Full-featured WebSocket chat component
 * Features: Conversation sidebar, streaming responses, tool call visualization,
 * markdown rendering, provider selection, stream controls
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react';
import {useToast, useWebSocket} from '@/context/WebSocketContext';
import {type WsPayload} from '@/types/websocket';
import {cn} from '@/lib/utils';
import MarkdownViewer from '@/components/ui/MarkdownViewer';

// ==================== Types ====================
/**
 * Represents a single message within a conversation.
 */
interface ChatMessage {
  /** Unique identifier for the message. */
  id: string;
  /** The text content of the message. */
  content: string;
  /** The role of the entity that sent the message. */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** ISO 8601 timestamp string indicating when the message was created. */
  timestamp: string;
  /** Optional list of tool calls invoked during the generation of this message. */
  toolCalls?: ToolCallInfo[];
  /** Flag indicating if the message content is currently being streamed. */
  isStreaming?: boolean;
  /** Flag indicating if the message content is incomplete (partial chunk). */
  isPartial?: boolean;
}

/**
 * Represents information about a tool/function call execution.
 */
interface ToolCallInfo {
  /** Unique identifier for the tool call. */
  id: string;
  /** The name of the tool or function being called. */
  name: string;
  /** Key-value pairs of arguments passed to the tool. */
  arguments: Record<string, unknown>;
  /** The result returned by the tool execution, if available. */
  result?: unknown;
  /** The current execution status of the tool call. */
  status: 'pending' | 'running' | 'completed' | 'error';
  /** ISO 8601 timestamp string indicating when the tool call started. */
  startedAt: string;
  /** ISO 8601 timestamp string indicating when the tool call completed, if applicable. */
  completedAt?: string;
}

/**
 * Represents a chat conversation session containing messages and metadata.
 */
interface Conversation {
  /** Unique identifier for the conversation. */
  id: string;
  /** The display title of the conversation. */
  title: string;
  /** Ordered list of messages in the conversation. */
  messages: ChatMessage[];
  /** The specific AI model used for the conversation (e.g., 'gpt-4o'). */
  model: string;
  /** The provider ID used for the conversation (e.g., 'openai'). */
  provider: string;
  /** Flag indicating if a response is currently being streamed. */
  isStreaming: boolean;
  /** The current state of the streaming process. */
  streamState: 'active' | 'paused' | 'stopped' | 'error';
  /** ISO 8601 timestamp string indicating when the conversation was created. */
  createdAt: string;
  /** ISO 8601 timestamp string indicating when the conversation was last updated. */
  updatedAt: string;
  /** The total number of messages in the conversation. */
  messageCount: number;
}

// ==================== Default Data ====================

const DEFAULT_MODELS = [
  'gpt-4o',
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
  'llama-3-70b',
  'mistral-large',
];

const DEFAULT_PROVIDERS = [
  {id: 'openai', name: 'OpenAI', type: 'chat'},
  {id: 'anthropic', name: 'Anthropic', type: 'chat'},
  {id: 'google', name: 'Google AI', type: 'chat'},
  {id: 'ollama', name: 'Ollama', type: 'local'},
  {id: 'custom', name: 'Custom', type: 'chat'},
];

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Code Review Request',
    messages: [
      {
        id: 'msg-1',
        content: 'Can you review this TypeScript function for me?',
        role: 'user',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: 'msg-2',
        content:
          'Of course! Please share the code you\'d like me to review. I\'ll analyze it for:\n\n1. **Type safety**\n2. **Performance**\n3. **Best practices**\n4. **Potential bugs**\n\nJust paste the code and I\'ll get started right away!',
        role: 'assistant',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        toolCalls: [
          {
            id: 'tc-1',
            name: 'analyze_code',
            arguments: {language: 'typescript', depth: 'detailed'},
            result: {issues: 2, suggestions: 5, score: 8.5},
            status: 'completed',
            startedAt: new Date(Date.now() - 260000).toISOString(),
            completedAt: new Date(Date.now() - 250000).toISOString(),
          },
        ],
      },
    ],
    model: 'gpt-4o',
    provider: 'openai',
    isStreaming: false,
    streamState: 'stopped',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 240000).toISOString(),
    messageCount: 2,
  },
  {
    id: 'conv-2',
    title: 'API Design Discussion',
    messages: [
      {
        id: 'msg-3',
        content: 'What are the best practices for REST API design?',
        role: 'user',
        timestamp: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: 'msg-4',
        content:
          'Here are the key REST API design principles:\n\n### 1. Resource Naming\nUse nouns, not verbs. Resources should represent entities.\n\n### 2. HTTP Methods\n- `GET` - Retrieve\n- `POST` - Create\n- `PUT/PATCH` - Update\n- `DELETE` - Remove\n\n### 3. Status Codes\n- `200` - Success\n- `201` - Created\n- `400` - Bad Request\n- `401` - Unauthorized\n- `404` - Not Found\n\n### 4. Pagination\nUse `page` and `limit` query parameters.\n\nWould you like me to elaborate on any of these?',
        role: 'assistant',
        timestamp: new Date(Date.now() - 540000).toISOString(),
      },
      {
        id: 'msg-5',
        content: 'What about versioning strategies?',
        role: 'user',
        timestamp: new Date(Date.now() - 480000).toISOString(),
      },
      {
        id: 'msg-6',
        content:
          'There are three main versioning strategies:\n\n1. **URI Versioning**: `/api/v1/resource`\n2. **Header Versioning**: `Accept: application/vnd.api+json;v=1`\n3. **Query Parameter**: `/api/resource?version=1`\n\n**URI versioning** is the most common and recommended approach for its simplicity and cacheability.',
        role: 'assistant',
        timestamp: new Date(Date.now() - 420000).toISOString(),
      },
    ],
    model: 'claude-3-sonnet',
    provider: 'anthropic',
    isStreaming: false,
    streamState: 'stopped',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date(Date.now() - 420000).toISOString(),
    messageCount: 4,
  },
  {
    id: 'conv-3',
    title: 'WebSocket Debugging',
    messages: [
      {
        id: 'msg-7',
        content:
          'I\'m getting connection drops with my WebSocket implementation. Here\'s my setup:\n\n```typescript\nconst ws = new WebSocket(\'ws://localhost:3100/ws\');\nws.onclose = () => console.log(\'Connection closed\');\n```\n\nWhat could be causing this?',
        role: 'user',
        timestamp: new Date(Date.now() - 900000).toISOString(),
      },
      {
        id: 'msg-8',
        content:
          'Connection drops can happen for several reasons. Let me help you debug:\n\n### Common Causes\n\n1. **Missing Heartbeat**: Add ping/pong mechanism\n2. **Server Restart**: Implement auto-reconnect with exponential backoff\n3. **Network Issues**: Use WebSocket ping/pong for keep-alive\n4. **Max Message Size**: Ensure payload isn\'t too large\n\n### Recommended Setup\n\n```typescript\nconst ws = new WebSocket(\'ws://localhost:3100/ws\');\n\nws.onopen = () => {\n  // Start ping interval\n  setInterval(() => ws.send(JSON.stringify({\n    header: { type: \'ws:ping\' },\n    data: { ts: Date.now() }\n  })), 30000);\n};\n\nws.onclose = () => {\n  // Exponential backoff reconnect\n  setTimeout(() => ws.open(), Math.random() * 3000);\n};\n```\n\nThis should significantly improve stability.',
        role: 'assistant',
        timestamp: new Date(Date.now() - 840000).toISOString(),
        toolCalls: [
          {
            id: 'tc-2',
            name: 'diagnose_websocket',
            arguments: {protocol: 'ws', timeout: 30000},
            result: {rootCause: 'missing_heartbeat', confidence: 0.85},
            status: 'completed',
            startedAt: new Date(Date.now() - 870000).toISOString(),
            completedAt: new Date(Date.now() - 860000).toISOString(),
          },
        ],
      },
    ],
    model: 'gpt-4o',
    provider: 'openai',
    isStreaming: false,
    streamState: 'stopped',
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 840000).toISOString(),
    messageCount: 2,
  },
];

// ==================== Copy Button ====================

const CopyButton: React.FC<{ text: string }> = ({text}) => {
  const [copied, setCopied] = React.useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1 text-muted-foreground/60 transition-all hover:bg-muted hover:text-foreground"
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500"/> : <Copy className="h-3.5 w-3.5"/>}
    </button>
  );
};

// ==================== ToolCallCard ====================

interface ToolCallCardProps {
  toolCall: ToolCallInfo;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({toolCall}) => {
  const [expanded, setExpanded] = React.useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'running':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const s = new Date(start).getTime();
    // eslint-disable-next-line react-hooks/purity
    const e = end ? new Date(end).getTime() : Date.now();
    const diff = e - s;
    if (diff < 1000) return `${diff}ms`;
    return `${(diff / 1000).toFixed(1)}s`;
  };

  return (
    <div
      className={cn(
        'mt-2 overflow-hidden rounded-lg border transition-all',
        toolCall.status === 'error'
          ? 'border-red-500/30 bg-red-500/5'
          : toolCall.status === 'completed'
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-border bg-muted/20',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs',
            toolCall.status === 'completed' ? 'bg-green-500/15 text-green-500' :
              toolCall.status === 'error' ? 'bg-red-500/15 text-red-500' :
                toolCall.status === 'running' ? 'bg-blue-500/15 text-blue-500' :
                  'bg-yellow-500/15 text-yellow-500',
          )}
        >
          {toolCall.status === 'running' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin"/>
          ) : toolCall.status === 'completed' ? (
            <Check className="h-3.5 w-3.5"/>
          ) : (
            <Wrench className="h-3.5 w-3.5"/>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono font-medium text-foreground">{toolCall.name}</span>
          <span className="ml-2 text-[10px] text-muted-foreground">
            {toolCall.status === 'running' ? 'Running' : formatDuration(toolCall.startedAt, toolCall.completedAt)}
          </span>
        </div>
        <div
          className="h-2 w-2 rounded-full"
          style={{backgroundColor: getStatusColor(toolCall.status)}}
        />
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground"/>
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground"/>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/50 bg-background/30 p-3">
          <div className="mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Arguments</span>
            <pre
              className="mt-1 max-h-[150px] overflow-auto rounded-md bg-muted/40 p-2 text-[11px] font-mono text-muted-foreground">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Result</span>
              <pre
                className="mt-1 max-h-[150px] overflow-auto rounded-md bg-muted/40 p-2 text-[11px] font-mono text-muted-foreground">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== MessageBubble ====================

/**
 * Props for the MessageBubble component.
 * Defines the data required to render a single chat message bubble.
 */
interface MessageBubbleProps {
  /** The message object containing content, role, and metadata. */
  message: ChatMessage;
  /** Flag indicating if this message is the last one in the current conversation list. */
  isLast: boolean;
}

/**
 * MessageBubble Component
 * Renders a visual representation of a chat message, including the sender's avatar,
 * timestamp, content (rendered as markdown), and associated tool calls.
 *
 * @param props - The properties defined in MessageBubbleProps.
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({message, isLast}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 transition-colors hover:bg-muted/20',
        isLast && 'animate-in fade-in',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl',
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
            : isSystem
              ? 'bg-muted'
              : 'bg-gradient-to-br from-green-500 to-emerald-600',
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white"/>
        ) : isSystem ? (
          <AlertCircle className="h-4 w-4 text-muted-foreground"/>
        ) : (
          <Bot className="h-4 w-4 text-white"/>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">
            {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.isStreaming && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-medium text-green-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"/>
              Streaming
            </span>
          )}
          {!isUser && !isSystem && (
            <div className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100">
              <CopyButton text={message.content}/>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-500/10 border border-blue-500/20 text-foreground rounded-tr-sm'
              : isSystem
                ? 'bg-muted/30 border border-border/50 text-muted-foreground rounded-tl-sm'
                : 'bg-muted/20 border border-border/50 text-foreground/90 rounded-tl-sm',
          )}
        >
          <MarkdownViewer content={message.content}/>
          {message.isPartial && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground/60 ml-0.5 align-middle"/>
          )}
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((tc) => (
              <ToolCallCard key={tc.id} toolCall={tc}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== ConversationItem ====================

/**
 * Props for the ConversationItem component.
 * Defines the data required to render a single conversation item in the sidebar.
 */
interface ConversationItemProps {
  /** The conversation object containing metadata and messages. */
  conversation: Conversation;
  /** Flag indicating if this conversation is currently selected/active. */
  isActive: boolean;

  /** Callback function invoked when the conversation item is clicked. */
  onClick(): void;

  /** Callback function invoked when the delete action is triggered for this conversation. */
  onDelete(): void;
}

/**
 * ConversationItem Component
 * Renders a visual representation of a conversation in the sidebar list,
 * including the title, message count, provider info, and a delete button.
 *
 * @param props - The properties defined in ConversationItemProps.
 */
const ConversationItem: React.FC<ConversationItemProps> = (props) => {
  const {conversation, isActive, onClick, onDelete} = props;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/40 border border-transparent',
      )}
    >
      {/* Streaming indicator */}
      {conversation.isStreaming && (
        <span className="relative flex h-3 w-3 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"/>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"/>
        </span>
      )}

      {/* Icon */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
          isActive ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground',
        )}
      >
        <MessageSquare className="h-4 w-4"/>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('truncate text-sm font-medium', isActive ? 'text-foreground' : 'text-foreground/80')}>
          {conversation.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {conversation.messageCount} messages · {conversation.provider}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-500"
      >
        <Trash2 className="h-3 w-3"/>
      </button>
    </div>
  );
};

// ==================== ProviderSelector ====================

/**
 * Props for the ProviderSelector component.
 * Defines the configuration and callbacks for selecting AI providers and models.
 */
interface ProviderSelectorProps {
  /** The currently selected provider ID (e.g., 'openai', 'anthropic'). */
  value: string;

  /** Callback function invoked when the provider or model selection changes.
   * @param provider - The ID of the selected provider.
   * @param model - The name of the selected model.
   */
  onChange(provider: string, model: string): void;
}

/**
 * ProviderSelector Component
 * Renders a dropdown interface for selecting the AI provider and the specific model to use.
 * It manages local state for the dropdown visibility and the currently selected model.
 *
 * @param props - The properties defined in ProviderSelectorProps.
 */
const ProviderSelector: React.FC<ProviderSelectorProps> = ({value, onChange}) => {
  const [selectedProvider, setSelectedProvider] = React.useState<string>(value);
  const [selectedModel, setSelectedModel] = React.useState<string>(DEFAULT_MODELS[0]);
  const [showProviderDropdown, setShowProviderDropdown] = React.useState<boolean>(false);
  const [showModelDropdown, setShowModelDropdown] = React.useState<boolean>(false);

  // Sync internal state with prop only when prop explicitly changes and differs from current state
  React.useEffect(() => {
    if (value !== selectedProvider) {
      setSelectedProvider(value);
    }
  }, [value, selectedProvider]);

  const handleSelect = (provider: string) => {
    setSelectedProvider(provider);
    setShowProviderDropdown(false);
    onChange(provider, selectedModel);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
    onChange(selectedProvider, model);
  };

  const providerInfo = DEFAULT_PROVIDERS.find((p) => p.id === selectedProvider);

  return (
    <div className="flex items-center gap-2">
      {/* Provider selector */}
      <div className="relative">
        <button
          onClick={() => setShowProviderDropdown(!showProviderDropdown)}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-all"
        >
          <div
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              providerInfo?.type === 'local' ? 'bg-green-500' : 'bg-blue-500',
            )}
          />
          {providerInfo?.name || 'Unknown'}
          <ChevronDown className="h-3 w-3 text-muted-foreground"/>
        </button>

        {showProviderDropdown && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border bg-card shadow-xl">
            {DEFAULT_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-all',
                  selectedProvider === p.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50 text-foreground',
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    p.type === 'local' ? 'bg-green-500' : 'bg-blue-500',
                  )}
                />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model selector */}
      <div className="relative">
        <button
          onClick={() => setShowModelDropdown(!showModelDropdown)}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-all"
        >
          <Sparkles className="h-3 w-3 text-muted-foreground"/>
          {selectedModel}
          <ChevronDown className="h-3 w-3 text-muted-foreground"/>
        </button>

        {showModelDropdown && (
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-[180px] max-h-[240px] overflow-y-auto rounded-lg border bg-card shadow-xl">
            {DEFAULT_MODELS.map((m) => (
              <button
                key={m}
                onClick={() => handleModelChange(m)}
                className={cn(
                  'flex w-full px-3 py-2 text-left text-xs transition-all',
                  selectedModel === m
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50 text-foreground',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== StreamControls ====================

// ==================== StreamControls ====================

/**
 * Props for the StreamControls component.
 * Defines the configuration and callbacks for managing the state of a streaming response.
 */
interface StreamControlsProps {
  /** Flag indicating if a response is currently being streamed. */
  isStreaming: boolean;
  /** The current state of the streaming process. */
  streamState: 'active' | 'paused' | 'stopped' | 'error';

  /** Callback function invoked when the user requests to pause the stream. */
  onPause(): void;

  /** Callback function invoked when the user requests to resume the stream. */
  onResume(): void;

  /** Callback function invoked when the user requests to abort/stop the stream. */
  onAbort(): void;
}

/**
 * StreamControls Component
 * Renders a set of action buttons to control the streaming state of the chat response.
 * It dynamically displays Pause, Resume, or Abort buttons based on the current `streamState`.
 *
 * @param props - The properties defined in StreamControlsProps.
 */
const StreamControls: React.FC<StreamControlsProps> = ({
                                                         isStreaming,
                                                         streamState,
                                                         onPause,
                                                         onResume,
                                                         onAbort,
                                                       }) => (
  <div className="flex items-center gap-1">
    {isStreaming && streamState === 'active' && (
      <button
        onClick={onPause}
        className="rounded-lg p-2 text-amber-500 hover:bg-amber-500/10 transition-all"
        title="Pause stream"
      >
        <Pause className="h-3.5 w-3.5"/>
      </button>
    )}
    {streamState === 'paused' && (
      <button
        onClick={onResume}
        className="rounded-lg p-2 text-green-500 hover:bg-green-500/10 transition-all"
        title="Resume stream"
      >
        <Play className="h-3.5 w-3.5"/>
      </button>
    )}
    {(isStreaming || streamState === 'active' || streamState === 'paused') && (
      <button
        onClick={onAbort}
        className="rounded-lg p-2 text-red-500 hover:bg-red-500/10 transition-all"
        title="Abort stream"
      >
        <X className="h-3.5 w-3.5"/>
      </button>
    )}
  </div>
);

// ==================== MessageInput ====================

/**
 * Props for the MessageInput component.
 * Defines the configuration and callbacks for the message input area.
 */
interface MessageInputProps {
  /** Callback function invoked when the user sends a message.
   * @param content - The text content of the message to be sent.
   */
  onSend(content: string): void;

  /** Flag indicating if a response is currently being streamed. */
  isStreaming: boolean;
  /** The currently selected provider ID (e.g., 'openai', 'anthropic'). */
  provider: string;
  /** The currently selected model name (e.g., 'gpt-4o'). */
  model: string;

  /** Callback function invoked when the provider or model selection changes.
   * @param provider - The ID of the selected provider.
   * @param model - The name of the selected model.
   */
  onProviderChange(provider: string, model: string): void;
}

/**
 * MessageInput Component
 * Renders the input area for composing and sending chat messages.
 * It includes a provider selector, a textarea for message content,
 * and a send button. It handles auto-resizing of the textarea and
 * keyboard shortcuts (Enter to send, Shift+Enter for new line).
 *
 * @param props - The properties defined in MessageInputProps.
 */
const MessageInput: React.FC<MessageInputProps> = ({
                                                     onSend,
                                                     isStreaming,
                                                     provider,
                                                     model,
                                                     onProviderChange,
                                                   }) => {
  const [input, setInput] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-border bg-card p-4">
      {/* Provider selector */}
      <div className="mb-3 flex items-center justify-between">
        <ProviderSelector value={provider} onChange={onProviderChange}/>
        {isStreaming && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500"/>
            Streaming
          </span>
        )}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-3 rounded-xl border border-border bg-muted/30 p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
          rows={1}
          disabled={isStreaming}
          className={cn(
            'flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none',
            isStreaming && 'opacity-50 cursor-not-allowed',
          )}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-all',
            input.trim() && !isStreaming
              ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white hover:opacity-90 shadow-sm'
              : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
          )}
        >
          <Send className="h-4 w-4"/>
        </button>
      </div>
    </div>
  );
};

// ==================== AdvancedChat (Main) ====================

const AdvancedChat: React.FC = () => {
  const {sendToRoom, joinRoom, leaveRoom} = useWebSocket();
  const {addToast} = useToast();

  // State
  const [conversations, setConversations] = React.useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(
    MOCK_CONVERSATIONS[0]?.id ?? null,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [chatExpanded, setChatExpanded] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (activeConversation && activeConversation.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, [activeConversation, activeConversation.messages.length, activeConversationId]);

  // Auto-join chat room
  React.useEffect(() => {
    joinRoom('chat');
    return () => leaveRoom('chat');
  }, [joinRoom, leaveRoom]);

  // Derived
  const filteredConversations = React.useMemo(() => {
    if (!searchTerm) return conversations;
    const q = searchTerm.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, searchTerm]);

  // Handlers
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      model: DEFAULT_MODELS[0],
      provider: DEFAULT_PROVIDERS[0].id,
      isStreaming: false,
      streamState: 'stopped',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    addToast('success', 'New Conversation', 'Created a new conversation thread');
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    addToast('info', 'Deleted', 'Conversation removed');
  };

  const sendMessage = (content: string) => {
    if (!activeConversationId) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    // Update conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
            ...c,
            messages: [...c.messages, userMsg],
            updatedAt: new Date().toISOString(),
            messageCount: c.messageCount + 1,
          }
          : c,
      ),
    );

    // Send via WebSocket
    sendToRoom(
      'chat:send',
      {content, conversationId: activeConversationId} as WsPayload,
      'chat',
    );

    // Simulate assistant response after delay
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        content: '',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isStreaming: true,
        isPartial: true,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
              ...c,
              messages: [...c.messages, assistantMsg],
              isStreaming: true,
              streamState: 'active',
              updatedAt: new Date().toISOString(),
              messageCount: c.messageCount + 1,
            }
            : c,
        ),
      );

      // Simulate streaming chunks
      const chunks = [
        'Here\'s my response to your question. ',
        'I\'ve analyzed the details and ',
        'prepared a comprehensive answer ',
        'for you. ',
        'Let me know if you need any ',
        'clarification or further details!',
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i >= chunks.length) {
          clearInterval(interval);
          // Final message
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === assistantMsg.id
                      ? {...m, content: chunks.join(''), isStreaming: false, isPartial: false}
                      : m,
                  ),
                  isStreaming: false,
                  streamState: 'stopped',
                }
                : c,
            ),
          );
          return;
        }

        const partialContent = chunks.slice(0, i + 1).join('');
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? {...m, content: partialContent, isPartial: i < chunks.length - 1}
                    : m,
                ),
              }
              : c,
          ),
        );
        i++;
      }, 200);

      // Also notify
      sendToRoom(
        'chat:stream:start',
        {
          conversationId: activeConversationId,
          messageId: assistantMsg.id,
          model: activeConversation?.model,
          provider: activeConversation?.provider,
        } as WsPayload,
        'chat-stream',
      );
    }, 800);
  };

  const pauseStream = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {...c, streamState: 'paused'}
          : c,
      ),
    );
    sendToRoom(
      'chat:stream:pause',
      {messageId: 'current'} as WsPayload,
      'chat-stream',
    );
    addToast('warning', 'Stream Paused', 'Response streaming has been paused');
  };

  const resumeStream = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {...c, streamState: 'active'}
          : c,
      ),
    );
    sendToRoom(
      'chat:stream:resume',
      {messageId: 'current'} as WsPayload,
      'chat-stream',
    );
    addToast('info', 'Stream Resumed', 'Response streaming has been resumed');
  };

  const abortStream = () => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {...c, isStreaming: false, streamState: 'stopped'}
          : c,
      ),
    );
    sendToRoom(
      'chat:stream:error',
      {messageId: 'current', error: 'User aborted', recoverable: false} as WsPayload,
      'chat-stream',
    );
    addToast('error', 'Stream Aborted', 'Response streaming was aborted by the user');
  };

  const handleProviderChange = React.useCallback((provider: string, model: string) => {
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {...c, provider, model}
            : c,
        ),
      );
    }
  }, [activeConversationId]);

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border bg-card">
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col border-r border-border transition-all duration-300',
          sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-72',
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary"/>
            <span className="text-sm font-semibold text-foreground">Conversations</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={createNewConversation}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="New conversation"
            >
              <Plus className="h-4 w-4"/>
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Collapse sidebar"
            >
              {sidebarCollapsed ? <Maximize2 className="h-4 w-4"/> : <Minimize2 className="h-4 w-4"/>}
            </button>
          </div>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"/>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        {/* Conversation list */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-2">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/30"/>
                <p className="text-xs text-muted-foreground">
                  {searchTerm ? 'No matching conversations' : 'No conversations yet'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={createNewConversation}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Create one
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onClick={() => setActiveConversationId(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sidebar footer */}
        {!sidebarCollapsed && (
          <div className="border-t border-border px-3 py-2">
            <button
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <Settings className="h-3.5 w-3.5"/>
              Settings
            </button>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{activeConversation.title}</h2>
                <p className="text-[11px] text-muted-foreground">
                  {activeConversation.messageCount} messages · Model: {activeConversation.model}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StreamControls
                  isStreaming={activeConversation.isStreaming}
                  streamState={activeConversation.streamState}
                  onPause={pauseStream}
                  onResume={resumeStream}
                  onAbort={abortStream}
                />
                <button
                  onClick={() => setChatExpanded(!chatExpanded)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  title={chatExpanded ? 'Minimize chat' : 'Expand chat'}
                >
                  {chatExpanded ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className={cn(
                'flex-1 overflow-y-auto',
                chatExpanded && 'max-h-[60vh]',
              )}
            >
              {activeConversation.messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-green-500/20">
                    <Bot className="h-8 w-8 text-primary"/>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Start a Conversation
                  </h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Type a message below to begin. The assistant will respond in real-time with streaming.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-2 text-left">
                    {[
                      {icon: '💡', label: 'Explain a concept', hint: 'Quantum computing basics'},
                      {icon: '🔧', label: 'Generate code', hint: 'TypeScript utility functions'},
                      {icon: '📝', label: 'Write content', hint: 'Blog post introduction'},
                      {icon: '🐛', label: 'Debug help', hint: 'TypeScript type errors'},
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(`${suggestion.label}: ${suggestion.hint}`)}
                        className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all"
                      >
                        <span className="text-sm">{suggestion.icon}</span>
                        <div>
                          <p className="font-medium text-foreground">{suggestion.label}</p>
                          <p className="text-muted-foreground/60">{suggestion.hint}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {activeConversation.messages.map((msg, i) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isLast={i === activeConversation.messages.length - 1}
                    />
                  ))}
                  <div ref={messagesEndRef}/>
                </div>
              )}
            </div>

            {/* Message input */}
            <MessageInput
              onSend={sendMessage}
              isStreaming={activeConversation.isStreaming}
              provider={activeConversation.provider}
              model={activeConversation.model}
              onProviderChange={handleProviderChange}
            />
          </>
        ) : (
          // Empty state
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <MessageSquare className="h-10 w-10 text-primary"/>
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">Select a Conversation</h3>
              <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                Choose a conversation from the sidebar or create a new one to get started.
              </p>
              <button
                onClick={createNewConversation}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-green-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
              >
                <Plus className="h-4 w-4"/>
                New Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedChat;
