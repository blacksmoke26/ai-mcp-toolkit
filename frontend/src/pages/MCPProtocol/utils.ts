/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {McpMethodDescription} from '@/types/api';

/** Format bytes to human-readable string */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/** Format seconds to human-readable uptime */
export const formatUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs}h ${mins}m ${secs}s`;
};

/** Format relative time from ISO string */
export const formatRelative = (iso?: string | null): string => {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
};

/** Check if method is likely a notification */
export const isMethodNotification = (methodName: string): boolean => {
  return methodName.toLowerCase().startsWith('notifications/');
};

/** Check if method likely requires parameters */
export const methodRequiresParams = (methodName: string): boolean => {
  const excludes = ['ping', 'shutdown', 'initialize'];
  return !excludes.some(ex => methodName.toLowerCase().includes(ex));
};

/** Generate JSON-RPC template for a method */
export const generateMethodTemplate = (method: McpMethodDescription): string => {
  const base = {
    jsonrpc: '2.0' as const,
    id: 1,
    method: method.method,
  };

  if (isMethodNotification(method.method)) {
    return JSON.stringify(base, null, 2);
  }

  if (methodRequiresParams(method.method)) {
    return JSON.stringify({...base, params: {}}, null, 2);
  }

  return JSON.stringify(base, null, 2);
};
