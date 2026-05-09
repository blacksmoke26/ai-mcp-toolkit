/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {
  Activity,
  BarChart3,
  Database,
  FileText,
  Gauge,
  Layers,
  MemoryStick,
  Monitor,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Wrench,
} from 'lucide-react';
import StatCard from '../parts/StatCard';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/Card';
import CapabilityIndicator from '../parts/CapabilityIndicator';
import ProgressBar from '../parts/ProgressBar';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';
import {formatBytes, formatRelative, formatUptime} from '../utils';

/**
 * DashboardHomeTab shows overview cards, live stats, and quick navigation.
 */
const DashboardHomeTab = () => {
  const {state, healthStatus, uptime, totalRequests, errorCount} = useMcpProtocol();

  const capabilities = state.capabilities;
  const version = state.version;

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground"/>
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Monitor className="h-5 w-5"/>}
            label="Health Status"
            value={healthStatus === 'ok' ? <span className="text-green-500">✓ ok</span> : '✗ error'}
            secondary={state.health?.timestamp ? `Updated: ${formatRelative(state.health.timestamp)}` : 'Unknown'}
            accentColor={healthStatus === 'ok' ? 'text-green-500' : 'text-red-500'}
            bgAccent={healthStatus === 'ok' ? 'bg-green-500/15' : 'bg-red-500/15'}
          />
          <StatCard
            icon={<Gauge className="h-5 w-5"/>}
            label="Uptime"
            value={formatUptime(uptime)}
            secondary="Server running since"
            accentColor="text-blue-500"
            bgAccent="bg-blue-500/15"
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5"/>}
            label="Total Requests"
            value={totalRequests.toLocaleString()}
            secondary={errorCount > 0 ? `Errors: ${errorCount.toLocaleString()}` : 'No errors'}
            accentColor="text-purple-500"
            bgAccent="bg-purple-500/15"
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5"/>}
            label="Protocol"
            value={version?.protocolVersion || '—'}
            secondary={`JSON-RPC ${version?.jsonRpcVersion || '—'}`}
            accentColor="text-orange-500"
            bgAccent="bg-orange-500/15"
          />
        </div>
      </section>

      {/* Capabilities */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground"/>
          Server Capabilities
        </h2>
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground/80 mb-5">
              Available MCP primitives on this server
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <CapabilityIndicator
                icon={<Wrench className="h-5 w-5"/>}
                name="Tools"
                supported={capabilities?.capabilities.tools.supported ?? false}
                details={
                  capabilities?.methods?.filter(m => m.includes('tool')).length
                    ? `${capabilities.methods.filter(m => m.includes('tool')).length} tool methods available`
                    : undefined
                }
              />
              <CapabilityIndicator
                icon={<Database className="h-5 w-5"/>}
                name="Resources"
                supported={capabilities?.capabilities.resources.supported ?? false}
                details={capabilities?.capabilities.resources.subscribe ? 'Subscription supported' : undefined}
              />
              <CapabilityIndicator
                icon={<FileText className="h-5 w-5"/>}
                name="Prompts"
                supported={capabilities?.capabilities.prompts.supported ?? false}
              />
              <CapabilityIndicator
                icon={<Terminal className="h-5 w-5"/>}
                name="Logging"
                supported={capabilities?.capabilities.logging.supported ?? false}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Server Info & Memory */}
      <section>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Server Information */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 px-6 py-5">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="p-2 rounded-lg bg-muted/60">
                  <Server className="h-4 w-4"/>
                </div>
                Server Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              {version ? (
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3 border-b border-muted/30">
                    <span className="text-muted-foreground/80 text-sm">Protocol</span>
                    <code
                      className="bg-muted/50 px-3 py-1 rounded-md text-sm font-mono font-semibold">{version.protocolVersion}</code>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-muted/30">
                    <span className="text-muted-foreground/80 text-sm">JSON-RPC</span>
                    <code
                      className="bg-muted/50 px-3 py-1 rounded-md text-sm font-mono font-semibold">{version.jsonRpcVersion}</code>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-muted-foreground/80 text-sm">Build Date</span>
                    <code className="bg-muted/50 px-3 py-1 rounded-md text-xs font-mono">{version.buildDate}</code>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>
                  Loading server info...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memory Usage */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 px-6 py-5">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="p-2 rounded-lg bg-muted/60">
                  <MemoryStick className="h-4 w-4"/>
                </div>
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-5">
              {state.health?.memory ? (
                <div className="space-y-4">
                  <ProgressBar
                    label="RSS"
                    value={state.health.memory.rss}
                    max={state.health.memory.heapTotal || 1}
                    color="bg-gradient-to-r from-blue-500 to-blue-400"
                  />
                  <ProgressBar
                    label="Heap Used"
                    value={state.health.memory.heapUsed}
                    max={state.health.memory.heapTotal || 1}
                    color="bg-gradient-to-r from-green-500 to-emerald-400"
                  />
                  <div className="flex items-center justify-between py-2 pt-4 border-t border-muted/30">
                    <span className="text-muted-foreground/80 text-sm">Heap Total</span>
                    <span
                      className="font-mono font-semibold text-sm">{formatBytes(state.health.memory.heapTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground/80 text-sm">External</span>
                    <span className="font-mono font-semibold text-sm">{formatBytes(state.health.memory.external)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin"/>
                  Loading memory data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default DashboardHomeTab;
