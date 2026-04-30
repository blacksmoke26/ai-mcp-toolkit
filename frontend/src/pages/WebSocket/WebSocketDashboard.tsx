/**
 * WebSocketDashboard - Main dashboard component with stats, event feed, and controls
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  LayoutGrid,
  MessageSquare,
  Minimize2,
  Plug,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import {useToast, useWebSocket} from '@/context/WebSocketContext';
import {
  ALL_ROOMS,
  CATEGORY_COLORS,
  CATEGORY_EMOJI,
  type EventCategory,
  type EventDirection,
  type EventFiltersState,
  type WsEventType,
} from '@/types/websocket';
import {QUICK_ACTIONS} from '@/lib/event-definitions';
import {cn} from '@/lib/utils';

// ==== ==================== StatsCard ====================

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, subtitle, trend, className }) => {
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
        pulse && 'animate-pulse',
        className,
      )}
    >
      {/* Gradient accent */}
      <div
        className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-xl"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-center gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color }}>
            {typeof value === 'number' ? (value.toLocaleString() as string) : value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {trend && (
          <div className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full',
            trend === 'up' ? 'bg-green-500/15 text-green-500' :
            trend === 'down' ? 'bg-red-500/15 text-red-500' :
            'bg-muted text-muted-foreground',
          )}>
            {trend === 'up' ? <ChevronUp className="h-3.5 w-3.5" /> :
             trend === 'down' ? <ChevronDown className="h-3.5 w-3.5" /> :
             <Minimize2 className="h-3.5 w-3.5" />}
          </div>
        )}
      </div>
    </div>
  );
};

// ==== ==================== ConnectionStatusBadge ====================

const ConnectionStatusBadge: React.FC = () => {
  const { status, latency, connectedClients } = useWebSocket();

  const config = React.useMemo(() => {
    switch (status) {
      case 'connected':
        return { color: '#10b981', label: 'Connected', dot: true };
      case 'connecting':
        return { color: '#f59e0b', label: 'Connecting...', dot: true };
      case 'error':
        return { color: '#ef4444', label: 'Error', dot: true };
      default:
        return { color: '#6b7280', label: 'Disconnected', dot: false };
    }
  }, [status]);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
      {/* Animated dot */}
      <div className="relative">
        {config.dot && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: config.color }}
          />
        )}
        <span
          className="relative inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
      </div>
      <span className="text-sm font-medium text-foreground">{config.label}</span>

      {status === 'connected' && (
        <>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xs text-muted-foreground">{latency}ms</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xs text-muted-foreground">{connectedClients} clients</span>
        </>
      )}
    </div>
  );
};

// ==== ==================== ConnectionControls ====================

const ConnectionControls: React.FC = () => {
  const {
    isConnected,
    isConnecting,
    isDisconnected,
    connect,
    disconnect,
    ping,
    forceReconnect,
    authenticate,
  } = useWebSocket();
  const { addToast } = useToast();

  const handlePing = () => {
    const t = ping();
    if (t !== null) {
      addToast('info', 'Ping Sent', `Ping sent at ${new Date(t).toLocaleTimeString()}`);
    } else {
      addToast('error', 'Ping Failed', 'WebSocket not connected');
    }
  };

  const handleConnect = () => {
    connect();
    addToast('success', 'Connecting', 'Establishing WebSocket connection...');
  };

  const handleDisconnect = () => {
    disconnect(1000, 'Manual disconnect');
    addToast('warning', 'Disconnected', 'WebSocket connection closed');
  };

  const handleAuth = () => {
    const token = 'mock-jwt-token-' + Date.now();
    authenticate(token, 'jwt');
    addToast('success', 'Authenticated', 'Authenticated with mock JWT token');
  };

  const handleReconnect = () => {
    forceReconnect();
    addToast('info', 'Reconnecting', 'Attempting to reconnect...');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isConnected && (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 disabled:opacity-50"
        >
          <Wifi className="h-4 w-4" />
          Connect
        </button>
      )}

      {isConnected && (
        <>
          <button
            onClick={handlePing}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-500 transition-all hover:bg-blue-500/20"
          >
            <Zap className="h-4 w-4" />
            Ping
          </button>
          <button
            onClick={handleDisconnect}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20"
          >
            <WifiOff className="h-4 w-4" />
            Disconnect
          </button>
        </>
      )}

      {isDisconnected && !isConnected && (
        <button
          onClick={handleReconnect}
          className="inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-500 transition-all hover:bg-orange-500/20"
        >
          <RefreshCw className="h-4 w-4" />
          Reconnect
        </button>
      )}

      <button
        onClick={handleAuth}
        className="inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-500 transition-all hover:bg-purple-500/20"
      >
        <Plug className="h-4 w-4" />
        Authenticate
      </button>
    </div>
  );
};

