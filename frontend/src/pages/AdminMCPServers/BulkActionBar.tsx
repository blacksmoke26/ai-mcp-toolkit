/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import React from 'react';
import {
  Play,
  Square as StopIcon,
  Square as Unchecked,
  RefreshCw,
  Trash2,
  X,
  CheckSquare,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

/**
 * Props for the BulkActionBar component.
 */
export interface BulkActionBarProps {
  /** Number of selected servers */
  count: number;
  /** List of selected server IDs */
  selectedIds: number[];
  /** List of selected server names for display */
  selectedNames: string[];
  /** Whether any operation is currently running */
  isOperating: boolean;

  /** Callback to select/deselect all servers on the current page */
  onSelectAll(): void;

  /** Callback to start all selected servers */
  onStartAll(): void;

  /** Callback to stop all selected servers */
  onStopAll(): void;

  /** Callback to restart all selected servers */
  onRestartAll(): void;

  /** Callback to delete all selected servers */
  onDeleteAll(): void;

  /** Callback to close the action bar */
  onClose(): void;
}

/**
 * Floating action bar that appears at the bottom of the page when servers
 * are selected for bulk operations.
 */
const BulkActionBar: React.FC<BulkActionBarProps> = (props) => {
  const {
    count,
    selectedIds,
    selectedNames,
    isOperating,
    onSelectAll,
    onStartAll,
    onStopAll,
    onRestartAll,
    onDeleteAll,
    onClose,
  } = props;

  /**
   * Determines whether all servers on the current page are selected.
   */
  const allSelected = count > 0 && selectedIds.length > 0;

  /**
   * Formats the selection summary text for display.
   */
  const getSelectionSummary = (): string => {
    if (selectedNames.length <= 3) {
      return selectedNames.join(', ');
    }
    return `${selectedNames.slice(0, 3).join(', ')} and ${selectedNames.length - 3} more`;
  };

  /**
   * Handles the close/clear selection action.
   */
  const handleClose = (): void => {
    if (!isOperating) {
      onClose();
    }
  };

  /**
   * Handles the start all action with confirmation for destructive operations.
   */
  const handleStartAll = (): void => {
    if (!isOperating) {
      onStartAll();
    }
  };

  /**
   * Handles the stop all action with confirmation for destructive operations.
   */
  const handleStopAll = (): void => {
    if (!isOperating) {
      onStopAll();
    }
  };

  /**
   * Handles the restart all action with confirmation for destructive operations.
   */
  const handleRestartAll = (): void => {
    if (!isOperating) {
      onRestartAll();
    }
  };

  /**
   * Handles the delete all action with confirmation for destructive operations.
   */
  const handleDeleteAll = (): void => {
    if (!isOperating) {
      onDeleteAll();
    }
  };

  if (count === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4"
      data-state="open"
      style={{
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl px-6 py-4">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 text-blue-400 rounded-lg px-3 py-1.5 text-sm font-medium">
              {count} server{count !== 1 ? 's' : ''} selected
            </div>
            {selectedNames.length > 0 && (
              <div className="text-gray-400 text-xs truncate max-w-[200px]">
                {getSelectionSummary()}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={isOperating}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Progress Indicator */}
        {isOperating && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin"/>
            <span>Operation in progress...</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select All Toggle */}
          <button
            onClick={onSelectAll}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected ? (
              <Unchecked className="w-4 h-4"/>
            ) : (
              <CheckSquare className="w-4 h-4"/>
            )}
            <span className="hidden sm:inline">{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>

          <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block"/>

          {/* Start All */}
          <button
            onClick={handleStartAll}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Start all selected servers"
          >
            <Play className="w-4 h-4"/>
            <span className="hidden sm:inline">Start All</span>
          </button>

          {/* Stop All */}
          <button
            onClick={handleStopAll}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Stop all selected servers"
          >
            <StopIcon className="w-4 h-4"/>
            <span className="hidden sm:inline">Stop All</span>
          </button>

          {/* Restart All */}
          <button
            onClick={handleRestartAll}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Restart all selected servers"
          >
            <RefreshCw className="w-4 h-4"/>
            <span className="hidden sm:inline">Restart All</span>
          </button>

          {/* Delete All */}
          <button
            onClick={handleDeleteAll}
            disabled={isOperating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete all selected servers"
          >
            <Trash2 className="w-4 h-4"/>
            <span className="hidden sm:inline">Delete All</span>
          </button>
        </div>

        {/* Warning for destructive actions */}
        {selectedIds.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>
              <p>
                Start, stop, and restart actions will affect all {count} selected server
                {count !== 1 ? 's' : ''}. Delete will permanently remove all selected servers.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkActionBar;
