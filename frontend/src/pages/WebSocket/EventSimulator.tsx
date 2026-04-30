/**
 * EventSimulator - Comprehensive event simulation panel
 * Features: Tree-view browser, search/filter, payload editor, execution history, bulk testing
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown as ChevronDownIcon,
  ChevronRight,
  ChevronUp,
  Clock,
  Code,
  Eye,
  EyeOff,
  FolderTree,
  ListFilter,
  Play,
  Search,
  Sparkles,
  Terminal,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {useToast, useWebSocket} from '@/context/WebSocketContext';
import {CATEGORY_COLORS, type EventCategory, type WsEventType, type WsPayload} from '@/types/websocket';
import {EVENT_DEFINITIONS, type EventDefinition, getCategoryGroups} from '@/lib/event-definitions';
import {cn} from '@/lib/utils';

// ==== ==================== EventSimulatorHistoryEntry ====================

/**
 * Represents a single entry in the simulation execution history.
 * Stores details about the event, its payload, and the result of the simulation.
 */
interface SimulatedEventHistoryEntry {
  /** Unique identifier for the history entry (timestamp + random suffix). */
  id: string;
  /** The definition of the event that was simulated. */
  definition: EventDefinition;
  /** The payload data that was sent with the event. */
  payload: Record<string, unknown>;
  /** Indicates whether the simulation was successful. */
  success: boolean;
  /** Optional response data received after simulation. */
  response?: unknown;
  /** ISO 8601 timestamp string of when the event was simulated. */
  timestamp: string;
  /** Duration of the simulation in milliseconds. */
  duration: number;
}

// ==== ==================== Collapsible Tree Node ====================

/**
 * Props for the TreeNode component.
 * Handles the display and interaction of a specific event category within the tree.
 */
interface TreeNodeProps {
  /** The category enum value (e.g., 'CORE', 'MCP'). */
  category: EventCategory;
  /** The emoji icon representing the category. */
  emoji: string;
  /** The hex color code associated with the category. */
  color: string;
  /** Array of event definitions belonging to this category. */
  events: EventDefinition[];
  /** Whether the category node is currently expanded. */
  expanded: boolean;
  /** The ID of the currently selected event, or null if none. */
  selectedId: string | null;
  /** The current search term used to filter events. */
  searchTerm: string;
  /** The history of simulated events to display recent activity. */
  eventHistory: SimulatedEventHistoryEntry[];

  /** Callback function triggered when the category header is clicked to toggle expansion. */
  onToggle(): void;

  /** Callback function triggered when an event is selected for viewing/editing. */
  onSelect(e: EventDefinition): void;

  /** Callback function triggered when the simulate button is clicked for an event. */
  onSimulate(e: EventDefinition): void;
}