// ==== ==================== RoomManager ====================

const RoomManager: React.FC = () => {
  const { rooms: activeRooms, joinRoom, leaveRoom } = useWebSocket();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="rounded-xl border bg-card p-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Rooms ({activeRooms.length}/{ALL_ROOMS.length})
        </h3>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_ROOMS.map((room) => {
            const isActive = activeRooms.includes(room);
            return (
              <button
                key={room}
                onClick={() => (isActive ? leaveRoom(room) : joinRoom(room))}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-green-500/15 text-green-500 ring-1 ring-green-500/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', isActive ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                {room}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==== ==================== QuickActionsPanel ====================

const QuickActionsPanel: React.FC = () => {
  const { send } = useWebSocket();
  const { addToast } = useToast();
  const [collapsed, setCollapsed] = React.useState(false);

  const handleAction = (def: (typeof QUICK_ACTIONS)[0]) => {
    send(def.type as WsEventType, def.defaultPayload as any);
    addToast('success', def.label, `Simulated ${def.type}`);
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quick Actions ({QUICK_ACTIONS.length})
          </h3>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((def) => (
            <button
              key={def.id}
              onClick={() => handleAction(def)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <span>{def.icon}</span>
              <span>{def.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==== ==================== EventFilterControls ====================

/**
 * Properties for the EventFilterControls component.
 * This component manages the filtering and clearing of the event log.
 */
interface EventFilterControlsProps {
  /**
   * The current state of the event filters.
   * Includes search terms, category selections, and direction preferences.
   */
  filters: EventFiltersState;

  /**
   * Dispatcher function to update the filter state.
   * Accepts either a new state object or an updater function.
   */
  setFilters: React.Dispatch<React.SetStateAction<EventFiltersState>>;

  /**
   * The total count of events currently in the log.
   * Used to display the event count to the user.
   */
  totalEvents: number;

  /**
   * Callback function to clear the event log.
   * Resets the displayed events and internal log state.
   */
  clearEventLog(): void;
}

const EventFilterControls: React.FC<EventFilterControlsProps> = ({ filters, setFilters, totalEvents, clearEventLog }) => {
  const [showFilters, setShowFilters] = React.useState(true);

  const handleClear = () => {
    clearEventLog();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search events..."
          value={filters.searchTerm}
          onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all',
          showFilters ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground',
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        <ChevronDown className={cn('h-3 w-3 transition-transform', showFilters && 'rotate-180')} />
      </button>

      {/* Clear */}
      <button
        onClick={handleClear}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
        Clear
      </button>

      {/* Event count */}
      <span className="text-xs text-muted-foreground">
        {totalEvents} events logged
      </span>
    </div>
  );
};

// ==== ==================== EventRow ====================

/**
 * Properties for the EventRow component.
 * Represents a single row in the event feed, displaying details about a WebSocket event.
 */
interface EventRowProps {
  /**
   * The event object containing all relevant data for display.
   */
  event: {
    /**
     * The type of the event (e.g., 'message', 'notification').
     */
    type: string;

    /**
     * The category of the event (e.g., 'system', 'user', 'error').
     */
    category: EventCategory;

    /**
     * The direction of the event relative to the client.
     */
    direction: EventDirection;

    /**
     * The ISO 8601 timestamp string indicating when the event occurred.
     */
    timestamp: string;

    /**
     * The raw payload data associated with the event.
     */
    data: unknown;

    /**
     * Flag indicating whether the event should be visually highlighted.
     */
    highlighted: boolean;
  };
}

const EventRow: React.FC<EventRowProps> = React.memo(({ event }) => {
  const color = CATEGORY_COLORS[event.category] || '#6b7280';
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <div
      className={cn(
        'group border-b border-border/50 px-4 py-2.5 transition-colors hover:bg-muted/30',
        event.highlighted && 'bg-yellow-500/10',
      )}
    >
      <div className="flex items-center gap-3">
        {/* Direction indicator */}
        <div
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold uppercase',
            event.direction === 'inbound' ? 'bg-blue-500/15 text-blue-500' :
            event.direction === 'outbound' ? 'bg-green-500/15 text-green-500' :
            'bg-muted text-muted-foreground',
          )}
        >
          {event.direction === 'inbound' ? '→' : event.direction === 'outbound' ? '←' : '⚙'}
        </div>

        {/* Timestamp */}
        <span className="flex-shrink-0 text-[11px] font-mono text-muted-foreground tabular-nums">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>

        {/* Category badge */}
        <span
          className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: color, opacity: 0.85 }}
        >
          {event.category}
        </span>

        {/* Event type */}
        <span className="flex-1 truncate text-xs font-mono font-medium text-foreground">
          {event.type}
        </span>

        {/* Data preview */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex-shrink-0 text-muted-foreground transition-opacity hover:text-foreground"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Expanded payload */}
      {!collapsed && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-background/80 p-3 text-[11px] leading-relaxed text-muted-foreground font-mono">
          {JSON.stringify(event.data, null, 2)}
        </pre>
      )}
    </div>
  );
});

// ==== ==================== EventFeed ====================

/**
 * Properties for the EventFeed component.
 * This component displays a scrollable list of WebSocket events with filtering capabilities.
 */
interface EventFeedProps {
  /**
   * The array of events to display in the feed.
   * Each event object contains metadata about the WebSocket message.
   */
  events: {
    /**
     * The type of the event (e.g., 'message', 'notification').
     * Corresponds to the event type string sent or received via WebSocket.
     */
    type: string;

    /**
     * The category of the event (e.g., 'system', 'user', 'error').
     * Used for visual grouping and color coding.
     */
    category: EventCategory;

    /**
     * The direction of the event relative to the client.
     * 'inbound' indicates a message received from the server.
     * 'outbound' indicates a message sent to the server.
     */
    direction: EventDirection;

    /**
     * The ISO 8601 timestamp string indicating when the event occurred.
     */
    timestamp: string;

    /**
     * The raw payload data associated with the event.
     * Can be any JSON-serializable structure.
     */
    data: unknown;

    /**
     * Flag indicating whether the event should be visually highlighted.
     * Often used to draw attention to errors or specific user actions.
     */
    highlighted: boolean;
  }[];

  /**
   * Callback function invoked when the user modifies the filter criteria.
   * Receives a partial object containing the updated filter fields.
   *
   * @param filters - An object containing the changed filter properties.
   */
  onFilterChange(filters: Partial<EventFiltersState>): void;
}

const EventFeed: React.FC<EventFeedProps> = ({ events, onFilterChange }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [filters, setFilters] = React.useState({
    type: '',
    category: 'all' as EventCategory | 'all',
    direction: 'all' as EventDirection | 'all',
  });
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [expandedEvent, setExpandedEvent] = React.useState<string | null>(null);
  const isNearBottom = React.useRef(true);

  // Auto-scroll
  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);

  // Track scroll position
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const threshold = 80;
      isNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const filtered = React.useMemo(() => {
    return events.filter((ev) => {
      if (filters.type && !ev.type.includes(filters.type)) return false;
      if (filters.category !== 'all' && ev.category !== filters.category) return false;
      if (filters.direction !== 'all' && ev.direction !== filters.direction) return false;
      return true;
    });
  }, [events, filters]);

  const toggleCategoryFilter = (cat: EventCategory | 'all') => {
    setFilters((f) => ({ ...f, category: cat }));
    onFilterChange({ category: cat });
  };

  const toggleDirectionFilter = (dir: EventDirection | 'all') => {
    setFilters((f) => ({ ...f, direction: dir }));
    onFilterChange({ direction: dir });
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Live Event Feed
          <span className="ml-2 text-xs text-muted-foreground">({filtered.length} / {events.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'rounded-md px-2 py-1 text-xs font-medium transition-all',
              autoScroll ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            Auto-scroll
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="border-b border-border/50 px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {['all', ...Object.keys(CATEGORY_COLORS) as EventCategory[]].map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategoryFilter(cat as EventCategory | 'all')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                filters.category === cat ? 'ring-1 ring-current opacity-100' : 'opacity-50 hover:opacity-75',
              )}
              style={cat !== 'all' ? { color: CATEGORY_COLORS[cat as EventCategory], backgroundColor: `${CATEGORY_COLORS[cat as EventCategory]}12` } : {}}
            >
              {cat === 'all' ? 'All' : `${CATEGORY_EMOJI[cat as EventCategory]} ${cat}`}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {(['all', 'inbound', 'outbound'] as (EventDirection | 'all')[]).map((dir) => (
            <button
              key={dir}
              onClick={() => toggleDirectionFilter(dir)}
              className={cn(
                'rounded px-2 py-0.5 text-[11px] font-medium transition-all',
                filters.direction === dir ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
              )}
            >
              {dir === 'all' ? 'All' : dir === 'inbound' ? '↓ Inbound' : '↑ Outbound'}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="max-h-[400px] min-h-[200px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No events to display</p>
            <p className="mt-1 text-xs text-muted-foreground/60">Events will appear here when connected</p>
          </div>
        ) : (
          filtered.map((ev) => (
            <div key={ev.timestamp + ev.type}>
              <EventRow
                event={{
                  ...ev,
                  timestamp: typeof ev.timestamp === 'string' ? ev.timestamp : new Date(ev.timestamp).toISOString(),
                  data: ev.data ?? {},
                  highlighted: ev.highlighted || expandedEvent === ev.type,
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ==== ==================== MiniMetricsBar ====================

const MiniMetricsBar: React.FC<{
  label: string;
  value: number;
  max: number;
  color: string;
}> = ({ label, value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ==== ==================== MiniSparkline ====================

const MiniSparkline: React.FC<{
  data: number[];
  color: string;
  height?: number;
  width?: number;
}> = ({ data, color, height = 30, width = 120 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// ==== ==================== LatencyGauge ====================

const LatencyGauge: React.FC<{ latency: number }> = ({ latency }) => {
  const getColor = (l: number) => {
    if (l < 50) return '#10b981';
    if (l < 150) return '#f59e0b';
    return '#ef4444';
  };
  const color = getColor(latency);
  const pct = Math.min((latency / 500) * 100, 100);

  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" />
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 125.6} 125.6`}
          className="transition-all duration-500"
        />
        <text x="50" y="48" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">
          {latency}ms
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">Latency</p>
    </div>
  );
};

// ==== ==================== WebSocketDashboard (Main) ====================

const WebSocketDashboard: React.FC = () => {
  const {
    state,
    isConnected,
    isConnecting,
    isDisconnected,
    latency,
    connectedClients,
    rooms,
    activeRoomCount,
    totalEvents,
    eventsPerSecond,
    eventLog,
    filteredEvents,
    filters,
    setFilters,
    clearEventLog,
    dashboardStats,
  } = useWebSocket();
  const [showStats, setShowStats] = React.useState(true);
  const [showFilters, setShowFilters] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'events' | 'metrics'>('overview');
  const [eventFeedExpanded, setEventFeedExpanded] = React.useState(true);

  const eventsPerSecondHistory = React.useRef<number[]>([]);

  // Simulated sparkline data
  const [sparkData, setSparkData] = React.useState<number[]>([]);
  const [cpuData, setCpuData] = React.useState<number[]>([]);
  const [memData, setMemData] = React.useState<number[]>([]);

  // Update sparkline data periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSparkData((prev) => {
        const next = [...prev, eventsPerSecond || Math.floor(Math.random() * 50 + 10)];
        if (next.length > 60) next.shift();
        return next;
      });
      setCpuData((prev) => {
        const next = [...prev, Math.floor(Math.random() * 40 + 10)];
        if (next.length > 60) next.shift();
        return next;
      });
      setMemData((prev) => {
        const next = [...prev, Math.floor(Math.random() * 30 + 20)];
        if (next.length > 60) next.shift();
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [eventsPerSecond]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            WebSocket Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time monitoring of WebSocket connections, events, and system health
          </p>
        </div>
        <ConnectionStatusBadge />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(['overview', 'events', 'metrics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'overview' && <LayoutGrid className="h-4 w-4" />}
            {tab === 'events' && <MessageSquare className="h-4 w-4" />}
            {tab === 'metrics' && <BarChart3 className="h-4 w-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Connection Controls */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Connection Controls
            </h3>
            <ConnectionControls />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Connected Clients"
              value={connectedClients}
              icon={Users}
              color="#3b82f6"
              trend={connectedClients > 0 ? 'up' : 'stable'}
            />
            <StatsCard
              title="Active Rooms"
              value={`${activeRoomCount}/${ALL_ROOMS.length}`}
              icon={LayoutGrid}
              color="#8b5cf6"
              subtitle={`${activeRoomCount} of ${ALL_ROOMS.length} rooms`}
            />
            <StatsCard
              title="Events/sec"
              value={eventsPerSecond}
              icon={Zap}
              color="#10b981"
              trend={eventsPerSecond > 10 ? 'up' : 'stable'}
              subtitle={`${totalEvents.toLocaleString()} total events`}
            />
            <StatsCard
              title="Avg Latency"
              value={`${latency}ms`}
              icon={Clock}
              color={latency < 100 ? '#10b981' : latency < 200 ? '#f59e0b' : '#ef4444'}
              subtitle={latency < 50 ? 'Excellent' : latency < 150 ? 'Good' : 'High'}
            />
          </div>

          {/* Quick Actions */}
          <QuickActionsPanel />

          {/* Room Manager */}
          <RoomManager />

          {/* Latency Gauge + Sparkline */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Latency Monitor
              </h3>
              <LatencyGauge latency={latency} />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Events/sec Trend
              </h3>
              <div className="h-[80px]">
                <MiniSparkline data={sparkData} color="#3b82f6" height={60} width={300} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last 60 samples · Updated every 2s
              </p>
            </div>
          </div>

          {/* System Resources */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              System Resources
            </h3>
            <div className="space-y-4">
              <MiniMetricsBar label="CPU Usage" value={cpuData[cpuData.length - 1] || 0} max={100} color="#8b5cf6" />
              <MiniMetricsBar label="Memory Usage" value={memData[memData.length - 1] || 0} max={100} color="#06b6d4" />
              <MiniMetricsBar label="Request Rate" value={eventsPerSecond || 0} max={100} color="#10b981" />
            </div>
          </div>

          {/* Connection State Info */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Connection Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-medium text-foreground capitalize">{state.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">URL</dt>
                  <dd className="font-mono text-xs text-foreground truncate max-w-[200px]">{state.url}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Authenticated</dt>
                  <dd className="font-medium text-foreground">{state.isAuthenticated ? '✅ Yes' : '❌ No'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Reconnect Attempts</dt>
                  <dd className="font-medium text-foreground">{state.reconnectAttempts}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Queued Messages</dt>
                  <dd className="font-medium text-foreground">{state.messageQueue?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className={state.lastError ? 'text-red-500' : 'text-green-500'}>
                    {state.lastError ?? 'None'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Stats
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{totalEvents}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{rooms.length}</p>
                  <p className="text-xs text-muted-foreground">Active Rooms</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{latency}ms</p>
                  <p className="text-xs text-muted-foreground">Last Latency</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {eventsPerSecond}
                  </p>
                  <p className="text-xs text-muted-foreground">Events/sec</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <EventFilterControls
            filters={filters}
            setFilters={setFilters}
            totalEvents={eventLog.length}
            clearEventLog={clearEventLog}
          />
          <button
            onClick={() => setEventFeedExpanded(!eventFeedExpanded)}
            className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3"
          >
            <span className="text-sm font-semibold text-foreground">
              Live Event Stream
              <span className="ml-2 text-xs text-muted-foreground">({filteredEvents.length})</span>
            </span>
            {eventFeedExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {eventFeedExpanded && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <EventFeed
                events={filteredEvents.map((e) => ({
                  type: e.type,
                  category: e.category,
                  direction: e.direction,
                  timestamp: e.loggedAt,
                  data: e.message?.data ?? e.rawJson,
                  highlighted: e.highlighted,
                }))}
                onFilterChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
              />
            </div>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sparklines */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Events/sec Trend
              </h3>
              <div className="flex h-[100px] items-end gap-1">
                {sparkData.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-blue-500/40 transition-all hover:bg-blue-500/60"
                    style={{
                      height: `${Math.max((v / Math.max(...sparkData, 1)) * 80, 2)}px`,
                    }}
                    title={`${v} events`}
                  />
                ))}
                {sparkData.length === 0 && (
                  <div className="flex flex-1 items-center justify-center text-muted-foreground/60">
                    No data yet
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Last 60 samples · Auto-updating</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                CPU Usage
              </h3>
              <div className="flex h-[100px] items-end gap-1">
                {cpuData.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-purple-500/40 transition-all hover:bg-purple-500/60"
                    style={{
                      height: `${v * 0.8}px`,
                    }}
                    title={`${v}%`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Simulated data</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Memory Usage
              </h3>
              <div className="flex h-[100px] items-end gap-1">
                {memData.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-cyan-500/40 transition-all hover:bg-cyan-500/60"
                    style={{
                      height: `${v * 0.8}px`,
                    }}
                    title={`${v}%`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Simulated data</p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Latency Distribution
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'P50', value: Math.floor(latency * 0.5 + Math.random() * 20), color: '#10b981' },
                  { label: 'P95', value: Math.floor(latency * 1.5 + Math.random() * 40), color: '#f59e0b' },
                  { label: 'P99', value: Math.floor(latency * 2.5 + Math.random() * 80), color: '#ef4444' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-medium text-muted-foreground">{item.label}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.value / 5, 100)}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs font-mono font-medium text-foreground">
                      {item.value}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketDashboard;
export { WebSocketDashboard, StatsCard, ConnectionStatusBadge, ConnectionControls, RoomManager, QuickActionsPanel, EventFeed, EventRow, LatencyGauge, MiniSparkline, MiniMetricsBar, EventFilterControls };
