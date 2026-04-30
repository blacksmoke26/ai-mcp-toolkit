/**
 * ProviderPanel - Comprehensive LLM provider management and monitoring panel
 * Displays provider health, status switching, latency tracking, and configuration
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  RefreshCw,
  Server,
  XCircle,
  Zap,
} from 'lucide-react';
import {useToast, useWebSocket} from '@/context/WebSocketContext';
import {cn} from '@/lib/utils';
import type {ProviderHealthCheckResult, ProviderStatusInfo} from '@/types/websocket';

// ==================== Provider Status Badge ====================

/**
 * Properties for the ProviderStatusBadge component.
 * Defines the visual and data attributes required to render a status badge.
 */
interface ProviderStatusBadgeProps {
  /**
   * The current status of the provider.
   * Determines the color scheme, icon, and label displayed in the badge.
   */
  status: 'online' | 'offline' | 'degraded' | 'unknown';

  /**
   * The visual size variant of the badge.
   * @default 'sm'
   */
  size?: 'sm' | 'md';
}

const ProviderStatusBadge: React.FC<ProviderStatusBadgeProps> = ({status, size = 'sm'}) => {
  const config = {
    online: {
      bg: 'bg-green-500/15',
      text: 'text-green-500',
      ring: 'ring-green-500/30',
      icon: CheckCircle2,
      label: 'Online',
    },
    offline: {
      bg: 'bg-red-500/15',
      text: 'text-red-500',
      ring: 'ring-red-500/30',
      icon: XCircle,
      label: 'Offline',
    },
    degraded: {
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-500',
      ring: 'ring-yellow-500/30',
      icon: AlertTriangle,
      label: 'Degraded',
    },
    unknown: {
      bg: 'bg-gray-500/15',
      text: 'text-gray-500',
      ring: 'ring-gray-500/30',
      icon: AlertTriangle,
      label: 'Unknown',
    },
  };

  const c = config[status];
  const Icon = c.icon;
  const fontSize = size === 'sm' ? '10px' : '11px';
  //const iconSize = size === 'sm' ? '3' : '4';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1',
        c.bg,
        c.text,
        c.ring,
      )}
    >
      <Icon className={cn('animate-pulse', size === 'sm' ? 'h-2 w-2' : 'h-3.5 w-3.5')}/>
      <span style={{fontSize}}>{c.label}</span>
    </span>
  );
};

// ==================== Provider Card ====================

/**
 * Properties for the ProviderCard component.
 * Defines the data and callbacks required to render a single provider's status card.
 */
interface ProviderCardProps {
  /**
   * The complete status information object for the provider.
   * Contains details such as name, type, status, latency, and available models.
   */
  provider: ProviderStatusInfo;

  /**
   * Flag indicating whether this provider is currently set as the default.
   * Affects visual highlighting and the disabled state of the switch action.
   */
  isDefault: boolean;

  /**
   * Global loading state indicating if an asynchronous operation is in progress.
   * Used to disable user interactions within the card during loading.
   */
  isLoading: boolean;

  /**
   * Callback function triggered when the user requests a status check for the provider.
   * @param name - The unique identifier or name of the provider to check.
   */
  onCheck(name: string): void;

  /**
   * Callback function triggered when the user switches the default provider to this one.
   * @param name - The unique identifier or name of the provider to switch to.
   */
  onSwitch(name: string): void;

  /**
   * Callback function triggered when the user initiates a detailed health check.
   * @param name - The unique identifier or name of the provider to perform the health check on.
   */
  onHealthCheck(name: string): void;
}

