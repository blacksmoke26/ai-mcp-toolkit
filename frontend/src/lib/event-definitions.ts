/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * EVENT_DEFINITIONS - Complete event catalog for the event simulator
 * All 80+ WebSocket events organized by category with payloads, descriptions, and metadata.
 */

import type {EventCategory, WsEventType} from '@/types/websocket';

// ==== Event Definition Type ====
/**
 * Represents a complete definition for a WebSocket event in the simulator.
 * This interface defines the structure, metadata, and default behavior for each event type.
 */
export interface EventDefinition {
  /**
   * Unique identifier for the event definition.
   * Used as a key for lookups and references within the simulator.
   */
  id: string;

  /**
   * The specific WebSocket event type (e.g., 'ws:connect', 'mcp:tools:call').
   * Corresponds to the `WsEventType` union.
   */
  type: WsEventType;

  /**
   * The high-level category the event belongs to (e.g., 'CORE', 'MCP', 'CHAT').
   * Used for grouping and filtering events in the UI.
   */
  category: EventCategory;

  /**
   * Human-readable display name for the event.
   * Shown in UI lists and buttons.
   */
  label: string;

  /**
   * Detailed explanation of what the event does.
   * Provides context to the user about the event's purpose and usage.
   */
  description: string;

  /**
   * The default data payload sent with the event.
   * Serves as a template or initial value for the event payload.
   */
  defaultPayload: Record<string, unknown>;

  /**
   * List of required field names that must be present in the payload.
   * Used for validation before simulating the event.
   */
  requiredFields: string[];

  /**
   * Flag indicating whether this event can be manually triggered in the simulator.
   * If false, the event may only be received or triggered internally.
   */
  simulatable: boolean;

  /**
   * Emoji or icon string representing the event visually.
   * Used in the UI to enhance recognition.
   */
  icon: string;

  /**
   * Optional flag indicating if this event should appear in a "Quick Actions" list.
   * If true, the event is prioritized for easy access.
   */
  quickAction?: boolean;
}

// ==== EVENT_DEFINITIONS Constant ====

