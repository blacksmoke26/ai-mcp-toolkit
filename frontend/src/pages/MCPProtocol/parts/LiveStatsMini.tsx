/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {BarChart3, Bot, TrendingUp, Zap} from 'lucide-react';
import {formatUptime} from '../utils';
import type {McpProtocolContextValue} from '@/pages/MCPProtocol';

/**
 * LiveStatsMini displays compact stats in a row.
 */
export interface LiveStatsMiniProps {
  stats: McpProtocolContextValue['state']['stats'];
  healthStatus: string;
}

const LiveStatsMini = ({stats, healthStatus}: LiveStatsMiniProps) => (
  <div className="flex items-center gap-5 pl-1">
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40">
      <div
        className={`h-2.5 w-2.5 rounded-full ring-2 ring-background ${healthStatus === 'ok' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}/>
      <span className="text-xs font-semibold capitalize">{healthStatus}</span>
    </div>
    <div className="h-5 w-px bg-muted-foreground/20"/>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <BarChart3 className="h-3.5 w-3.5"/>
      <span className="font-mono font-medium">{stats?.totalRequests ?? 0}</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Zap className="h-3.5 w-3.5"/>
      <span className="font-mono font-medium">{stats?.totalBatchRequests ?? 0}</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Bot className="h-3.5 w-3.5"/>
      <span className="font-mono font-medium">{stats?.activeSseConnections ?? 0}</span>
    </div>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <TrendingUp className="h-3.5 w-3.5"/>
      <span className="font-mono font-medium">{stats?.uptime ? formatUptime(stats.uptime) : '-'}</span>
    </div>
  </div>
);

export default LiveStatsMini;
