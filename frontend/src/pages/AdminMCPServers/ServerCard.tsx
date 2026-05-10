/* eslint-disable react-hooks/refs */
/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * ServerCard.tsx
 *
 * ServerCard component with status badges, hover actions, toggle switch, expandable details, and health indicators.
 */

import React, {useMemo, useRef, useState} from 'react';

import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit,
  Loader2,
  Play,
  RefreshCw,
  Server,
  Square,
  TestTube,
  Trash2,
  XCircle,
} from 'lucide-react';

import {Switch} from '@/components/ui/Switch';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/Card';
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/Alert';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import {Separator} from '@/components/ui/Separator';
import {Label} from '@/components/ui/Label';
import {DocTooltip} from '@/components/ui/DocTooltip';
import {ScrollArea, ScrollBar} from '@/components/ui/ScrollArea';
import JsonViewer from '@/components/ui/JsonViewer';

import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import type {MCPServerResponse, MCPServerStatus, MCPServerType} from '@/types/api';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

interface StatusMeta {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  barColor: string;
  badgeColor: string;
  pulseColor: string;
}

const STATUS_META: Record<MCPServerStatus, StatusMeta> = {
  connected: {
    label: 'Connected',
    icon: <CheckCircle2 className="w-4 h-4"/>,
    variant: 'success',
    barColor: 'from-emerald-500 to-green-400',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pulseColor: '#10b981',
  },
  connecting: {
    label: 'Connecting',
    icon: <Loader2 className="w-4 h-4 animate-spin"/>,
    variant: 'warning',
    barColor: 'from-yellow-500 to-amber-400',
    badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    pulseColor: '#f59e0b',
  },
  disconnected: {
    label: 'Disconnected',
    icon: <XCircle className="w-4 h-4"/>,
    variant: 'outline',
    barColor: 'from-gray-600 to-gray-500',
    badgeColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    pulseColor: '#6b7280',
  },
  error: {
    label: 'Error',
    icon: <AlertCircle className="w-4 h-4"/>,
    variant: 'destructive',
    barColor: 'from-red-600 to-red-500',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    pulseColor: '#ef4444',
  },
};

const TYPE_META: Record<MCPServerType, { label: string; icon: React.ReactNode; iconColor: string }> = {
  stdio: {
    label: 'stdio',
    icon: <TerminalIcon className="w-3.5 h-3.5"/>,
    iconColor: 'text-sky-400',
  },
  sse: {
    label: 'SSE',
    icon: <BroadcastIcon className="w-3.5 h-3.5"/>,
    iconColor: 'text-violet-400',
  },
  'streamable-http': {
    label: 'Streamable HTTP',
    icon: <GlobeIcon className="w-3.5 h-3.5"/>,
    iconColor: 'text-indigo-400',
  },
};

// Small inline icons to avoid import paths
function TerminalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  );
}

function BroadcastIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <path d="M12 20V10"/>
      <path d="M18 20V4"/>
      <path d="M6 20v-4"/>
    </svg>
  );
}

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Timestamp helpers
// ---------------------------------------------------------------------------