const TreeNode: React.FC<TreeNodeProps> = (props) => {
  const {
    category,
    emoji,
    color,
    events,
    expanded,
    onToggle,
    selectedId,
    onSelect,
    onSimulate,
    searchTerm,
    eventHistory,
  } = props;

  const [isHovered, setIsHovered] = React.useState(false);

  const filteredEvents = React.useMemo(() => {
    if (!searchTerm) return events;
    const q = searchTerm.toLowerCase();
    return events.filter(
      (e) =>
        e.type.toLowerCase().includes(q) ||
        e.label.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q),
    );
  }, [events, searchTerm]);

  const recentHistory = React.useMemo(() => {
    return eventHistory.filter((h) => h.definition.category === category).slice(-5);
  }, [eventHistory, category]);

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
      {/* Category Header */}
      <button
        onClick={onToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-muted/30"
      >
        {/* Expanded indicator */}
        <span className="text-muted-foreground/60">
          {expanded ? <ChevronDownIcon className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
        </span>

        {/* Category icon */}
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
          style={{backgroundColor: `${color}18`}}
        >
          {emoji}
        </span>

        {/* Category info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{category}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {events.length}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {recentHistory.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {recentHistory.filter((h) => h.success).length} successful
              </span>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div
          className="h-2 w-2 rounded-full transition-opacity duration-300"
          style={{backgroundColor: color, opacity: isHovered ? 1 : 0.4}}
        />
      </button>

      {/* Events list */}
      {expanded && (
        <div className="border-t border-border/50">
          {filteredEvents.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No events match your search
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'group flex items-center gap-3 px-4 py-2.5 transition-all border-b border-border/30 last:border-b-0',
                  selectedId === event.id
                    ? 'bg-primary/10 border-l-2 border-l-primary'
                    : 'hover:bg-muted/20',
                )}
              >
                {/* Icon */}
                <span className="text-sm">{event.icon}</span>

                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-semibold text-foreground',
                        selectedId === event.id && 'text-primary',
                      )}
                    >
                      {event.label}
                    </span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-mono font-medium uppercase text-muted-foreground bg-muted">
                      {event.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {event.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => onSelect(event)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    title="View details"
                  >
                    <Eye className="h-3.5 w-3.5"/>
                  </button>
                  <button
                    onClick={() => onSimulate(event)}
                    className="rounded-md bg-green-500/15 p-1.5 text-green-500 hover:bg-green-500/25 transition-all"
                    title="Simulate event"
                  >
                    <Play className="h-3.5 w-3.5"/>
                  </button>
                </div>

                {/* Category color dot */}
                <div
                  className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{backgroundColor: color}}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ==== ==================== PayloadEditor ====================

/**
 * Properties for the PayloadEditor component.
 * Manages the display and editing of JSON payloads for specific event definitions.
 */
interface PayloadEditorProps {
  /**
   * The definition of the currently selected event.
   * If null, the editor displays a placeholder state prompting selection.
   */
  definition: EventDefinition | null;
  /**
   * The current string representation of the JSON payload being edited.
   */
  customPayload: string;
  /**
   * Callback function triggered when the payload text content changes.
   * @param payload - The new string value of the payload.
   */
  onPayloadChange(payload: string): void;
  /**
   * Callback function triggered when the user requests to reset the payload
   * to the default values defined in the event definition.
   */
  onApplyDefault(): void;
}

/**
 * PayloadEditor - A component for editing and validating JSON payloads.
 *
 * Features:
 * - JSON syntax validation with visual feedback.
 * - Toggleable visibility of the editor area.
 * - Preview of the formatted JSON.
 * - Integration with event definitions for default values and required fields.
 *
 * @param props - The configuration properties for the editor.
 */
const PayloadEditor: React.FC<PayloadEditorProps> = (props) => {
  const {definition, customPayload, onPayloadChange, onApplyDefault} = props;

  const [showEditor, setShowEditor] = React.useState(true);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  if (!definition) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <Code className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30"/>
        <p className="text-sm text-muted-foreground">
          Select an event to configure its payload
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{definition.icon}</span>
          <span className="text-sm font-semibold text-foreground">{definition.label}</span>
          <span className="text-xs text-muted-foreground font-mono">{definition.type}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onApplyDefault}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Sparkles className="h-3.5 w-3.5"/>
            Use Default
          </button>
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {showEditor ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 border-b border-border/50 bg-muted/20">
        <p className="text-xs text-muted-foreground">{definition.description}</p>
        {definition.requiredFields.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 text-yellow-500"/>
            <span className="text-[10px] text-muted-foreground">
              Required: {definition.requiredFields.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Editor */}
      {showEditor && (
        <div className="relative">
          <textarea
            value={customPayload}
            onChange={(e) => {
              onPayloadChange(e.target.value);
              if (validationError) setValidationError(null);
            }}
            className={cn(
              'h-[200px] w-full resize-none border-0 bg-background p-4 font-mono text-sm text-foreground focus:outline-none',
              validationError && 'border-b-2 border-b-red-500',
            )}
            spellCheck={false}
          />
          {validationError && (
            <div
              className="absolute bottom-4 right-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-500">
              {validationError}
            </div>
          )}
          <div className="absolute top-2 right-2 text-[10px] text-muted-foreground/40 font-mono pointer-events-none">
            JSON
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="border-t border-border bg-muted/10 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        <pre className="max-h-[150px] overflow-auto text-xs font-mono text-muted-foreground">
          {(() => {
            try {
              return JSON.stringify(JSON.parse(customPayload), null, 2);
            } catch {
              return <span className="text-red-400">{customPayload}</span>;
            }
          })()}
        </pre>
      </div>
    </div>
  );
};

// ==== ==================== ExecutionHistory ====================

/**
 * Properties for the ExecutionHistory component.
 * Manages the display and interaction of the event execution history log.
 */
interface ExecutionHistoryProps {
  /**
   * An array of history entries representing simulated events.
   * Each entry contains details about the event definition, payload, result, and timing.
   */
  history: SimulatedEventHistoryEntry[];
  /**
   * Callback function triggered when the user requests to clear the execution history.
   * This should reset the history state to an empty array.
   */
  onClear(): void;
}

const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({history, onClear}) => {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground"/>
          <span className="text-sm font-semibold text-foreground">Execution History</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Clear history"
            >
              <Trash2 className="h-3.5 w-3.5"/>
            </button>
          )}
          {collapsed ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground"/> :
            <ChevronUp className="h-4 w-4 text-muted-foreground"/>}
        </div>
      </button>

      {!collapsed && (
        <div className="max-h-[300px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No events simulated yet
            </div>
          ) : (
            history.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
              >
                {/* Status */}
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    entry.success ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500',
                  )}
                >
                  {entry.success ? <CheckCircle2 className="h-3.5 w-3.5"/> : <XCircle className="h-3.5 w-3.5"/>}
                </div>

                {/* Event info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{entry.definition.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {entry.definition.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()} · {entry.duration}ms
                  </p>
                </div>

                {/* Category color */}
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{backgroundColor: CATEGORY_COLORS[entry.definition.category]}}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ==== ==================== ScenarioRunner ====================

/**
 * Represents a pre-defined sequence of events that can be executed as a single test scenario.
 * Scenarios allow for simulating complex workflows or common event chains with a single action.
 */
interface Scenario {
  /**
   * Unique identifier for the scenario.
   * Used to reference the scenario programmatically (e.g., in callbacks or state management).
   */
  id: string;
  /**
   * Human-readable name of the scenario.
   * Displayed in the UI to describe the scenario's purpose.
   */
  name: string;
  /**
   * Detailed description of what the scenario does.
   * Provides context about the sequence of events or the workflow being tested.
   */
  description: string;
  /**
   * Ordered list of event type strings to be executed.
   * These strings correspond to the `type` property of `EventDefinition` objects.
   */
  events: string[];
  /**
   * Emoji or icon representing the scenario.
   * Used in the UI to visually distinguish different scenarios.
   */
  icon: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'scenario-health-check',
    name: 'Health Check Sequence',
    description: 'System health → Info → Version → Uptime',
    events: ['system:health', 'system:info', 'system:version', 'system:uptime'],
    icon: '🏥',
  },
  {
    id: 'scenario-mcp-basics',
    name: 'MCP Basics',
    description: 'List tools, resources, prompts',
    events: ['mcp:tools:list', 'mcp:resources:list', 'mcp:prompts:list'],
    icon: '🤖',
  },
  {
    id: 'scenario-chat-flow',
    name: 'Chat Flow',
    description: 'Send message → Stream start → Chunk → Done',
    events: ['chat:send', 'chat:stream:start', 'chat:stream:chunk', 'chat:stream:done'],
    icon: '💬',
  },
  {
    id: 'scenario-provider-check',
    name: 'Provider Check',
    description: 'List providers → Health check → Status change',
    events: ['provider:list', 'provider:health', 'provider:status:change'],
    icon: '🔗',
  },
  {
    id: 'scenario-simulation',
    name: 'Simulation Setup',
    description: 'List scenarios → Run scenario → Check status',
    events: ['simulate:scenarios:list', 'simulate:run', 'simulate:status'],
    icon: '🎭',
  },
  {
    id: 'scenario-metrics',
    name: 'Metrics Collection',
    description: 'Start live metrics → Fetch → Stop',
    events: ['metrics:live:start', 'metrics:fetch', 'metrics:live:stop'],
    icon: '📊',
  },
  {
    id: 'scenario-notifications',
    name: 'Notification Test',
    description: 'Notify room → Notify all → Room events',
    events: ['notify:to:room', 'notify:to:all', 'notify:room_entered', 'notify:room_exited'],
    icon: '🔔',
  },
  {
    id: 'scenario-full-connect',
    name: 'Full Connection',
    description: 'Connect → Auth → Join rooms → Ping',
    events: ['ws:connect', 'ws:auth', 'ws:room:control', 'ws:ping'],
    icon: '🔌',
  },
];

interface ScenarioRunnerProps {
  onRunScenario(scenarioId: string): void;
}

const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({onRunScenario}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500"/>
          <span className="text-sm font-semibold text-foreground">Pre-built Scenarios</span>
        </div>
        {collapsed ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground"/> :
          <ChevronUp className="h-4 w-4 text-muted-foreground"/>}
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-2 p-4">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onRunScenario(scenario.id)}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
            >
              <span className="text-xl">{scenario.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{scenario.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{scenario.description}</p>
              </div>
              <Play className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==== ==================== BulkTester ====================

interface BulkTesterProps {
  isRunning: boolean;
  selectedEvents: EventDefinition[];

  onBulkSimulate(events: EventDefinition[]): void;
}

const BulkTester: React.FC<BulkTesterProps> = ({selectedEvents, onBulkSimulate, isRunning}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(x => !x)}
        className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-purple-500"/>
          <span className="text-sm font-semibold text-foreground">Bulk Testing</span>
          {selectedEvents.length > 0 && (
            <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-500">
              {selectedEvents.length} selected
            </span>
          )}
        </div>
        {collapsed ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground"/> :
          <ChevronUp className="h-4 w-4 text-muted-foreground"/>}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Select events from the tree to enable bulk testing
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {selectedEvents.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground"
                  >
                    <span>{e.icon}</span>
                    <span>{e.label}</span>
                  </span>
                ))}
              </div>
              <button
                onClick={() => onBulkSimulate(selectedEvents)}
                disabled={isRunning}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRunning ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>
                    Running...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4"/>
                    Simulate All {selectedEvents.length} Events
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ==== ==================== EventSimulator (Main) ====================

const EventSimulator: React.FC = () => {
  const {send} = useWebSocket();
  const {addToast} = useToast();

  // State
  const [expandedCategories, setExpandedCategories] = React.useState<Set<EventCategory>>(
    new Set(['CORE', 'MCP', 'CHAT']),
  );
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedEvent, setSelectedEvent] = React.useState<EventDefinition | null>(null);
  const [customPayload, setCustomPayload] = React.useState('{}');
  const [history, setHistory] = React.useState<SimulatedEventHistoryEntry[]>([]);
  const [selectedEventsForBulk, setSelectedEventsForBulk] = React.useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<'browser' | 'payload' | 'history'>('browser');

  // Category groups
  const categories = React.useMemo(() => getCategoryGroups(), []);

  // Toggle category expansion
  const toggleCategory = (category: EventCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Select event
  const selectEvent = (event: EventDefinition) => {
    setSelectedEvent(event);
    setCustomPayload(JSON.stringify(event.defaultPayload, null, 2));
    setActivePanel('payload');
  };

  // Simulate single event
  const simulateEvent = async (event: EventDefinition) => {
    const payloadStr = selectedEvent?.id === event.id ? customPayload : JSON.stringify(event.defaultPayload);
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(payloadStr);
    } catch {
      addToast('error', 'Invalid JSON', `Payload for ${event.label} is not valid JSON`);
      return;
    }

    const startTime = Date.now();
    send(event.type as WsEventType, payload as WsPayload);

    const duration = Date.now() - startTime;
    const entry: SimulatedEventHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      definition: event,
      payload,
      success: true,
      timestamp: new Date().toISOString(),
      duration,
    };

    setHistory((prev) => [...prev.slice(-99), entry]);
    addToast('success', event.label, `Event ${event.type} simulated successfully in ${duration}ms`);
  };

  // Apply default payload
  const applyDefaultPayload = () => {
    if (selectedEvent) {
      setCustomPayload(JSON.stringify(selectedEvent.defaultPayload, null, 2));
      addToast('info', 'Default Applied', `Used default payload for ${selectedEvent.label}`);
    }
  };

  // Bulk simulate
  const simulateBulk = async (events: EventDefinition[]) => {
    setIsBulkRunning(true);
    let successCount = 0;

    for (const event of events) {
      const payload = event.defaultPayload;
      send(event.type as WsEventType, payload as WsPayload);

      const entry: SimulatedEventHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        definition: event,
        payload,
        success: true,
        timestamp: new Date().toISOString(),
        duration: 0,
      };
      setHistory((prev) => [...prev.slice(-99), entry]);
      successCount++;

      // Small delay for realism
      await new Promise((r) => setTimeout(r, 50));
    }

    setIsBulkRunning(false);
    addToast('success', 'Bulk Complete', `Simulated ${successCount}/${events.length} events`);
  };

  // Run scenario
  const runScenario = (scenarioId: string) => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;

    const events = EVENT_DEFINITIONS.filter((e) => scenario.events.includes(e.type));
    if (events.length > 0) {
      setSelectedEventsForBulk(new Set(events.map((e) => e.id)));
      simulateBulk(events);
    }
  };

  // Clear history
  const clearHistory = () => setHistory([]);

  // Toggle bulk selection
  const toggleBulkSelection = (eventId: string) => {
    setSelectedEventsForBulk((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Event Simulator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse, configure, and simulate all {EVENT_DEFINITIONS.length} WebSocket events
        </p>
      </div>

      {/* Panel tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {([
          {id: 'browser' as const, icon: FolderTree, label: 'Event Browser'},
          {id: 'payload' as const, icon: Code, label: 'Payload Editor'},
          {id: 'history' as const, icon: Clock, label: 'History'},
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activePanel === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <tab.icon className="h-4 w-4"/>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Browser Panel */}
      {activePanel === 'browser' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Event Tree */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <input
                type="text"
                placeholder="Search events by type, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Category tree */}
            <div className="space-y-3">
              {categories.map((group) => (
                <TreeNode
                  key={group.category}
                  {...group}
                  expanded={expandedCategories.has(group.category)}
                  onToggle={() => toggleCategory(group.category)}
                  selectedId={selectedEvent?.id ?? null}
                  onSelect={selectEvent}
                  onSimulate={simulateEvent}
                  searchTerm={searchTerm}
                  eventHistory={history}
                />
              ))}
            </div>
          </div>

          {/* Right sidebar - selected event preview & bulk */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selected event summary */}
            {selectedEvent && (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{selectedEvent.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedEvent.label}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{selectedEvent.type}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{selectedEvent.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => simulateEvent(selectedEvent)}
                    className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-3.5 w-3.5"/>
                    Simulate
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-all"
                  >
                    <X className="h-3.5 w-3.5"/>
                  </button>
                </div>
              </div>
            )}

            {/* Bulk tester */}
            <BulkTester
              selectedEvents={Array.from(selectedEventsForBulk).map(
                (id) => EVENT_DEFINITIONS.find((e) => e.id === id)!,
              ).filter(Boolean)}
              onBulkSimulate={simulateBulk}
              isRunning={isBulkRunning}
            />

            {/* Quick scenarios */}
            <ScenarioRunner onRunScenario={runScenario}/>

            {/* Legend */}
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category Legend
              </h3>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{backgroundColor: cat.color}}
                    />
                    <span className="text-xs text-foreground">{cat.category}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ({cat.events.length} events)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payload Editor Panel */}
      {activePanel === 'payload' && (
        <div className="space-y-6">
          <PayloadEditor
            definition={selectedEvent}
            customPayload={customPayload}
            onPayloadChange={setCustomPayload}
            onApplyDefault={applyDefaultPayload}
          />

          {/* Simulate button */}
          {selectedEvent && (
            <button
              onClick={() => simulateEvent(selectedEvent)}
              className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 text-base font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-3"
            >
              <Play className="h-5 w-5"/>
              Simulate {selectedEvent.label}
              <span className="text-sm font-normal opacity-75">({selectedEvent.type})</span>
            </button>
          )}

          {/* Event tree for quick selection */}
          <div className="rounded-xl border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Quick Event Selection</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-2">
                {EVENT_DEFINITIONS.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer',
                      selectedEvent?.id === event.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50',
                    )}
                    onClick={() => selectEvent(event)}
                  >
                    <span className="text-lg">{event.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{event.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{event.type}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        simulateEvent(event);
                      }}
                      className="rounded-md bg-green-500/15 p-1.5 text-green-500 hover:bg-green-500/25 transition-all"
                    >
                      <Play className="h-3.5 w-3.5"/>
                    </button>
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{backgroundColor: CATEGORY_COLORS[event.category]}}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {activePanel === 'history' && (
        <div className="space-y-6">
          <ExecutionHistory history={history} onClear={clearHistory}/>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-3xl font-bold text-foreground">{history.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Total Simulations</p>
            </div>
            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-3xl font-bold text-green-500">{history.filter((h) => h.success).length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-3xl font-bold text-red-500">{history.filter((h) => !h.success).length}</p>
              <p className="mt-1 text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="rounded-xl border bg-card p-5 text-center">
              <p className="text-3xl font-bold text-foreground">
                {history.length > 0
                  ? Math.round(history.reduce((sum, h) => sum + h.duration, 0) / history.length)
                  : 0}
                ms
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Avg Duration</p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Category Breakdown
            </h3>
            <div className="space-y-3">
              {categories
                .map((cat) => ({
                  ...cat,
                  count: history.filter((h) => h.definition.category === cat.category).length,
                }))
                .filter((c) => c.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="w-16 text-sm font-medium text-foreground">{cat.category}</span>
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max((cat.count / Math.max(history.length, 1)) * 100, 5)}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-mono font-medium text-foreground">
                      {cat.count}
                    </span>
                  </div>
                ))}
              {history.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No history to display
                </p>
              )}
            </div>
          </div>

          {/* Recent entries detail */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Recent Simulations</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {history.slice().reverse().slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      entry.success
                        ? 'bg-green-500/15 text-green-500'
                        : 'bg-red-500/15 text-red-500',
                    )}
                  >
                    {entry.success ? '✓' : '✕'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {entry.definition.icon} {entry.definition.label}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground rounded bg-muted px-1.5">
                        {entry.definition.type}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-[80px]">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <span>{entry.duration}ms</span>
                    </div>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Terminal className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30"/>
                  <p>No simulations yet. Start by selecting an event!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventSimulator;
