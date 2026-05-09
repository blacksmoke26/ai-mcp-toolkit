/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import * as React from 'react';
import {formatBytes} from '../utils';

export interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

/**
 * ProgressBar renders a labeled memory bar with proper sizing.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({label, value, max, color}) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground/80 font-medium">{label}</span>
        <span className="font-mono font-semibold text-sm">{formatBytes(value)}</span>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
        <div
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{width: `${pct}%`}}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