function formatTimestamp(date?: Date | string | null): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || seconds < 0) return '—';
  if (seconds === 0) return '0s';
  const units: [number, string][] = [
    [365 * 24 * 3600, 'y'],
    [24 * 3600, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  const parts: string[] = [];
  for (const [secs, label] of units) {
    const val = Math.floor(seconds / secs);
    if (val > 0) {
      parts.push(`${val}${label}`);
      seconds -= val * secs;
    }
  }
  return parts.join(' ') || '0s';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Result from a connectivity test, displayed inline on the card.
 */
interface TestResultInline {
  success: boolean;
  message: string;
}

export interface ServerCardProps {
  /** The server data to display */
  server: MCPServerResponse;
  /** Whether this server is currently being operated on (start/stop/restart) */
  isOperating: boolean;
  /** Whether this server is being tested */
  isTesting: boolean;
  /** Whether this server is selected for bulk operations */
  isSelected: boolean;
  /** Callback when the card is selected/deselected for bulk operations */
  onSelect: (selected: boolean) => void;
  /** Callback to start the server */
  onStart: () => void;
  /** Callback to stop the server */
  onStop: () => void;
  /** Callback to restart the server */
  onRestart: () => void;
  /** Callback to test connectivity */
  onTestConnection: () => void;
  /** Callback to open health check dialog */
  onHealthCheck: () => void;
  /** Callback to edit the server */
  onEdit: () => void;
  /** Callback to delete the server */
  onDelete: () => void;
  /** Callback to clone the server */
  onClone: () => void;
  /** Callback to toggle enable/disable */
  onToggleEnabled: () => void;
  /** Callback to expand/collapse details */
  onToggleExpand: () => void;
  /** Whether the details are expanded */
  isExpanded: boolean;
  /** Whether the card is disabled (e.g., while deleting) */
  isDisabled?: boolean;
  /** Test result from the parent, displayed inline on the card */
  testResult?: TestResultInline | null;
}

// ---------------------------------------------------------------------------
// Action button helper (hover-reveal)
// ---------------------------------------------------------------------------

interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'ghost' | 'destructive' | 'secondary' | 'outline';
  size?: 'sm' | 'icon';
  className?: string;
}

function ActionButton({
                        icon,
                        label,
                        onClick,
                        disabled,
                        loading,
                        variant = 'ghost',
                        size = 'sm',
                        className = '',
                      }: ActionBtnProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || loading}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={`w-8 h-8 p-0 transition-opacity duration-200 ${className}`}
            aria-label={label}
            title={label}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Status badge with optional pulse ring
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: MCPServerStatus;
  pulse?: boolean;
  compact?: boolean;
}

