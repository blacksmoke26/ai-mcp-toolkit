/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/*
 * <MCPProtocolProvider>
 *   <MCPDashboard />
 * </MCPProtocolProvider>
 * ```
 *
 * Then consume via `useMcpProtocol()` hook.
 */

import * as React from 'react';
import {
  getAvailableMethods,
  getMcpCapabilities,
  getMcpDetailedHealth,
  getMcpStats,
  getMcpVersion,
  sendMcpBatch,
  sendMcpBatchWith,
  sendMcpRequest,
  validateJsonRpcRequest,
} from '@/lib/api';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcValidationResponse,
  McpAvailableMethodsResponse,
  McpBatchOptions,
  McpBatchResponseItem,
  McpCapabilitiesResponse,
  McpDetailedHealthResponse,
  McpStatsResetResponse,
  McpVersionInfo,
} from '@/types/api';

// ================================================================
// Shared Types
// ================================================================

/** Health status string values */
export type HealthStatus = 'ok' | 'error' | 'degraded' | 'unknown';

/** Internal reducer action types */
type McpAction =
  | { type: 'SET_HEALTH'; payload: McpDetailedHealthResponse }
  | { type: 'SET_CAPABILITIES'; payload: McpCapabilitiesResponse }
  | { type: 'SET_VERSION'; payload: McpVersionInfo }
  | { type: 'SET_STATS'; payload: McpStatsResetResponse }
  | { type: 'SET_METHODS'; payload: McpAvailableMethodsResponse }
  | { type: 'SET_VALIDATION'; payload: JsonRpcValidationResponse }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATS' }
  | { type: 'SET_REFRESH_INTERVAL'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean };

/** Shape of the MCP protocol context */
export interface McpProtocolState {
  /** Server health data */
  health: McpDetailedHealthResponse | null;
  /** Server capabilities data */
  capabilities: McpCapabilitiesResponse | null;
  /** Server version info */
  version: McpVersionInfo | null;
  /** Request statistics */
  stats: McpStatsResetResponse | null;
  /** Available MCP methods */
  methods: McpAvailableMethodsResponse | null;
  /** Validation result cache */
  validation: JsonRpcValidationResponse | null;
  /** Last validation input */
  lastValidatedBody: unknown;
  /** Global error message */
  error: string | null;
  /** Whether any data fetching is in progress */
  loading: boolean;
  /** Auto-refresh interval in ms */
  refreshInterval: number;
  /** Auto-refresh enabled */
  autoRefresh: boolean;
}

/** Shape of the MCP protocol context value */
export interface McpProtocolContextValue {
  /** Current state */
  state: McpProtocolState;
  /** Dispatch actions */
  dispatch: React.Dispatch<McpAction>;

  /** Shortcut: get health status string */
  healthStatus: HealthStatus;
  /** Shortcut: get uptime in seconds */
  uptime: number;
  /** Shortcut: check if tools are supported */
  supportsTools: boolean;
  /** Shortcut: check if resources are supported */
  supportsResources: boolean;
  /** Shortcut: check if prompts are supported */
  supportsPrompts: boolean;
  /** Shortcut: check if logging is supported */
  supportsLogging: boolean;
  /** Shortcut: total request count */
  totalRequests: number;
  /** Shortcut: error count */
  errorCount: number;

  /** Fetch health, capabilities, version, stats, and methods */
  refreshAll(): Promise<void>;

  /** Send a single JSON-RPC request */
  sendRequest(req: JsonRpcRequest): Promise<JsonRpcResponse>;

  /** Send a batch JSON-RPC request */
  sendBatch(reqs: JsonRpcRequest[]): Promise<JsonRpcResponse[]>;

  /** Send a batch with advanced options */
  sendBatchWith(reqs: JsonRpcRequest[], options?: McpBatchOptions): Promise<McpBatchResponseItem[]>;

  /** Validate a JSON-RPC request */
  validateRequest(body: unknown): Promise<JsonRpcValidationResponse>;

  /** Reset stats counters */
  resetStats(): Promise<void>;

  /** Clear global error */
  clearError(): void;

  /** Set refresh interval */
  setRefreshInterval(ms: number): void;

  /** Toggle auto-refresh */
  toggleAutoRefresh(): void;
}

// ================================================================
// Context Creation
// ================================================================

const McpProtocolContext = React.createContext<McpProtocolContextValue | null>(null);

// ================================================================
// Reducer
// ================================================================

const initialState: McpProtocolState = {
  health: null,
  capabilities: null,
  version: null,
  stats: null,
  methods: null,
  validation: null,
  lastValidatedBody: null,
  error: null,
  loading: false,
  refreshInterval: 15000,
  autoRefresh: true,
};

function mcpReducer(state: McpProtocolState, action: McpAction): McpProtocolState {
  switch (action.type) {
    case 'SET_HEALTH':
      return {...state, health: action.payload};
    case 'SET_CAPABILITIES':
      return {...state, capabilities: action.payload};
    case 'SET_VERSION':
      return {...state, version: action.payload};
    case 'SET_STATS':
      return {...state, stats: action.payload};
    case 'SET_METHODS':
      return {...state, methods: action.payload};
    case 'SET_VALIDATION':
      return {...state, validation: action.payload, lastValidatedBody: state.lastValidatedBody};
    case 'SET_ERROR':
      return {...state, error: action.payload};
    case 'CLEAR_ERROR':
      return {...state, error: null};
    case 'RESET_STATS':
      return {...state, stats: null};
    case 'SET_REFRESH_INTERVAL':
      return {...state, refreshInterval: action.payload};
    case 'SET_LOADING':
      return {...state, loading: action.payload};
    default:
      return state;
  }
}

// ================================================================
// Provider
// ================================================================

