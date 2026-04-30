/**
 * DashboardPage - Main WebSocket Dashboard page integrating all panels
 * Combines Dashboard overview, EventSimulator, AdvancedChat, MetricsPanel, and ProviderPanel
 * @author Junaid Atari <mj.atari@gmail.com>
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {Activity, ChevronDown, ChevronUp, LayoutGrid, ListFilter, MessageSquare, Server, Sparkles} from 'lucide-react';
import {cn} from '@/lib/utils';

// Panels
import WebSocketDashboard from '@/pages/WebSocket/WebSocketDashboard.tsx';
import EventSimulator from '@/pages/WebSocket/EventSimulator.tsx';
import AdvancedChat from '@/pages/WebSocket/AdvancedChat.tsx';
import MetricsPanel from '@/pages/WebSocket/MetricsPanel.tsx';
import ProviderPanel from '@/pages/WebSocket/ProviderPanel.tsx';

type TabKey = 'dashboard' | 'events' | 'chat' | 'metrics' | 'providers' | 'simulate';

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<TabKey>('dashboard');
  const [showTabs, setShowTabs] = React.useState(true);

  const tabs: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      description: 'Overview & connections',
    },
    {
      key: 'events',
      label: 'Event Feed',
      icon: ListFilter,
      description: 'Live event monitoring',
    },
    {
      key: 'simulate',
      label: 'Simulator',
      icon: Sparkles,
      description: 'Event simulation & testing',
    },
    {
      key: 'chat',
      label: 'Chat',
      icon: MessageSquare,
      description: 'AI chat interface',
    },
    {
      key: 'metrics',
      label: 'Metrics',
      icon: Activity,
      description: 'Live system metrics',
    },
    {
      key: 'providers',
      label: 'Providers',
      icon: Server,
      description: 'LLM provider management',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            WebSocket Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time monitoring, event simulation, chat, and system health — all in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTabs(!showTabs)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted"
          >
            {showTabs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showTabs ? 'Hide' : 'Show'} Tabs
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      {showTabs && (
        <div className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex flex-shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="ml-1 text-[10px] text-muted-foreground">{tab.description}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <WebSocketDashboard />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Live Event Feed</h2>
                <p className="text-sm text-muted-foreground">
                  Monitor all incoming and outgoing WebSocket events in real-time.
                </p>
              </div>
              <WebSocketDashboard />
            </div>
          </div>
        )}

        {activeTab === 'simulate' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Event Simulator</h2>
                <p className="text-sm text-muted-foreground">
                  Browse, select, and simulate all 80+ WebSocket events with custom payloads.
                </p>
              </div>
              <EventSimulator />
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">AI Chat</h2>
                <p className="text-sm text-muted-foreground">
                  Interactive chat with AI agent, streaming responses, and tool call visualization.
                </p>
              </div>
              <AdvancedChat />
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Live Metrics</h2>
                <p className="text-sm text-muted-foreground">
                  Real-time system monitoring with animated charts, gauges, and data points.
                </p>
              </div>
              <MetricsPanel />
            </div>
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Provider Management</h2>
                <p className="text-sm text-muted-foreground">
                  Monitor and manage LLM provider connections, health, and configuration.
                </p>
              </div>
              <ProviderPanel />
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className="text-3xl font-bold text-primary tabular-nums">80+</p>
          <p className="text-xs text-muted-foreground">Event Types</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className="text-3xl font-bold text-green-500 tabular-nums">8</p>
          <p className="text-xs text-muted-foreground">Rooms</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className="text-3xl font-bold text-yellow-500 tabular-nums">10</p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4 text-center">
          <p className="text-3xl font-bold text-purple-500 tabular-nums">6</p>
          <p className="text-xs text-muted-foreground">Panels</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