function StatusBadge({status, pulse = false, compact = false}: StatusBadgeProps) {
  const meta = STATUS_META[status];
  const badgeClass = `${meta.badgeColor} ${pulse ? 'animate-pulse' : ''}`;

  return (
    <div className="relative flex items-center gap-1.5">
      {pulse && (
        <span
          className="absolute -top-1 -left-1 w-6 h-6 rounded-full"
          style={{
            boxShadow: `0 0 8px 2px ${meta.pulseColor}40`,
          }}
        />
      )}
      <Badge variant={meta.variant}
             className={`${badgeClass} gap-1 ${compact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}>
        {meta.icon}
        {!compact && meta.label}
      </Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connection health pill
// ---------------------------------------------------------------------------

function HealthPill({server}: { server: MCPServerResponse }) {
  const healthRatio = useMemo(() => {
    const total = server.connectionCount + server.failureCount;
    if (total === 0) return null;
    return ((server.connectionCount / total) * 100).toFixed(1);
  }, [server.connectionCount, server.failureCount]);

  if (server.connectionCount === 0 && server.failureCount === 0) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
            <Activity className="w-3.5 h-3.5"/>
            <span>
              <span className="text-emerald-400 font-semibold">{server.connectionCount}</span> connected ·{' '}
              <span className="text-red-400 font-semibold">{server.failureCount}</span> failures
            </span>
            {healthRatio != null && (
              <span className="ml-1 text-[10px] opacity-60">{healthRatio}% success</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {server.connectionCount} successful connections · {server.failureCount} failures
          {healthRatio != null && ` · ${healthRatio}% success rate`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Expandable content panel
// ---------------------------------------------------------------------------

function ExpandableDetails({server, isExpanded}: Pick<ServerCardProps, 'server' | 'isExpanded'>) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
      style={{maxHeight: isExpanded ? ref.current?.scrollHeight ?? 9999 : 0}}
    >
      <div ref={ref} className="pt-4 space-y-4">
        {/* Configuration */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Configuration</Label>
            <DocTooltip
              content="Full server configuration including transport settings, timeouts, and environment variables."
              variant="info"
            />
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
            <JsonViewer
              value={{
                id: server.id,
                name: server.name,
                displayName: server.displayName,
                description: server.description,
                type: server.type,
                enabled: server.enabled,
                status: server.status,
                ...(server.type === 'stdio' && {
                  command: server.command,
                  args: server.args,
                  env: server.env,
                }),
                ...(server.type !== 'stdio' && {
                  url: server.url,
                  headers: server.headers,
                }),
                timeout: server.timeout,
                autoReconnect: server.autoReconnect,
                maxReconnectAttempts: server.maxReconnectAttempts,
                reconnectDelay: server.reconnectDelay,
                version: server.version,
                lastConnectedAt: formatTimestamp(server.lastConnectedAt),
                connectionCount: server.connectionCount,
                failureCount: server.failureCount,
                createdAt: formatTimestamp(server.createdAt),
                updatedAt: formatTimestamp(server.updatedAt),
              }}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={false}
            />
          </div>
        </div>

        {/* Transport Details */}
        {server.type === 'stdio' && (server.command || server.args || server.env) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-muted-foreground">Command</Label>
            </div>
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 font-mono text-sm">
              <span className="text-sky-400 font-semibold">{server.command}</span>
              {server.args && server.args.length > 0 && (
                <span className="text-muted-foreground"> {' ' + server.args.map((a, i) => (
                  <span key={i} className="text-amber-400 inline-block">{a}</span>
                ))}</span>
              )}
            </div>
            {server.env && Object.keys(server.env).length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Environment Variables</Label>
                <ScrollArea className="max-h-[120px] rounded-lg border border-border/50 bg-muted/20">
                  <div className="p-3 font-mono text-xs space-y-0.5">
                    {Object.entries(server.env).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-sky-400">{key}</span>
                        <span className="text-muted-foreground">=</span>
                        <span className="text-emerald-400">{val}</span>
                      </div>
                    ))}
                  </div>
                  <ScrollBar/>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {server.type !== 'stdio' && server.url && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">URL</Label>
            <div
              className="rounded-lg border border-border/50 bg-muted/20 p-3 font-mono text-sm text-violet-400 break-all">
              {server.url}
            </div>
            {server.headers && Object.keys(server.headers).length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Headers</Label>
                <ScrollArea className="max-h-[120px] rounded-lg border border-border/50 bg-muted/20">
                  <div className="p-3 font-mono text-xs space-y-0.5">
                    {Object.entries(server.headers).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-sky-400">{key}</span>
                        <span className="text-muted-foreground">:</span>
                        <span className="text-emerald-400">{val}</span>
                      </div>
                    ))}
                  </div>
                  <ScrollBar/>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Type: </span>
            <Badge variant="outline" className="text-xs">
              {server.type}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Timeout: </span>
            <span className="font-mono">{server.timeout}ms</span>
          </div>
          <div>
            <span className="text-muted-foreground">Reconnect: </span>
            <span className="font-mono">
              {server.autoReconnect ? `Yes (max ${server.maxReconnectAttempts === -1 ? '∞' : server.maxReconnectAttempts})` : 'No'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Reconnect Delay: </span>
            <span className="font-mono">{server.reconnectDelay}ms</span>
          </div>
          <div>
            <span className="text-muted-foreground">Created: </span>
            <span className="font-mono">{formatTimestamp(server.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Updated: </span>
            <span className="font-mono">{formatTimestamp(server.updatedAt)}</span>
          </div>
          {server.lastConnectedAt && (
            <div>
              <span className="text-muted-foreground">Last Connected: </span>
              <span className="font-mono">{formatTimestamp(server.lastConnectedAt)}</span>
            </div>
          )}
          {server.version && (
            <div>
              <span className="text-muted-foreground">Version: </span>
              <span className="font-mono">{server.version}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ServerCard component
// ---------------------------------------------------------------------------

/**
 * A compact, professional card for displaying a single MCP server with
 * status indicator, hover-reveal action buttons, enable/disable toggle,
 * connection health metrics, and expandable configuration details.
 *
 * @example
 * ```tsx
 * <ServerCard
 *   server={myServer}
 *   isOperating={false}
 *   isTesting={false}
 *   isSelected={false}
 *   onSelect={() => {}}
 *   onStart={() => {}}
 *   onStop={() => {}}
 *   onRestart={() => {}}
 *   onTestConnection={() => {}}
 *   onHealthCheck={() => {}}
 *   onEdit={() => {}}
 *   onDelete={() => {}}
 *   onClone={() => {}}
 *   onToggleEnabled={() => {}}
 *   onToggleExpand={() => {}}
 *   isExpanded={false}
 * />
 * ```
 */
function ServerCard({
                      server,
                      isOperating,
                      isTesting,
                      isSelected,
                      onSelect,
                      onStart,
                      onStop,
                      onRestart,
                      onTestConnection,
                      onHealthCheck,
                      onEdit,
                      onDelete,
                      onClone,
                      onToggleEnabled,
                      onToggleExpand,
                      isExpanded,
                      isDisabled = false,
                      testResult: propTestResult,
                    }: ServerCardProps) {
  const [hovered, setHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const meta = STATUS_META[server.status];
  const typeInfo = TYPE_META[server.type];
  const isOper = isOperating;

  const handleTest = () => {
    onTestConnection();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  return (
    <>
      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Server"
          description={`Are you sure you want to delete "${server.displayName}"? This action cannot be undone.`}
          confirmCaption="Delete"
          cancelCaption="Cancel"
          triggerElement={
            <button className="sr-only">Delete</button>
          }
          onConfirmClick={() => {
            setShowDeleteConfirm(false);
            onDelete();
          }}
          onCancelClick={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Hover-reveal action buttons container */}
      <div
        className="relative w-full group/card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Card
          className={`
            relative overflow-hidden transition-all duration-200
            border-border/50 hover:border-border bg-card/80 hover:bg-card
            ${isSelected ? 'border-l-2 border-l-blue-500 bg-blue-500/5' : ''}
            ${!isSelected ? `border-l-2 border-l-transparent hover:border-l-blue-500` : ''}
          `}
        >
          {/* Gradient header accent bar */}
          <div
            className={`
              h-1 w-full rounded-t-lg
              bg-gradient-to-r ${meta.barColor}
              transition-opacity duration-200
              ${isOper ? 'opacity-50' : 'opacity-70 group-hover/card:opacity-100'}
            `}
          />

          <CardHeader className="pb-3 pt-3 px-4 space-y-2 cursor-pointer" onClick={() => onSelect(!isSelected)}>
            {/* Top row: name, status, enabled toggle */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Selection checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(!isSelected);
                  }}
                  className={`
                    mt-[-16px] w-4 h-4 rounded border border-border flex items-center justify-center
                    transition-colors cursor-pointer
                    ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-transparent hover:bg-muted'}
                  `}
                  aria-label="Select server"
                >
                  {isSelected && <Check className="w-3 h-3 text-white"/>}
                </button>

                {/* Server icon + name */}
                <div className="min-w-0">
                  <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                    <span className="truncate">{server.displayName}</span>
                  </CardTitle>
                  <CardDescription className="text-xs truncate mt-0.5">
                    {server.name}
                    {server.description &&
                      <span className="ml-1 opacity-60 truncate hidden sm:inline">— {server.description}</span>}
                  </CardDescription>
                </div>

                {/* Type badge */}
                <Badge variant="outline" className="text-xs gap-0.5 ml-auto flex-shrink-0">
                  <span className={typeInfo.iconColor}>{typeInfo.icon}</span>
                  {typeInfo.label}
                </Badge>
              </div>
            </div>

            {/* Middle row: status + health + toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge
                status={server.status}
                pulse={server.status === 'connecting'}
                compact
              />
              <HealthPill server={server}/>
              <div className="flex-1"/>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleEnabled();
                      }}
                      disabled={isDisabled}
                      className="flex items-center gap-1.5"
                      aria-label={server.enabled ? 'Disable server' : 'Enable server'}
                    >
                      <Label className="text-xs text-muted-foreground cursor-pointer">
                        {server.enabled ? 'Enabled' : 'Disabled'}
                      </Label>
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => onToggleEnabled()}
                        disabled={isDisabled}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {server.enabled ? 'Disable' : 'Enable'} this server
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CardContent className="px-4 pb-4 space-y-3">
            {/* Expand / Collapse toggle */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
              <span className="text-muted-foreground/60">configuration</span>
            </div>

            {/* Last error */}
            {server.lastError && (
              <Alert variant="destructive" className="py-2 px-3 text-xs border-red-500/30">
                <AlertCircle className="w-3.5 h-3.5"/>
                <AlertTitle className="text-red-400 text-xs">Last Error</AlertTitle>
                <AlertDescription className="text-xs text-red-300/80 truncate">
                  {server.lastError}
                </AlertDescription>
              </Alert>
            )}

            {/* Test result (from parent prop) */}
            {propTestResult && (
              <Alert variant={propTestResult.success ? 'default' : 'destructive'}
                     className="py-2 px-3 text-xs border-border/50 animate-in slide-in-from-top-2">
                {propTestResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400"/>
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400"/>
                )}
                <AlertDescription className="text-xs">
                  <span className={propTestResult.success ? 'text-emerald-400' : 'text-red-400'}>
                    {propTestResult.message}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Separator before details */}
            {isExpanded && <Separator className="bg-border/30"/>}

            {/* Expandable panel */}
            <ExpandableDetails server={server} isExpanded={isExpanded}/>

            {/* Action buttons bar (hover-reveal) */}
            <div
              className={`
                flex items-center gap-1 pt-2 border-t border-border/30
                transition-opacity duration-200
                ${hovered || isExpanded ? 'opacity-100' : 'opacity-0'}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Start */}
              <ActionButton
                icon={<Play className="w-3.5 h-3.5"/>}
                label="Start server"
                onClick={onStart}
                disabled={!server.enabled || isOper || server.status === 'connected'}
                loading={isOper}
                variant="ghost"
                size="icon"
              />

              {/* Stop */}
              <ActionButton
                icon={<Square className="w-3.5 h-3.5"/>}
                label="Stop server"
                onClick={onStop}
                disabled={!isOper || server.status !== 'connected'}
                loading={isOper}
                variant="ghost"
                size="icon"
              />

              {/* Restart */}
              <ActionButton
                icon={<RefreshCw className="w-3.5 h-3.5"/>}
                label="Restart server"
                onClick={onRestart}
                disabled={isOper}
                loading={isOper}
                variant="ghost"
                size="icon"
              />

              <Separator className="mx-1 bg-border/30"/>

              {/* Test */}
              <ActionButton
                icon={<TestTube className="w-3.5 h-3.5"/>}
                label="Test connection"
                onClick={handleTest}
                disabled={isTesting || !propTestResult}
                loading={isTesting}
                variant={propTestResult ? (propTestResult.success ? 'default' : 'destructive') : 'ghost'}
                size="icon"
              />

              {/* Health */}
              <ActionButton
                icon={<Activity className="w-3.5 h-3.5"/>}
                label="Health check"
                onClick={onHealthCheck}
                disabled={isDisabled}
                variant="ghost"
                size="icon"
              />

              <Separator className="mx-1 bg-border/30"/>

              {/* Edit */}
              <ActionButton
                icon={<Edit className="w-3.5 h-3.5"/>}
                label="Edit server"
                onClick={onEdit}
                disabled={isDisabled}
                variant="ghost"
                size="icon"
              />

              {/* Clone */}
              <ActionButton
                icon={<Copy className="w-3.5 h-3.5"/>}
                label="Clone server"
                onClick={onClone}
                disabled={isDisabled}
                variant="ghost"
                size="icon"
              />

              <Separator className="mx-1 bg-border/30"/>

              {/* Delete */}
              <ActionButton
                icon={<Trash2 className="w-3.5 h-3.5"/>}
                label="Delete server"
                onClick={handleDelete}
                disabled={isDisabled}
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300"
              />

              {/* Spacer */}
              <div className="flex-1"/>

              {/* Status icon (always visible) */}
              <div
                className={`flex items-center gap-1 text-xs ${hovered ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: meta.pulseColor,
                    boxShadow: server.status === 'connecting' ? `0 0 6px 2px ${meta.pulseColor}60` : undefined,
                  }}
                />
                <span className="text-muted-foreground/70">{meta.label}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Named & default exports
// ---------------------------------------------------------------------------

export {ServerCard};
export default ServerCard;
