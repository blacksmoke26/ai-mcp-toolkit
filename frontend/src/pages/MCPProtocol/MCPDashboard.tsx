/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module pages/MCPDashboard
 * @description Unified MCP Protocol Dashboard providing a central hub for all MCP
 *              protocol interactions including health monitoring, capabilities browsing,
 *              request execution, statistics, and validation.
 *
 * @example
 * ```tsx
 * import {MCPDashboard} from '@/pages/MCPProtocol';
 *
 * function App() {
 *   return (
 *     <McpProtocolProvider>
 *       <MCPDashboard />
 *     </McpProtocolProvider>
 *   );
 * }
 * ```
 */

import * as React from 'react';
import {useMemo, useState} from 'react';
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Layers,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Wrench,
  Zap,
} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/Tabs';
import {Separator} from '@/components/ui/Separator';
import {Switch} from '@/components/ui/Switch';
import {Label} from '@/components/ui/Label';
import McpProtocolContext, {McpProtocolProvider} from './MCPContext';
import {MCPTools} from './MCPTools';
import {MCPCallTool} from './MCPCallTool';
import MCPInfo from './MCPInfo';
import {MCPSSE} from './MCPSSE';
import LiveStatsMini from './parts/LiveStatsMini';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';

import BatchTab from '@/pages/MCPProtocol/tabs/BatchTab';
import StatsTab from '@/pages/MCPProtocol/tabs/StatsTab';
import RequestTab from '@/pages/MCPProtocol/tabs/RequestTab';
import ValidateTab from '@/pages/MCPProtocol/tabs/ValidateTab';
import CapabilitiesTab from '@/pages/MCPProtocol/tabs/CapabilitiesTab';
import DashboardHomeTab from '@/pages/MCPProtocol/tabs/DashboardHomeTab';

const TAB_ICONS: Record<string, React.ReactNode> = {
  dashboard: <Monitor className="h-4 w-4"/>,
  tools: <Wrench className="h-4 w-4"/>,
  call: <Zap className="h-4 w-4"/>,
  request: <Zap className="h-4 w-4"/>,
  batch: <Layers className="h-4 w-4"/>,
  capabilities: <ShieldCheck className="h-4 w-4"/>,
  validate: <CheckCircle2 className="h-4 w-4"/>,
  stats: <BarChart3 className="h-4 w-4"/>,
  sse: <Terminal className="h-4 w-4"/>,
  info: <Bot className="h-4 w-4"/>,
};

// ======================== Main Dashboard ========================

/**
 * MCPDashboard is the unified entry point for all MCP Protocol features.
 *
 * Provides a tabbed interface with:
 * - Dashboard overview with live stats
 * - Tools browser and tester
 * - Call tool executor
 * - JSON-RPC request executor
 * - Advanced batch executor
 * - Capabilities browser
 * - Request validator
 * - Statistics dashboard
 * - SSE stream viewer
 * - Protocol information
 */
const MCPDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check if we are inside an outer McpProtocolProvider
  const outerContext = React.useContext(McpProtocolContext);
  const hasProvider = !!outerContext;

  const dashboardContent = (
    <MCPDashboardInner
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      autoRefresh={autoRefresh}
      setAutoRefresh={setAutoRefresh}
    />
  );

  // If no outer provider exists, wrap with our own so sub-components work
  if (!hasProvider) {
    return <McpProtocolProvider>{dashboardContent}</McpProtocolProvider>;
  }

  return dashboardContent;
};

interface MCPDashboardInner {
  activeTab: string;
  autoRefresh: boolean;

  setActiveTab(tab: string): void;

  setAutoRefresh(v: boolean): void;
}

/**
 * Inner dashboard that assumes a provider exists in the tree.
 * Rendered either directly (when outer provider exists) or wrapped in <McpProtocolProvider>.
 */
const MCPDashboardInner = (props: MCPDashboardInner) => {
  const {activeTab, setActiveTab, autoRefresh, setAutoRefresh} = props;

  const {state, refreshAll, healthStatus} = useMcpProtocol();

  const tabs = useMemo(() => [
    {id: 'dashboard', label: 'Dashboard', icon: TAB_ICONS.dashboard},
    {id: 'tools', label: 'Tools', icon: TAB_ICONS.tools},
    {id: 'call', label: 'Call Tool', icon: TAB_ICONS.call},
    {id: 'request', label: 'Request', icon: TAB_ICONS.request},
    {id: 'batch', label: 'Batch', icon: TAB_ICONS.batch},
    {id: 'capabilities', label: 'Capabilities', icon: TAB_ICONS.capabilities},
    {id: 'validate', label: 'Validate', icon: TAB_ICONS.validate},
    {id: 'stats', label: 'Stats', icon: TAB_ICONS.stats},
    {id: 'sse', label: 'SSE Stream', icon: TAB_ICONS.sse},
    {id: 'info', label: 'Info', icon: TAB_ICONS.info},
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${healthStatus === 'ok' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <ShieldCheck className={`h-6 w-6 ${healthStatus === 'ok' ? 'text-green-600' : 'text-red-600'}`}/>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">MCP Protocol</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Model Context Protocol — Unified Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LiveStatsMini stats={state.stats} healthStatus={healthStatus}/>
          <Separator orientation="vertical" className="h-8"/>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh}/>
            <Label className="text-xs font-semibold">Auto-refresh</Label>
          </div>
          <Button
            onClick={refreshAll}
            variant="outline"
            size="sm"
            className="gap-2 px-4 py-2"
          >
            <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`}/>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto">
          <TabsList
            className="w-full justify-start bg-transparent border-b border-border/50 h-auto rounded-none p-0 gap-0">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary px-5 py-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-t-lg transition-all font-semibold"
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  <span className="text-sm whitespace-nowrap">{tab.label}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <Separator/>

        <TabsContent value="dashboard" className="mt-6 pt-0">
          <DashboardHomeTab/>
        </TabsContent>

        <TabsContent value="tools" className="mt-6 pt-0">
          <MCPTools/>
        </TabsContent>

        <TabsContent value="call" className="mt-6 pt-0">
          <MCPCallTool/>
        </TabsContent>

        <TabsContent value="request" className="mt-6 pt-0">
          <RequestTab/>
        </TabsContent>

        <TabsContent value="batch" className="mt-6 pt-0">
          <BatchTab/>
        </TabsContent>

        <TabsContent value="capabilities" className="mt-6 pt-0">
          <CapabilitiesTab/>
        </TabsContent>

        <TabsContent value="validate" className="mt-6 pt-0">
          <ValidateTab/>
        </TabsContent>

        <TabsContent value="stats" className="mt-6 pt-0">
          <StatsTab/>
        </TabsContent>

        <TabsContent value="sse" className="mt-6 pt-0">
          <MCPSSE/>
        </TabsContent>

        <TabsContent value="info" className="mt-6 pt-0">
          <MCPInfo/>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCPDashboard;
