/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * Compact table-row component for the list view mode of MCP servers.
 * Renders a single server row with status, metadata, hover-reveal actions,
 * and an expandable details sub-row showing full configuration.
 */

import React from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit,
  Eye,
  Loader2,
  Play,
  RefreshCw,
  Square,
  TestTube,
  Trash2,
} from 'lucide-react';

import {Switch} from '@/components/ui/Switch';
import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {ScrollArea, ScrollBar} from '@/components/ui/ScrollArea';
import JsonViewer from '@/components/ui/JsonViewer';
import {Separator} from '@/components/ui/Separator';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/Tooltip';
import StatusBadge from './StatusBadge';
import type {MCPServerResponse} from '@/types/api';
import Checkbox from '@/components/ui/Checkbox';

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/**
 * Props for the ServerRow component.
 */
export interface ServerRowProps {
  /** The MCP server data to display. */
  server: MCPServerResponse;
  /** Whether the server is currently being operated on (start/stop/restart). */
  isOperating: boolean;
  /** Whether the server is currently being tested. */
  isTesting: boolean;
  /** Whether the row is selected. */
  isSelected: boolean;
  /** Callback toggling selection. */
  onSelect: (selected: boolean) => void;
  /** Callback to start the server. */
  onStart: () => void;
  /** Callback to stop the server. */
  onStop: () => void;
  /** Callback to restart the server. */
  onRestart: () => void;
  /** Callback to test the connection. */
  onTestConnection: () => void;
  /** Callback to open the health check dialog. */
  onHealthCheck: () => void;
  /** Callback to open the edit dialog. */
  onEdit: () => void;
  /** Callback to delete the server. */
  onDelete: () => void;
  /** Callback to clone the server. */
  onClone: () => void;
  /** Callback to toggle the enabled state. */
  onToggleEnabled: () => void;
  /** Whether the details section is expanded. */
  isExpanded: boolean;
  /** Callback to toggle the details section. */
  onToggleExpand: () => void;
  /** When true, disables all interactive buttons. */
  isDisabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a timestamp into a human-readable relative or absolute string.
 *
 * @param date - The Date object to format.
 * @returns A formatted string representation of the date.
 */
const formatTimestamp = (date: Date | string | undefined): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Returns a small colored badge label for the transport type.
 *
 * @param type - The server transport type string.
 * @returns A string of Tailwind CSS classes for the type badge.
 */
const getTypeBadgeClasses = (type: string): string => {
  const map: Record<string, string> = {
    stdio: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    sse: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'streamable-http': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  return map[type] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * A compact tooltip-wrapped icon button for the actions column.
 *
 * @param icon - The lucide icon element to render.
 * @param label - The tooltip label text.
 * @param onClick - Click handler.
 * @param disabled - Whether the button is disabled.
 * @param variant - The Button variant.
 */
interface ActionBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  variant?: 'ghost' | 'outline' | 'default' | 'secondary' | 'destructive' | 'link' | null | undefined;
}

const ActionButton: React.FC<ActionBtnProps> = ({ icon, label, onClick, disabled = false, variant = 'ghost' }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150"
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/**
 * Renders the expandable configuration details section below a row.
 *
 * @param server - The server whose details to display.
 * @param isExpanded - Whether the section is currently visible.
 */
const ExpandableDetails: React.FC<{ server: MCPServerResponse; isExpanded: boolean }> = ({
  server,
  isExpanded,
}) => {
  if (!isExpanded) return null;

  return (
    <tr className="border-b border-border/60 bg-muted/20">
      <td colSpan={8} className="p-0">
        <div className="px-6 py-4 space-y-4">
          {/* Config Header */}
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            Configuration Details
          </div>

          <Separator />

          {/* Key-value config grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            <DetailField label="Name" value={server.name} />
            <DetailField label="Display Name" value={server.displayName} />
            <DetailField label="Type" value={server.type} badge={getTypeBadgeClasses(server.type)} />
            <DetailField label="Enabled" value={server.enabled ? 'Yes' : 'No'} />
            <DetailField label="Status" value={server.status} />
            <DetailField label="Timeout" value={`${server.timeout}ms`} />
            <DetailField label="Auto Reconnect" value={server.autoReconnect ? 'Yes' : 'No'} />
            <DetailField
              label="Max Reconnect Attempts"
              value={server.maxReconnectAttempts === -1 ? '∞' : String(server.maxReconnectAttempts)}
            />
            <DetailField label="Reconnect Delay" value={`${server.reconnectDelay}ms`} />
            <DetailField label="Version" value={server.version} />
            <DetailField label="Created" value={formatTimestamp(server.createdAt)} />
            <DetailField label="Updated" value={formatTimestamp(server.updatedAt)} />
            <DetailField
              label="Last Connected"
              value={formatTimestamp(server.lastConnectedAt)}
            />
          </div>

          {/* Connection count & failure count summary row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Connections: <span className="text-foreground">{server.connectionCount}</span>
            </span>
            <span className="font-medium text-foreground">
              Failures: <span className={server.failureCount > 0 ? 'text-red-400' : 'text-foreground'}>
                {server.failureCount}
              </span>
            </span>
            {server.lastError && (
              <span className="font-medium text-red-400">
                Last Error: {server.lastError}
              </span>
            )}
          </div>

          {/* URL */}
          {server.url && (
            <DetailBlock label="URL">
              <code className="text-xs bg-muted px-2 py-1 rounded break-all text-foreground">
                {server.url}
              </code>
            </DetailBlock>
          )}

          {/* Command */}
          {server.command && (
            <DetailBlock label="Command">
              <code className="text-xs bg-muted px-2 py-1 rounded break-all text-foreground">
                {server.command}
              </code>
            </DetailBlock>
          )}

          {/* Arguments (JSON) */}
          {server.args && server.args.length > 0 && (
            <DetailBlock label="Arguments">
              <ScrollArea className="h-32 w-full rounded-md border border-border/40">
                <JsonViewer
                  value={server.args}
                />
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </DetailBlock>
          )}

          {/* Environment variables (JSON) */}
          {server.env && Object.keys(server.env).length > 0 && (
            <DetailBlock label="Environment">
              <ScrollArea className="h-32 w-full rounded-md border border-border/40">
                <JsonViewer
                  value={server.env}
                />
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </DetailBlock>
          )}

          {/* Headers (JSON) */}
          {server.headers && Object.keys(server.headers).length > 0 && (
            <DetailBlock label="Headers">
              <ScrollArea className="h-32 w-full rounded-md border border-border/40">
                <JsonViewer
                  value={server.headers}
                />
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </DetailBlock>
          )}

          {/* Description */}
          {server.description && (
            <DetailBlock label="Description">
              <p className="text-xs text-muted-foreground">{server.description}</p>
            </DetailBlock>
          )}
        </div>
      </td>
    </tr>
  );
};

/**
 * Helper for rendering a key-value detail field in the config grid.
 *
 * @param label - The field label.
 * @param value - The field value.
 * @param badge - Optional badge class string for styled values.
 */
const DetailField: React.FC<{ label: string; value?: string; badge?: string }> = ({
  label,
  value,
  badge,
}) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="text-muted-foreground w-40 shrink-0">{label}:</span>
    {badge
      ? (
        <Badge variant="outline" className={badge}>
          {value}
        </Badge>
      )
      : (
        <span className="font-medium text-foreground truncate">{value ?? '—'}</span>
      )}
  </div>
);

/**
 * Helper for rendering a labelled detail block with a scrollable content area.
 *
 * @param label - The block label.
 * @param children - The content to render.
 */
const DetailBlock: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <span className="text-xs text-muted-foreground">{label}</span>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Renders a compact table row for a single MCP server in list view.
 *
 * Features:
 * - Checkbox for multi-select
 * - Inline status badge with colored dot
 * - Server name, display name, and transport type
 * - Connection count, failure count, last connected timestamp
 * - Hover-reveal action buttons (start, stop, restart, test, health, edit, clone, delete)
 * - Enabled toggle switch
 * - Expandable sub-row with full configuration details using JsonViewer
 *
 * @param props - The ServerRowProps.
 * @returns The rendered ServerRow component.
 */
const ServerRow: React.FC<ServerRowProps> = ({
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
  isExpanded,
  onToggleExpand,
  isDisabled = false,
}) => {
  const operating = isOperating || isDisabled;
  const testRef = isTesting || isDisabled;

  // Quick-enabled toggle visibility
  const enabled = server.enabled;

  return (
    <>
      {/* ─── Main Row ─── */}
      <tr
        className={`group border-b border-border/60 transition-colors duration-150 ${
          isSelected
            ? 'bg-primary/10'
            : 'hover:bg-muted/40'
        } ${!server.enabled ? 'opacity-50' : ''}`}
      >
        {/* Checkbox */}
        <td className="py-2.5 px-4 w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={checked => onSelect(checked)}
          />
        </td>

        {/* Status */}
        <td className="py-2.5 px-2 w-36">
          <StatusBadge status={server.status} />
        </td>

        {/* Name / Display Name / Type */}
        <td className="py-2.5 px-2 min-w-[220px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm text-foreground truncate">{server.displayName}</span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-1.5 py-0 ${getTypeBadgeClasses(server.type)}`}
              >
                {server.type}
              </Badge>
              {enabled && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
                  Enabled
                </Badge>
              )}
              {!enabled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gray-500 border-gray-600">
                  Disabled
                </Badge>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono truncate block">{server.name}</span>
        </td>

        {/* Connections */}
        <td className="py-2.5 px-2 w-28 text-center">
          <span className="text-sm text-foreground font-medium">{server.connectionCount}</span>
        </td>

        {/* Failures */}
        <td className="py-2.5 px-2 w-28 text-center">
          <span className={`text-sm font-medium ${server.failureCount > 0 ? 'text-red-400' : 'text-foreground'}`}>
            {server.failureCount}
          </span>
        </td>

        {/* Last Connected */}
        <td className="py-2.5 px-2 w-40">
          <span className="text-xs text-muted-foreground">{formatTimestamp(server.lastConnectedAt)}</span>
        </td>

        {/* Enabled Toggle */}
        <td className="py-2.5 px-2 w-20 text-center">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mx-auto"
                  onClick={onToggleEnabled}
                  disabled={operating}
                >
                  {operating ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch checked={enabled} onCheckedChange={onToggleEnabled} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {enabled ? 'Disable' : 'Enable'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>

        {/* Actions (hover-reveal) */}
        <td className="py-2.5 px-4 w-48 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150">
            {/* Start */}
            {server.status !== 'connected' && server.enabled && (
              <ActionButton
                icon={operating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                label="Start"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                disabled={operating}
                variant="ghost"
              />
            )}

            {/* Stop */}
            {server.status === 'connected' && (
              <ActionButton
                icon={operating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                label="Stop"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                disabled={operating}
                variant="ghost"
              />
            )}

            {/* Restart */}
            <ActionButton
              icon={operating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              label="Restart"
              onClick={(e) => {
                e.stopPropagation();
                onRestart();
              }}
              disabled={operating}
              variant="ghost"
            />

            {/* Test */}
            <ActionButton
              icon={testRef ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              label="Test Connection"
              onClick={(e) => {
                e.stopPropagation();
                onTestConnection();
              }}
              disabled={testRef}
              variant="ghost"
            />

            {/* Health Check */}
            <ActionButton
              icon={<Activity className="w-4 h-4" />}
              label="Health Check"
              onClick={(e) => {
                e.stopPropagation();
                onHealthCheck();
              }}
              variant="ghost"
            />

            {/* Expand / Collapse */}
            <ActionButton
              icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              variant="ghost"
            />

            {/* Edit */}
            <ActionButton
              icon={<Edit className="w-4 h-4" />}
              label="Edit"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              variant="ghost"
            />

            {/* Clone */}
            <ActionButton
              icon={<Copy className="w-4 h-4" />}
              label="Clone"
              onClick={(e) => {
                e.stopPropagation();
                onClone();
              }}
              variant="ghost"
            />

            {/* Delete */}
            <ActionButton
              icon={operating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              label={server.status === 'connected' ? 'Stop first' : 'Delete'}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={operating || server.status === 'connected'}
              variant="ghost"
            />
          </div>
        </td>
      </tr>

      {/* ─── Expandable Details Row ─── */}
      <ExpandableDetails server={server} isExpanded={isExpanded} />
    </>
  );
};

export default ServerRow;