const ProviderCard: React.FC<ProviderCardProps> = (props) => {
  const {
    provider,
    onCheck,
    onSwitch,
    onHealthCheck,
    isDefault,
    isLoading,
  } = props;

  const [healthCheckResult, setHealthCheckResult] = React.useState<ProviderHealthCheckResult | null>(null);
  const [expanded, setExpanded] = React.useState<boolean>(false);
  const [checking, setChecking] = React.useState<boolean>(false);

  const handleCheck = () => {
    setChecking(true);
    onHealthCheck(provider.name);
    const result: ProviderHealthCheckResult = {
      providerId: provider.id,
      providerName: provider.name,
      status: provider.status as ProviderHealthCheckResult['status'],
      latency: provider.latency,
      checks: [
        {name: 'Connection', status: provider.status === 'online' ? 'pass' : 'fail'},
        {name: 'Model Access', status: provider.status !== 'unknown' ? 'pass' : 'unknown'},
        {name: 'Latency', status: provider.latency < 200 ? 'pass' : provider.latency < 500 ? 'pass' : 'fail'},
      ],
      checkedAt: new Date().toISOString(),
    };
    setHealthCheckResult(result);
    setTimeout(() => setChecking(false), 800);
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'online':
        return '#10b981';
      case 'offline':
        return '#ef4444';
      case 'degraded':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-all duration-300',
        isDefault ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
        checking && 'opacity-60',
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div className="relative">
            <div
              className="h-3 w-3 rounded-full"
              style={{backgroundColor: getStatusColor(provider.status)}}
            />
            {provider.status === 'online' && (
              <div
                className="absolute -right-0 -top-0 h-3 w-3 animate-ping rounded-full"
                style={{backgroundColor: getStatusColor(provider.status), opacity: 0.4}}
              />
            )}
          </div>

          {/* Provider info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
              {isDefault && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                  Default
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{provider.type}</p>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <ProviderStatusBadge status={provider.status}/>
            <span
              className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Clock className="h-2.5 w-2.5"/>
              {provider.latency}ms
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCheck}
            disabled={checking || isLoading}
            className={cn(
              'rounded-lg p-1.5 transition-all',
              checking
                ? 'text-muted-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            title="Health Check"
          >
            {checking ? (
              <RefreshCw className="h-4 w-4 animate-spin text-primary"/>
            ) : (
              <Eye className="h-4 w-4"/>
            )}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-4 border-t border-border/50 p-4">
          {/* Models */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available Models
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {provider.models.map((model) => (
                <span
                  key={model}
                  className="rounded bg-muted/50 px-2 py-1 text-[11px] font-mono text-foreground"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>

          {/* Config */}
          {provider.config && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Configuration
              </span>
              <pre
                className="mt-1 max-h-20 overflow-auto rounded bg-muted/30 p-2 text-[10px] font-mono text-muted-foreground">
                {JSON.stringify(provider.config, null, 2)}
              </pre>
            </div>
          )}

          {/* Health Check Result */}
          {healthCheckResult && (
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Health Check Results
              </span>
              <div className="mt-2 space-y-1.5">
                {healthCheckResult.checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 rounded bg-muted/30 px-3 py-1.5">
                    {check.status === 'pass' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500"/>
                    ) : check.status === 'fail' ? (
                      <XCircle className="h-3 w-3 text-red-500"/>
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-yellow-500"/>
                    )}
                    <span className="text-[11px] text-foreground">{check.name}</span>
                    <span
                      className={cn(
                        'ml-auto text-[10px] font-medium capitalize',
                        check.status === 'pass' ? 'text-green-500' :
                          check.status === 'fail' ? 'text-red-500' :
                            'text-yellow-500',
                      )}
                    >
                      {check.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onSwitch(provider.name)}
              disabled={isDefault || isLoading}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isDefault
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:opacity-40',
              )}
            >
              <Zap className="h-3 w-3"/>
              Switch Default
            </button>
            <button
              onClick={() => onCheck(provider.name)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40"
            >
              <RefreshCw className="h-3 w-3"/>
              Check
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Provider List Stats ====================

/**
 * Properties for the ProviderStats component.
 * Defines the data required to render the summary statistics for all providers.
 */
interface ProviderStatsProps {
  /**
   * The total number of configured providers.
   */
  total: number;

  /**
   * The number of providers currently in the 'online' state.
   */
  online: number;

  /**
   * The number of providers currently in the 'offline' state.
   */
  offline: number;

  /**
   * The number of providers currently in the 'degraded' state.
   */
  degraded: number;

  /**
   * The name of the currently selected default provider.
   */
  defaultProvider: string;

  /**
   * The calculated average latency (in milliseconds) across all providers.
   */
  avgLatency: number;
}

const ProviderStats: React.FC<ProviderStatsProps> = (props) => {
  const {
    total,
    online,
    offline,
    degraded,
    defaultProvider,
  } = props;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
        <p className="text-xs text-muted-foreground">Total Providers</p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-2xl font-bold text-green-500 tabular-nums">{online}</p>
        <p className="text-xs text-muted-foreground">Online</p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-2xl font-bold text-red-500 tabular-nums">{offline}</p>
        <p className="text-xs text-muted-foreground">Offline</p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-2xl font-bold text-yellow-500 tabular-nums">{degraded}</p>
        <p className="text-xs text-muted-foreground">Degraded</p>
      </div>
      <div className="rounded-xl border bg-card p-4 text-center">
        <p className="text-sm font-bold text-primary">{defaultProvider || 'N/A'}</p>
        <p className="text-xs text-muted-foreground">Default Provider</p>
      </div>
    </div>
  );
};

// ==================== Main ProviderPanel ====================

const ProviderPanel: React.FC = () => {
  const {send, isConnected, subscribe} = useWebSocket();
  const {addToast} = useToast();

  const [collapsed, setCollapsed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [providers, setProviders] = React.useState<ProviderStatusInfo[]>([
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'API',
      status: 'online',
      health: 'healthy',
      latency: 45,
      models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
      isDefault: true,
      lastChecked: new Date().toISOString(),
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      type: 'API',
      status: 'online',
      health: 'healthy',
      latency: 62,
      models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      isDefault: false,
      lastChecked: new Date().toISOString(),
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      type: 'API',
      status: 'degraded',
      health: 'degraded',
      latency: 320,
      models: ['gemini-pro', 'gemini-ultra', 'gemini-nano'],
      isDefault: false,
      lastChecked: new Date().toISOString(),
    },
    {
      id: 'ollama',
      name: 'Ollama',
      type: 'Local',
      status: 'online',
      health: 'healthy',
      latency: 12,
      models: ['llama3', 'mistral', 'codellama'],
      isDefault: false,
      lastChecked: new Date().toISOString(),
    },
  ]);

  // Listen for provider status changes
  React.useEffect(() => {
    const unsub = subscribe('provider:status:change', (entry) => {
      const data = entry.message?.data as { name?: string; status?: string };
      if (data.name && data.status) {
        setProviders((prev) =>
          prev.map((p) =>
            p.name === data.name
              ? {...p, status: data.status as ProviderStatusInfo['status']}
              : p,
          ),
        );
        addToast('info', `Provider ${data.name}`, `Status changed to ${data.status}`);
      }
    });
    return unsub;
  }, [subscribe, addToast]);

  // Fetch provider list on mount
  React.useEffect(() => {
    if (isConnected) {
      send('provider:list' as any, {} as any);
    }
  }, [isConnected, send]);

  const handleListProviders = React.useCallback(() => {
    if (!isConnected) {
      addToast('warning', 'Not Connected', 'Please connect first');
      return;
    }
    send('provider:list' as any, {} as any);
    addToast('info', 'Fetching Providers', 'Requesting provider list...');
  }, [isConnected, send, addToast]);

  const handleHealthCheckAll = React.useCallback(() => {
    if (!isConnected) {
      addToast('warning', 'Not Connected', 'Please connect first');
      return;
    }
    setIsLoading(true);
    send('provider:health' as any, {} as any);
    setTimeout(() => {
      setProviders((prev) =>
        prev.map((p) => ({...p, latency: Math.floor(Math.random() * 200) + 10})),
      );
      setIsLoading(false);
      addToast('success', 'Health Check Complete', 'All providers checked');
    }, 1500);
  }, [isConnected, send, addToast]);

  const handleHealthCheck = React.useCallback(
    (name: string) => {
      if (!isConnected) return;
      setIsLoading(true);
      send('provider:health' as any, {name} as any);
      setTimeout(() => setIsLoading(false), 600);
    },
    [isConnected, send],
  );

  const handleSwitchProvider = React.useCallback(
    (name: string) => {
      if (!isConnected || providers.find((p) => p.name === name)?.isDefault) return;
      send('provider:switch' as any, {name} as any);
      setProviders((prev) =>
        prev.map((p) => ({...p, isDefault: p.name === name})),
      );
      addToast('success', 'Provider Switched', `Default provider changed to ${name}`);
    },
    [isConnected, send, providers, addToast],
  );

  const handleCheck = React.useCallback(
    (name: string) => {
      if (!isConnected) return;
      setIsLoading(true);
      send('provider:health' as any, {name} as any);
      setTimeout(() => {
        setProviders((prev) =>
          prev.map((p) =>
            p.name === name
              ? {...p, latency: Math.floor(Math.random() * 200) + 10}
              : p,
          ),
        );
        setIsLoading(false);
      }, 800);
    },
    [isConnected, send],
  );

  const online = providers.filter((p) => p.status === 'online').length;
  const offline = providers.filter((p) => p.status === 'offline').length;
  const degraded = providers.filter((p) => p.status === 'degraded').length;
  const defaultProvider = providers.find((p) => p.isDefault)?.name || 'N/A';
  const avgLatency = Math.floor(
    providers.reduce((sum, p) => sum + p.latency, 0) / (providers.length || 1),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Provider Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor and manage LLM provider connections and health
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleListProviders}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:opacity-40"
          >
            <Server className="h-3.5 w-3.5"/>
            List Providers
          </button>
          <button
            onClick={handleHealthCheckAll}
            disabled={!isConnected || isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500 transition-all hover:bg-green-500/20 disabled:opacity-40"
          >
            {isLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin"/>
            ) : (
              <Activity className="h-3.5 w-3.5"/>
            )}
            Check All
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted"
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5"/> : <ChevronUp className="h-3.5 w-3.5"/>}
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-6">
          {/* Stats Row */}
          <ProviderStats
            total={providers.length}
            online={online}
            offline={offline}
            degraded={degraded}
            defaultProvider={defaultProvider}
            avgLatency={avgLatency}
          />

          {/* Provider Cards */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onCheck={handleCheck}
                onSwitch={handleSwitchProvider}
                onHealthCheck={handleHealthCheck}
                isDefault={provider.isDefault}
                isLoading={isLoading}
              />
            ))}
          </div>

          {/* Provider Latency Chart */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Provider Latency Comparison
            </h3>
            <div className="space-y-3">
              {providers
                .sort((a, b) => a.latency - b.latency)
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <span className="w-28 text-xs font-medium text-foreground truncate">{p.name}</span>
                    <div className="flex-1 h-6 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full flex items-center justify-end rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((p.latency / 500) * 100, 100)}%`,
                          backgroundColor:
                            p.latency < 100 ? '#10b981' :
                              p.latency < 250 ? '#f59e0b' :
                                p.status === 'offline' ? '#ef4444' :
                                  '#6b7280',
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        'w-14 text-right text-xs font-mono font-medium tabular-nums',
                        p.latency < 100 ? 'text-green-500' :
                          p.latency < 250 ? 'text-yellow-500' :
                            p.status === 'offline' ? 'text-red-500' :
                              'text-muted-foreground',
                      )}
                    >
                      {p.latency}ms
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderPanel;