interface McpProtocolProviderProps {
  children: React.ReactNode;
  /** Override auto-refresh interval in ms (default: 15000) */
  refreshInterval?: number;
}

/**
 * `MCPProtocolProvider` wraps all MCP pages with shared state.
 *
 * @param refreshInterval - Optional override for auto-refresh interval
 */
export function McpProtocolProvider({children, refreshInterval: customInterval}: McpProtocolProviderProps) {
  const [state, dispatch] = React.useReducer(mcpReducer, initialState);
  const intervalRef = React.useRef<number | null>(null);

  // --- data fetchers ---

  const refreshAll = React.useCallback(async () => {
    dispatch({type: 'SET_LOADING', payload: true});
    dispatch({type: 'CLEAR_ERROR'});

    const [healthRes, capsRes, verRes, statsRes, methodsRes] = await Promise.allSettled([
      getMcpDetailedHealth(),
      getMcpCapabilities(),
      getMcpVersion(),
      getMcpStats(),
      getAvailableMethods(),
    ]);

    if (healthRes.status === 'fulfilled') {
      dispatch({type: 'SET_HEALTH', payload: healthRes.value});
    }
    if (capsRes.status === 'fulfilled') {
      dispatch({type: 'SET_CAPABILITIES', payload: capsRes.value});
    }
    if (verRes.status === 'fulfilled') {
      dispatch({type: 'SET_VERSION', payload: verRes.value});
    }
    if (statsRes.status === 'fulfilled') {
      dispatch({type: 'SET_STATS', payload: statsRes.value});
    }
    if (methodsRes.status === 'fulfilled') {
      dispatch({type: 'SET_METHODS', payload: methodsRes.value});
    }

    // Capture first rejection as global error
    const errors = [healthRes, capsRes, verRes, statsRes, methodsRes].filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    if (errors.length > 0 && !state.error) {
      dispatch({type: 'SET_ERROR', payload: `Failed to load one or more MCP data sources`});
    }

    dispatch({type: 'SET_LOADING', payload: false});
  }, [state.error]);

  // --- shortcuts ---

  const healthStatus = React.useMemo<HealthStatus>(() => {
    return (state.health?.status || 'unknown') as HealthStatus;
  }, [state.health]);

  const uptime = React.useMemo<number>(() => state.stats?.uptime ?? state.health?.uptime ?? 0, [state.stats, state.health]);

  const supportsTools = React.useMemo(() => state.capabilities?.capabilities.tools.supported ?? false, [state.capabilities]);
  const supportsResources = React.useMemo(() => state.capabilities?.capabilities.resources.supported ?? false, [state.capabilities]);
  const supportsPrompts = React.useMemo(() => state.capabilities?.capabilities.prompts.supported ?? false, [state.capabilities]);
  const supportsLogging = React.useMemo(() => state.capabilities?.capabilities.logging.supported ?? false, [state.capabilities]);

  const totalRequests = React.useMemo(() => state.stats?.totalRequests ?? 0, [state.stats]);
  const errorCount = React.useMemo(() => state.stats?.errorCount ?? 0, [state.stats]);

  // --- action helpers ---

  const sendRequest = React.useCallback(async (req: JsonRpcRequest) => sendMcpRequest(req), []);
  const sendBatch = React.useCallback(async (reqs: JsonRpcRequest[]) => sendMcpBatch(reqs), []);
  const sendBatchWith = React.useCallback(
    async (reqs: JsonRpcRequest[], opts?: McpBatchOptions) => sendMcpBatchWith(reqs, opts),
    [],
  );
  const validateRequest = React.useCallback(async (body: unknown) => {
    const result = await validateJsonRpcRequest(body);
    dispatch({type: 'SET_VALIDATION', payload: result});
    return result;
  }, []);
  const resetStats = React.useCallback(async () => {
    const result = await getMcpStats(true);
    dispatch({type: 'SET_STATS', payload: result});
    dispatch({type: 'RESET_STATS'});
  }, []);
  const clearError = React.useCallback(() => dispatch({type: 'CLEAR_ERROR'}), []);
  const setRefreshInterval = React.useCallback((ms: number) => dispatch({
    type: 'SET_REFRESH_INTERVAL',
    payload: ms,
  }), []);
  const toggleAutoRefresh = React.useCallback(() => dispatch({
    type: 'SET_LOADING',
    payload: !state.autoRefresh,
  }), [state.autoRefresh]);

  // --- auto-refresh effect ---

  React.useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  React.useEffect(() => {
    if (!state.autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const interval = customInterval || state.refreshInterval;
    intervalRef.current = window.setInterval(refreshAll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.autoRefresh, state.refreshInterval, customInterval, refreshAll]);

  const value: McpProtocolContextValue = React.useMemo(
    () => ({
      state,
      dispatch,
      refreshAll,
      sendRequest,
      sendBatch,
      sendBatchWith,
      validateRequest,
      resetStats,
      clearError,
      setRefreshInterval,
      toggleAutoRefresh,
      healthStatus,
      uptime,
      supportsTools,
      supportsResources,
      supportsPrompts,
      supportsLogging,
      totalRequests,
      errorCount,
    }),
    [
      state,
      refreshAll,
      sendRequest,
      sendBatch,
      sendBatchWith,
      validateRequest,
      resetStats,
      clearError,
      setRefreshInterval,
      toggleAutoRefresh,
      healthStatus,
      uptime,
      supportsTools,
      supportsResources,
      supportsPrompts,
      supportsLogging,
      totalRequests,
      errorCount,
    ],
  );

  return <McpProtocolContext.Provider value={value}>{children}</McpProtocolContext.Provider>;
}

// ================================================================
// Hook
// ================================================================

export default McpProtocolContext;
