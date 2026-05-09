/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {useCallback, useState} from 'react';
import {Bot, Gauge, Layers, RefreshCw, ShieldCheck, Zap} from 'lucide-react';

import {Badge} from '@/components/ui/Badge';
import {Button} from '@/components/ui/Button';
import {Card, CardContent} from '@/components/ui/Card';

import StatCard from '../parts/StatCard';
import AlertCircle from '../parts/AlertCircle';
import Clock from '../parts/Clock';

import {useMcpProtocol} from '@/hooks/useMcpProtocol';
import {formatRelative, formatUptime} from '../utils';

/**
 * StatsTab displays MCP request statistics with reset capability.
 */
const StatsTab = () => {
  const {state, resetStats, refreshAll} = useMcpProtocol();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const stats = state.stats;

  const handleReset = useCallback(async () => {
    await resetStats();
    setConfirmingReset(false);
    await refreshAll();
  }, [resetStats, refreshAll]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Request Statistics</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor MCP server request metrics and performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4"/>
              <span className="font-mono font-semibold">Uptime: {formatUptime(stats.uptime)}</span>
            </div>
          )}
          {confirmingReset ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmingReset(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleReset}>
                Confirm Reset
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirmingReset(true)}>
              <RefreshCw className="mr-2 h-3.5 w-3.5"/>
              Reset Counters
            </Button>
          )}
        </div>
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Zap className="h-5 w-5"/>}
            label="Total Requests"
            value={stats.totalRequests.toLocaleString()}
            accentColor="text-blue-500"
            bgAccent="bg-blue-500/15"
          />
          <StatCard
            icon={<Layers className="h-5 w-5"/>}
            label="Batch Requests"
            value={stats.totalBatchRequests.toLocaleString()}
            accentColor="text-purple-500"
            bgAccent="bg-purple-500/15"
          />
          <StatCard
            icon={<Bot className="h-5 w-5"/>}
            label="SSE Connections"
            value={`${stats.totalSseConnections} / ${stats.activeSseConnections}`}
            secondary={`${stats.activeSseConnections} active`}
            accentColor="text-cyan-500"
            bgAccent="bg-cyan-500/15"
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5"/>}
            label="Error Count"
            value={stats.errorCount.toLocaleString()}
            secondary={stats.errorCount > 0 ? `Error rate: ${(stats.errorRate || 0).toFixed(2)}%` : 'No errors'}
            accentColor={stats.errorCount > 0 ? 'text-red-500' : 'text-green-500'}
            bgAccent={stats.errorCount > 0 ? 'bg-red-500/15' : 'bg-green-500/15'}
          />
          <StatCard
            icon={<Clock className="h-5 w-5"/>}
            label="Last Request"
            value={stats.lastRequestAt ? formatRelative(stats.lastRequestAt) : 'Never'}
            accentColor="text-orange-500"
            bgAccent="bg-orange-500/15"
          />
          <StatCard
            icon={<Gauge className="h-5 w-5"/>}
            label="Uptime"
            value={formatUptime(stats.uptime)}
            accentColor="text-emerald-500"
            bgAccent="bg-emerald-500/15"
          />
          <StatCard
            icon={
              <div className="flex gap-0.5 items-end h-5">
                {[40, 65, 50, 80, 55, 70, 60].map((h, i) => (
                  <div key={i} className="w-1.5 bg-green-500 rounded-t" style={{height: `${h}%`}}/>
                ))}
              </div>
            }
            label="Error Rate"
            value={`${(stats.errorRate || 0).toFixed(2)}%`}
            accentColor="text-indigo-500"
            bgAccent="bg-indigo-500/15"
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5"/>}
            label="Status"
            value={stats.errorCount < 100 ? <span className="text-green-500">Healthy</span> :
              <span className="text-red-500">Degraded</span>}
            secondary={stats.errorCount > 100 ? 'High error rate' : 'Within normal range'}
            accentColor={stats.errorCount < 100 ? 'text-green-500' : 'text-red-500'}
            bgAccent={stats.errorCount < 100 ? 'bg-green-500/15' : 'bg-red-500/15'}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <p className="font-medium">Loading statistics...</p>
          </CardContent>
        </Card>
      )}

      {/* Available Methods List */}
      {state.methods && state.methods.list && state.methods.list.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4">Available Methods ({state.methods.list.length})</h2>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-4 font-bold text-xs uppercase tracking-widest">Method</th>
                    <th className="text-left p-4 font-bold text-xs uppercase tracking-widest">Description</th>
                    <th className="text-left p-4 font-bold text-xs uppercase tracking-widest">Parameters</th>
                  </tr>
                  </thead>
                  <tbody>
                  {state.methods.list.map((m, i) => (
                    <tr key={i} className="border-t border-muted/20 hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs font-mono px-2.5 py-1">{m.method}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{m.description}</td>
                      <td className="p-4 text-muted-foreground/60 text-xs font-mono">{m.params}</td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
};

export default StatsTab;