export const EVENT_DEFINITIONS: EventDefinition[] = [
  // == CORE Events (9) ==
  {
    id: 'core-ws-connect',
    type: 'ws:connect',
    category: 'CORE',
    label: 'WebSocket Connect',
    description: 'Client connects to WebSocket server with protocol details',
    defaultPayload: {
      event: 'core-ws-connect',
      protocol: 'ws',
      version: '1.0',
      features: ['streaming', 'rooms', 'auth'],
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔌',
    quickAction: true,
  },
  {
    id: 'core-ws-disconnect',
    type: 'ws:disconnect',
    category: 'CORE',
    label: 'WebSocket Disconnect',
    description: 'Client disconnects from WebSocket server with reason',
    defaultPayload: {
      event: 'core-ws-disconnect', reason: 'Client initiated disconnect', code: 1000,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔌',
    quickAction: true,
  },
  {
    id: 'core-ws-error',
    type: 'ws:error',
    category: 'CORE',
    label: 'WebSocket Error',
    description: 'Error event with code, message, and optional context',
    defaultPayload: {
      event: 'core-ws-error',
      code: 'WS_CONNECTION_ERROR',
      message: 'Connection lost unexpectedly',
      stack: '',
      context: {},
    },
    requiredFields: [],
    simulatable: true,
    icon: '⚠️',
    quickAction: true,
  },
  {
    id: 'core-ws-ping',
    type: 'ws:ping',
    category: 'CORE',
    label: 'WebSocket Ping',
    description: 'Ping message to check connection health',
    defaultPayload: {
      event: 'core-ws-ping', timestamp: new Date().toISOString(), serverTime: '',
    },
    requiredFields: [],
    simulatable: true,
    icon: '📡',
    quickAction: true,
  },
  {
    id: 'core-ws-pong',
    type: 'ws:pong',
    category: 'CORE',
    label: 'WebSocket Pong',
    description: 'Pong response to ping with latency info',
    defaultPayload: {
      event: 'core-ws-pong', serverTimestamp: new Date().toISOString(), latency: 12,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📡',
    quickAction: true,
  },
  {
    id: 'core-ws-auth',
    type: 'ws:auth',
    category: 'CORE',
    label: 'WebSocket Authenticate',
    description: 'Authentication request with token and method',
    defaultPayload: {
      event: 'core-ws-auth',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      method: 'jwt',
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔐',
    quickAction: true,
  },
  {
    id: 'core-ws-reconnect',
    type: 'ws:reconnect',
    category: 'CORE',
    label: 'WebSocket Reconnect',
    description: 'Automatic reconnection attempt with attempt details',
    defaultPayload: {
      event: 'core-ws-reconnect', attempt: 1, maxAttempts: 10, delay: 3000, reason: 'Connection lost',
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔄',
  },
  {
    id: 'core-ws-room-control',
    type: 'ws:room:control',
    category: 'CORE',
    label: 'Room Control',
    description: 'Join, leave, create, or destroy a room',
    defaultPayload: {
      event: 'core-ws-room-control', action: 'join', room: 'general', memberCount: 1,
    },
    requiredFields: ['action', 'room'],
    simulatable: true,
    icon: '🚪',
    quickAction: true,
  },
  {
    id: 'core-ws-connection-close',
    type: 'ws:connection:close',
    category: 'CORE',
    label: 'Connection Close',
    description: 'Connection close event with code and reason',
    defaultPayload: {
      event: 'core-ws-connection-close', code: 1000, reason: 'Normal closure',
    },
    requiredFields: [],
    simulatable: true,
    icon: '🚪',
  },

  // == MCP Events (9) ==
  {
    id: 'mcp-tools-list',
    type: 'mcp:tools:list',
    category: 'MCP',
    label: 'List Tools',
    description: 'Request list of available MCP tools',
    defaultPayload: {
      event: 'mcp-tools-list', tools: [], total: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🤖',
    quickAction: true,
  },
  {
    id: 'mcp-tools-call',
    type: 'mcp:tools:call',
    category: 'MCP',
    label: 'Call Tool',
    description: 'Invoke a specific MCP tool with arguments',
    defaultPayload: {
      event: 'mcp-tools-call', name: 'search_files', arguments: {pattern: '*.ts', directory: '/src'},
    },
    requiredFields: ['name'],
    simulatable: true,
    icon: '🔧',
    quickAction: true,
  },
  {
    id: 'mcp-tools-list-changed',
    type: 'mcp:tools:list_changed',
    category: 'MCP',
    label: 'Tools List Changed',
    description: 'Notification that the tools list has changed',
    defaultPayload: {
      event: 'mcp-tools-list-changed',
      added: ['new_tool'],
      removed: ['old_tool'],
      updated: ['updated_tool'],
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔧',
  },
  {
    id: 'mcp-resources-list',
    type: 'mcp:resources:list',
    category: 'MCP',
    label: 'List Resources',
    description: 'Request list of available MCP resources',
    defaultPayload: {
      event: 'mcp-resources-list', resources: [], total: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📂',
    quickAction: true,
  },
  {
    id: 'mcp-resources-read',
    type: 'mcp:resources:read',
    category: 'MCP',
    label: 'Read Resource',
    description: 'Read a specific MCP resource by URI',
    defaultPayload: {
      event: 'mcp-resources-read', uri: 'file:///config.json', content: '{}',
    },
    requiredFields: ['uri'],
    simulatable: true,
    icon: '📄',
  },
  {
    id: 'mcp-resources-list-changed',
    type: 'mcp:resources:list_changed',
    category: 'MCP',
    label: 'Resources List Changed',
    description: 'Notification that the resources list has changed',
    defaultPayload: {
      event: 'mcp-resources-list-changed', added: ['new_resource'], removed: [], updated: [],
    },
    requiredFields: [],
    simulatable: true,
    icon: '📂',
  },
  {
    id: 'mcp-prompts-list',
    type: 'mcp:prompts:list',
    category: 'MCP',
    label: 'List Prompts',
    description: 'Request list of available MCP prompts',
    defaultPayload: {
      event: 'mcp-prompts-list', prompts: [], total: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📝',
    quickAction: true,
  },
  {
    id: 'mcp-prompts-get',
    type: 'mcp:prompts:get',
    category: 'MCP',
    label: 'Get Prompt',
    description: 'Retrieve a specific prompt by name with arguments',
    defaultPayload: {
      event: 'mcp-prompts-get', name: 'code_review', arguments: {language: 'typescript'},
    },
    requiredFields: ['name'],
    simulatable: true,
    icon: '📝',
  },
  {
    id: 'mcp-logging-set-level',
    type: 'mcp:logging:set_level',
    category: 'MCP',
    label: 'Set Logging Level',
    description: 'Change the logging level for MCP server',
    defaultPayload: {
      event: 'mcp-logging-set-level', level: 'debug', target: 'all',
    },
    requiredFields: ['level'],
    simulatable: true,
    icon: '📋',
  },

  // == CHAT Events (12) ==
  {
    id: 'chat-send',
    type: 'chat:send',
    category: 'CHAT',
    label: 'Send Message',
    description: 'Send a chat message to a conversation',
    defaultPayload: {
      event: 'chat-send',
      content: 'Hello, how can I help you today?',
      conversationId: 'conv-123',
      attachments: [],
    },
    requiredFields: ['content'],
    simulatable: true,
    icon: '💬',
    quickAction: true,
  },
  {
    id: 'chat-stream-start',
    type: 'chat:stream:start',
    category: 'CHAT',
    label: 'Stream Start',
    description: 'Start a streaming response',
    defaultPayload: {
      event: 'chat-stream-start',
      conversationId: 'conv-123',
      messageId: 'msg-1',
      model: 'gpt-4',
      provider: 'openai',
    },
    requiredFields: ['conversationId', 'messageId'],
    simulatable: true,
    icon: '▶️',
  },
  {
    id: 'chat-stream-chunk',
    type: 'chat:stream:chunk',
    category: 'CHAT',
    label: 'Stream Chunk',
    description: 'A chunk of streaming response content',
    defaultPayload: {
      event: 'chat-stream-chunk', messageId: 'msg-1', content: 'Here', partial: true, delta: 'Here',
    },
    requiredFields: ['messageId', 'delta'],
    simulatable: true,
    icon: '📦',
  },
  {
    id: 'chat-stream-done',
    type: 'chat:stream:done',
    category: 'CHAT',
    label: 'Stream Done',
    description: 'Complete a streaming response',
    defaultPayload: {
      event: 'chat-stream-done',
      messageId: 'msg-1',
      usage: {tokens: 100, promptTokens: 50, completionTokens: 50},
      stopReason: 'stop_sequence',
    },
    requiredFields: ['messageId'],
    simulatable: true,
    icon: '✅',
  },
  {
    id: 'chat-stream-error',
    type: 'chat:stream:error',
    category: 'CHAT',
    label: 'Stream Error',
    description: 'Error during streaming',
    defaultPayload: {
      event: 'chat-stream-error', messageId: 'msg-1', error: 'Network timeout', recoverable: true,
    },
    requiredFields: ['messageId', 'error'],
    simulatable: true,
    icon: '❌',
  },
  {
    id: 'chat-stream-pause',
    type: 'chat:stream:pause',
    category: 'CHAT',
    label: 'Stream Pause',
    description: 'Pause a streaming response',
    defaultPayload: {
      event: 'chat-stream-pause', messageId: 'msg-1',
    },
    requiredFields: ['messageId'],
    simulatable: true,
    icon: '⏸️',
  },
  {
    id: 'chat-stream-resume',
    type: 'chat:stream:resume',
    category: 'CHAT',
    label: 'Stream Resume',
    description: 'Resume a paused streaming response',
    defaultPayload: {
      event: 'chat-stream-resume', messageId: 'msg-1',
    },
    requiredFields: ['messageId'],
    simulatable: true,
    icon: '▶️',
  },
  {
    id: 'chat-history',
    type: 'chat:history',
    category: 'CHAT',
    label: 'Chat History',
    description: 'Fetch chat history with pagination',
    defaultPayload: {
      event: 'chat-history', conversationId: 'conv-123', limit: 50, offset: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📜',
    quickAction: true,
  },
  {
    id: 'chat-conversations-list',
    type: 'chat:conversations:list',
    category: 'CHAT',
    label: 'List Conversations',
    description: 'List all chat conversations with filtering',
    defaultPayload: {
      event: 'chat-conversations-list', limit: 20, offset: 0, sortBy: 'updated_at', sortOrder: 'desc',
    },
    requiredFields: [],
    simulatable: true,
    icon: '📋',
    quickAction: true,
  },
  {
    id: 'chat-conversations-get',
    type: 'chat:conversations:get',
    category: 'CHAT',
    label: 'Get Conversation',
    description: 'Get a specific conversation with messages',
    defaultPayload: {
      event: 'chat-conversations-get', id: 'conv-123',
    },
    requiredFields: ['id'],
    simulatable: true,
    icon: '🗨️',
  },
  {
    id: 'chat-conversations-delete',
    type: 'chat:conversations:delete',
    category: 'CHAT',
    label: 'Delete Conversation',
    description: 'Delete a chat conversation',
    defaultPayload: {
      event: 'chat-conversations-delete', id: 'conv-123',
    },
    requiredFields: ['id'],
    simulatable: true,
    icon: '🗑️',
  },

  // == TOOL Events (4) ==
  {
    id: 'tool-call',
    type: 'tool:call',
    category: 'TOOL',
    label: 'Tool Call',
    description: 'Invoke a tool call',
    defaultPayload: {
      event: 'tool-call', name: 'execute_command', arguments: {command: 'ls -la'}, requestId: 'req-1',
    },
    requiredFields: ['name'],
    simulatable: true,
    icon: '🔧',
    quickAction: true,
  },
  {
    id: 'tool-result',
    type: 'tool:result',
    category: 'TOOL',
    label: 'Tool Result',
    description: 'Result from a tool execution',
    defaultPayload: {
      event: 'tool-result',
      name: 'execute_command',
      requestId: 'req-1',
      result: {stdout: 'file1.txt\nfile2.txt', stderr: ''},
      executionTime: 45,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📊',
  },
  {
    id: 'tool-error',
    type: 'tool:error',
    category: 'TOOL',
    label: 'Tool Error',
    description: 'Error from tool execution',
    defaultPayload: {
      event: 'tool-error',
      name: 'execute_command',
      requestId: 'req-1',
      error: {code: 'COMMAND_FAILED', message: 'Command failed with exit code 1', stack: ''},
    },
    requiredFields: [],
    simulatable: true,
    icon: '⚠️',
  },
  {
    id: 'tool-list-changed',
    type: 'tool:list_changed',
    category: 'TOOL',
    label: 'Tool List Changed',
    description: 'Notification that the available tools have changed',
    defaultPayload: {
      event: 'tool-list-changed', added: [], removed: [], updated: [],
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔧',
  },

  // == PROVIDER Events (4) ==
  {
    id: 'provider-list',
    type: 'provider:list',
    category: 'PROVIDER',
    label: 'List Providers',
    description: 'List all configured LLM providers',
    defaultPayload: {
      event: 'provider-list', providers: [], total: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔗',
    quickAction: true,
  },
  {
    id: 'provider-health',
    type: 'provider:health',
    category: 'PROVIDER',
    label: 'Provider Health',
    description: 'Health check for a specific provider',
    defaultPayload: {
      event: 'provider-health',
      id: 'openai',
      name: 'OpenAI',
      status: 'healthy',
      latency: 150,
      checks: [{name: 'api', status: 'pass'}],
      lastChecked: new Date().toISOString(),
    },
    requiredFields: [],
    simulatable: true,
    icon: '🏥',
    quickAction: true,
  },
  {
    id: 'provider-status-change',
    type: 'provider:status:change',
    category: 'PROVIDER',
    label: 'Provider Status Change',
    description: 'Notification of a provider status change',
    defaultPayload: {
      event: 'provider-status-change',
      id: 'openai',
      name: 'OpenAI',
      oldStatus: 'online',
      newStatus: 'degraded',
      timestamp: new Date().toISOString(),
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔄',
  },
  {
    id: 'provider-switch',
    type: 'provider:switch',
    category: 'PROVIDER',
    label: 'Provider Switch',
    description: 'Switch between providers',
    defaultPayload: {
      event: 'provider-switch', from: 'openai', to: 'claude', reason: 'failover',
    },
    requiredFields: ['from', 'to'],
    simulatable: true,
    icon: '🔀',
    quickAction: true,
  },

  // == SIMULATION Events (11) ==
  {
    id: 'simulate-scenarios-list',
    type: 'simulate:scenarios:list',
    category: 'SIMULATION',
    label: 'List Scenarios',
    description: 'List available simulation scenarios',
    defaultPayload: {
      event: 'simulate-scenarios-list', scenarios: [], total: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🎭',
    quickAction: true,
  },
  {
    id: 'simulate-run',
    type: 'simulate:run',
    category: 'SIMULATION',
    label: 'Run Scenario',
    description: 'Start a simulation scenario',
    defaultPayload: {
      event: 'simulate-run', scenarioId: 'scenario-1', parameters: {iterations: 10, delay: 100},
    },
    requiredFields: ['scenarioId'],
    simulatable: true,
    icon: '▶️',
    quickAction: true,
  },
  {
    id: 'simulate-progress',
    type: 'simulate:progress',
    category: 'SIMULATION',
    label: 'Simulation Progress',
    description: 'Progress update for a running scenario',
    defaultPayload: {
      event: 'simulate-progress',
      scenarioId: 'scenario-1',
      currentStep: 5,
      totalSteps: 10,
      status: 'running',
      elapsed: 2500,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📊',
  },
  {
    id: 'simulate-result',
    type: 'simulate:result',
    category: 'SIMULATION',
    label: 'Simulation Result',
    description: 'Final result of a simulation scenario',
    defaultPayload: {
      event: 'simulate-result',
      scenarioId: 'scenario-1',
      success: true,
      results: [],
      summary: {totalSteps: 10, successCount: 10, failedCount: 0, skippedCount: 0, totalTime: 5000},
    },
    requiredFields: [],
    simulatable: true,
    icon: '🏁',
  },
  {
    id: 'simulate-pause',
    type: 'simulate:pause',
    category: 'SIMULATION',
    label: 'Pause Simulation',
    description: 'Pause a running simulation',
    defaultPayload: {
      event: 'simulate-pause', scenarioId: 'scenario-1',
    },
    requiredFields: ['scenarioId'],
    simulatable: true,
    icon: '⏸️',
  },
  {
    id: 'simulate-resume',
    type: 'simulate:resume',
    category: 'SIMULATION',
    label: 'Resume Simulation',
    description: 'Resume a paused simulation',
    defaultPayload: {
      event: 'simulate-resume', scenarioId: 'scenario-1',
    },
    requiredFields: ['scenarioId'],
    simulatable: true,
    icon: '▶️',
  },
  {
    id: 'simulate-abort',
    type: 'simulate:abort',
    category: 'SIMULATION',
    label: 'Abort Simulation',
    description: 'Abort a running simulation',
    defaultPayload: {
      event: 'simulate-abort', scenarioId: 'scenario-1', reason: 'User requested abort',
    },
    requiredFields: ['scenarioId'],
    simulatable: true,
    icon: '⛔',
  },
  {
    id: 'simulate-status',
    type: 'simulate:status',
    category: 'SIMULATION',
    label: 'Simulation Status',
    description: 'Get current status of a simulation',
    defaultPayload: {
      event: 'simulate-status',
      scenarioId: 'scenario-1',
      status: 'running',
      progress: 50,
      currentStep: 5,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📊',
  },
  {
    id: 'simulate-mocks-list',
    type: 'simulate:mocks:list',
    category: 'SIMULATION',
    label: 'List Mocks',
    description: 'List available mocks for simulation',
    defaultPayload: {
      event: 'simulate-mocks-list', mocks: [], total: 0,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🎭',
    quickAction: true,
  },
  {
    id: 'simulate-mocks-set',
    type: 'simulate:mocks:set',
    category: 'SIMULATION',
    label: 'Set Mock',
    description: 'Create or update a mock response',
    defaultPayload: {
      event: 'simulate-mocks-set',
      name: 'mock-response',
      endpoint: '/api/data',
      method: 'GET',
      response: {data: 'mocked'},
      delay: 100,
    },
    requiredFields: ['name', 'endpoint', 'method', 'response'],
    simulatable: true,
    icon: '🎯',
  },
  {
    id: 'simulate-mocks-clear',
    type: 'simulate:mocks:clear',
    category: 'SIMULATION',
    label: 'Clear Mocks',
    description: 'Clear all or specific mocks',
    defaultPayload: {
      event: 'simulate-mocks-clear', all: true,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🗑️',
  },

  // == METRICS Events (4) ==
  {
    id: 'metrics-live-start',
    type: 'metrics:live:start',
    category: 'METRICS',
    label: 'Start Live Metrics',
    description: 'Start live metrics streaming',
    defaultPayload: {
      event: 'metrics-live-start', interval: 5000, metrics: ['requests', 'latency', 'memory', 'system'],
    },
    requiredFields: [],
    simulatable: true,
    icon: '📊',
    quickAction: true,
  },
  {
    id: 'metrics-live-tick',
    type: 'metrics:live:tick',
    category: 'METRICS',
    label: 'Live Metrics Tick',
    description: 'A single metrics data tick',
    defaultPayload: {
      event: 'metrics-live-tick',
      timestamp: new Date().toISOString(),
      metrics: {
        requests: {
          total: 150,
          active: 5,
          success: 145,
          failed: 5,
          latency: {p50: 25, p95: 80, p99: 150, average: 35},
        },
        memory: {rss: 128000000, heapUsed: 64000000, heapTotal: 128000000, external: 8000000},
        system: {cpu: 25, loadAvg: [1.5, 1.2, 1.0], uptime: 3600},
      },
    },
    requiredFields: [],
    simulatable: true,
    icon: '📈',
  },
  {
    id: 'metrics-live-stop',
    type: 'metrics:live:stop',
    category: 'METRICS',
    label: 'Stop Live Metrics',
    description: 'Stop live metrics streaming',
    defaultPayload: {
      event: 'metrics-live-stop', duration: 60000, metricsCollected: 12,
    },
    requiredFields: [],
    simulatable: true,
    icon: '⏹️',
  },
  {
    id: 'metrics-fetch',
    type: 'metrics:fetch',
    category: 'METRICS',
    label: 'Fetch Metrics',
    description: 'Request metrics data for a time range',
    defaultPayload: {
      event: 'metrics-fetch',
      type: 'all',
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date().toISOString(),
      interval: 60,
    },
    requiredFields: [],
    simulatable: true,
    icon: '📋',
    quickAction: true,
  },

  // == SYSTEM Events (5) ==
  {
    id: 'system-health',
    type: 'system:health',
    category: 'SYSTEM',
    label: 'System Health',
    description: 'Overall system health status',
    defaultPayload: {
      event: 'system-health',
      status: 'healthy',
      uptime: 86400,
      version: '1.0.0',
      environment: 'production',
      checks: [{name: 'database', status: 'pass'}],
      timestamp: new Date().toISOString(),
    },
    requiredFields: [],
    simulatable: true,
    icon: '⚙️',
    quickAction: true,
  },
  {
    id: 'system-info',
    type: 'system:info',
    category: 'SYSTEM',
    label: 'System Info',
    description: 'System configuration and capabilities',
    defaultPayload: {
      event: 'system-info',
      name: 'MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol Server',
      features: ['tools', 'prompts', 'resources'],
      capabilities: ['streaming', 'rooms', 'auth'],
      config: {},
    },
    requiredFields: [],
    simulatable: true,
    icon: 'ℹ️',
    quickAction: true,
  },
  {
    id: 'system-shutdown',
    type: 'system:shutdown',
    category: 'SYSTEM',
    label: 'System Shutdown',
    description: 'System shutdown notification',
    defaultPayload: {
      event: 'system-shutdown',
      reason: 'Scheduled maintenance',
      gracePeriod: 30,
      timestamp: new Date().toISOString(),
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔌',
  },
  {
    id: 'system-uptime',
    type: 'system:uptime',
    category: 'SYSTEM',
    label: 'System Uptime',
    description: 'Current system uptime information',
    defaultPayload: {
      event: 'system-uptime', uptime: 86400, formatted: '1d 0h 0m', since: '2024-01-01T00:00:00Z',
    },
    requiredFields: [],
    simulatable: true,
    icon: '⏱️',
  },
  {
    id: 'system-version',
    type: 'system:version',
    category: 'SYSTEM',
    label: 'System Version',
    description: 'Current system version info',
    defaultPayload: {
      event: 'system-version',
      version: '1.0.0',
      build: 'abc123',
      commit: 'abc1234567',
      releaseDate: '2024-01-01',
    },
    requiredFields: [],
    simulatable: true,
    icon: '🏷️',
  },

  // == NOTIFICATION Events (4) ==
  {
    id: 'notify-to-room',
    type: 'notify:to:room',
    category: 'NOTIFICATION',
    label: 'Notify to Room',
    description: 'Send notification to a specific room',
    defaultPayload: {
      event: 'notify-to-room',
      room: 'general',
      message: 'System update in progress',
      metadata: {priority: 'high'},
    },
    requiredFields: [],
    simulatable: true,
    icon: '🔔',
    quickAction: true,
  },
  {
    id: 'notify-to-all',
    type: 'notify:to:all',
    category: 'NOTIFICATION',
    label: 'Notify to All',
    description: 'Send notification to all connected clients',
    defaultPayload: {
      event: 'notify-to-all',
      message: 'Server maintenance at 2am UTC',
      metadata: {priority: 'info'},
    },
    requiredFields: [],
    simulatable: true,
    icon: '📢',
    quickAction: true,
  },
  {
    id: 'notify-room-entered',
    type: 'notify:room_entered',
    category: 'NOTIFICATION',
    label: 'Room Entered',
    description: 'Notification that a client has entered a room',
    defaultPayload: {
      event: 'notify-room-entered',
      room: 'general',
      userId: 'user-1',
      userName: 'Alice',
      memberCount: 5,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🚪',
  },
  {
    id: 'notify-room-exited',
    type: 'notify:room_exited',
    category: 'NOTIFICATION',
    label: 'Room Exited',
    description: 'Notification that a client has exited a room',
    defaultPayload: {
      event: 'notify-room-exited', room: 'general', userId: 'user-2', userName: 'Bob', memberCount: 4,
    },
    requiredFields: [],
    simulatable: true,
    icon: '🚪',
  },

  // == GENERIC Events (1) ==
  {
    id: 'generic-request',
    type: 'request',
    category: 'GENERIC',
    label: 'Generic Request',
    description: 'A generic WebSocket request',
    defaultPayload: {
      event: 'generic-request',
    },
    requiredFields: [],
    simulatable: true,
    icon: '📦',
  },
];

// ==== Category Grouping Helper ====

export function getCategoryGroups(): {
  category: EventCategory;
  color: string;
  emoji: string;
  events: EventDefinition[]
}[] {
  const colors: Record<EventCategory, string> = {
    CORE: '#3b82f6',
    MCP: '#8b5cf6',
    CHAT: '#10b981',
    TOOL: '#f59e0b',
    PROVIDER: '#06b6d4',
    SIMULATION: '#ef4444',
    METRICS: '#8b5cf6',
    SYSTEM: '#6b7280',
    NOTIFICATION: '#ec4899',
    GENERIC: '#a78bfa',
  };

  const emojis: Record<EventCategory, string> = {
    CORE: '🔌',
    MCP: '🤖',
    CHAT: '💬',
    TOOL: '🔧',
    PROVIDER: '🔗',
    SIMULATION: '🎭',
    METRICS: '📊',
    SYSTEM: '⚙️',
    NOTIFICATION: '🔔',
    GENERIC: '📦',
  };

  const categories: EventCategory[] = ['CORE', 'MCP', 'CHAT', 'TOOL', 'PROVIDER', 'SIMULATION', 'METRICS', 'SYSTEM', 'NOTIFICATION', 'GENERIC'];

  return categories.map((category) => ({
    category,
    color: colors[category],
    emoji: emojis[category],
    events: EVENT_DEFINITIONS.filter((e) => e.category === category),
  }));
}

// ==== Quick Actions ====

export const QUICK_ACTIONS: EventDefinition[] = EVENT_DEFINITIONS.filter((e) => e.quickAction);

// ==== Search Helper ====

export function searchEvents(query: string): EventDefinition[] {
  if (!query) return EVENT_DEFINITIONS;
  const q = query.toLowerCase();
  return EVENT_DEFINITIONS.filter(
    (e) =>
      e.type.toLowerCase().includes(q) ||
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q),
  );
}
