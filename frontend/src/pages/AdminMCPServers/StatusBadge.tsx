/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {AlertCircle, Check, Loader2, Square} from 'lucide-react';
import {Badge} from '@/components/ui/Badge';
/**
 * Props for the StatusBadge component.
 */
export interface StatusBadgeProps {
  /** The connection status to display. */
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({status}) => {
  /**
   * Determines the appropriate CSS classes for the badge based on the status.
   * @returns The string of Tailwind CSS classes for color and border.
   */
  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'connecting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'disconnected':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  /**
   * Determines the appropriate icon element based on the status.
   * @returns A React element representing the status icon.
   */
  const getStatusIcon = (): React.ReactElement => {
    switch (status) {
      case 'connected':
        return <Check className="w-3 h-3 mr-1"/>;
      case 'connecting':
        return <Loader2 className="w-3 h-3 mr-1 animate-spin"/>;
      case 'disconnected':
        return <Square className="w-3 h-3 mr-1"/>;
      case 'error':
        return <AlertCircle className="w-3 h-3 mr-1"/>;
      default:
        return <Square className="w-3 h-3 mr-1"/>;
    }
  };

  return (
    <Badge variant="outline" className={`${getStatusColor()} font-mono text-xs px-2 py-0.5`}>
      {getStatusIcon()}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default StatusBadge;
