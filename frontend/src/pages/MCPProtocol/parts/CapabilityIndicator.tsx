/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {Badge} from '@/components/ui/Badge';

/**
 * CapabilityIndicator shows a capability with its supported state and details.
 */
export interface CapabilityIndicatorProps {
  icon: React.ReactNode;
  name: string;
  supported: boolean;
  details?: string;
}

const CapabilityIndicator = ({icon, name, supported, details}: CapabilityIndicatorProps) => (
  <div
    className={`group flex items-start gap-4 p-5 rounded-xl border-2 transition-all duration-200 ${supported ? 'bg-gradient-to-br from-green-50/80 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/20 border-green-200/80 dark:border-green-800/50 hover:border-green-300 dark:hover:border-green-700 shadow-sm' : 'bg-muted/20 border-muted/60 hover:bg-muted/40'}`}>
    <div
      className={`p-3 rounded-xl flex-shrink-0 ${supported ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-muted/60 text-muted-foreground/60'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0 pt-0.5">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="font-bold text-base">{name}</span>
        <Badge variant={supported ? 'success' : 'outline'} className="text-[10px] px-2 py-0 font-semibold">
          {supported ? 'Supported' : 'Not Supported'}
        </Badge>
      </div>
      {details && <p className="text-xs text-muted-foreground/70 leading-relaxed">{details}</p>}
    </div>
  </div>
);

export default CapabilityIndicator;
