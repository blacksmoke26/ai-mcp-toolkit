/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import type {MCPServerResponse, UpdateMCPServerRequest} from '@/types/api';

/**
 * Formats a timestamp into a human-readable string.
 * @param date - The date to format.
 * @returns Formatted date string or '—' if invalid.
 */
export const formatTimestamp = (date?: Date | string | null): string => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats duration in seconds into a human-readable string.
 * @param seconds - Duration in seconds.
 * @returns Formatted duration string.
 */
export const formatDuration = (seconds?: number | null): string => {
  if (seconds == null || seconds < 0) return '—';
  if (seconds === 0) return '0s';
  const units: [number, string][] = [
    [365 * 24 * 3600, 'y'],
    [24 * 3600, 'd'],
    [3600, 'h'],
    [60, 'm'],
    [1, 's'],
  ];
  const parts: string[] = [];
  for (const [secs, label] of units) {
    const val = Math.floor(seconds / secs);
    if (val > 0) {
      parts.push(`${val}${label}`);
      seconds -= val * secs;
    }
  }
  return parts.join(' ') || '0s';
};
/**
 * Converts a server name to a display name (e.g., 'filesystem' -> 'File System').
 * @param name - The server name.
 * @returns A human-readable display name.
 */
export const nameToDisplayName = (name: string): string => {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
/**
 * Generates a unique server name based on an existing name.
 * @param baseName - The base name.
 * @param existingNames
 * @returns A unique name with a counter suffix.
 */
export const generateUniqueName = (baseName: string, existingNames: Set<string>): string => {
  let name = baseName;
  let counter = 1;
  while (existingNames.has(name)) {
    name = `${baseName}-${counter}`;
    counter++;
  }
  return name;
};
/**
 * Exports server configurations as a JSON string.
 * @param servers - List of servers to export.
 * @returns JSON string of server configs.
 */
export const exportServersToJson = (servers: MCPServerResponse[]): string => {
  const exportData = servers.map(s => ({
    name: s.name,
    displayName: s.displayName,
    description: s.description,
    type: s.type,
    command: s.command,
    args: s.args,
    env: s.env,
    url: s.url,
    headers: s.headers,
    enabled: s.enabled,
    timeout: s.timeout,
    autoReconnect: s.autoReconnect,
    maxReconnectAttempts: s.maxReconnectAttempts,
    reconnectDelay: s.reconnectDelay,
    exportMeta: {
      exportedAt: new Date().toISOString(),
      exportedBy: 'AdminMCPServers',
    },
  }));

  return JSON.stringify(exportData, null, 2);
};
/**
 * Parses exported JSON string into server configurations.
 * @param json - The JSON string to parse.
 * @returns Parsed server configurations.
 */
export const parseExportedJson = (json: string): Partial<UpdateMCPServerRequest>[] => {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error('Invalid export format: expected an array');
  return data.map((item: unknown) => {
    const record = item as Record<string, unknown>;
    const meta = record.exportMeta as Record<string, unknown> | undefined;
    if (meta && typeof meta === 'object') delete record.exportMeta;
    return record as Partial<UpdateMCPServerRequest>;
  });
};

/**
 * Represents a single key-value pair row in the environment variables table.
 *
 * @remarks
 * The `id` field is a unique identifier used for React key reconciliation
 * and for reordering rows. The `key` and `value` fields represent the
 * actual environment variable name and its corresponding value.
 */
export interface EnvVarRow {
  /** Unique identifier for the row */
  id: string;
  /** The variable name (e.g., `DATABASE_URL`) */
  key: string;
  /** The variable value (e.g., `postgres://localhost/mydb`) */
  value: string;
}

/**
 * Generates a unique identifier using a combination of timestamp and random
 * string to minimize collision risk.
 *
 * @returns A unique string identifier
 */
export const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

/**
 * Converts a JSON string of environment variables into an array of `EnvVarRow` objects.
 *
 * @param jsonValue - A JSON string representing an object of key-value pairs.
 * @returns An array of `EnvVarRow` objects parsed from the JSON string.
 * @throws Will throw an error if the JSON string is invalid.
 *
 * @remarks
 * Empty string input returns an empty array. Invalid JSON returns a single
 * empty row to provide a starting point for the user.
 */
export const parseJsonToRows = (jsonValue: string): EnvVarRow[] => {
  if (!jsonValue || jsonValue.trim() === '') {
    return [{id: generateId(), key: '', value: ''}];
  }

  try {
    const obj = JSON.parse(jsonValue);
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return [{id: generateId(), key: '', value: ''}];
    }

    const rows: EnvVarRow[] = Object.entries(obj).map(([k, v]) => ({
      id: generateId(),
      key: k,
      value: String(v),
    }));

    return rows.length > 0 ? rows : [{id: generateId(), key: '', value: ''}];
  } catch {
    // Invalid JSON — provide a blank starting row
    return [{id: generateId(), key: '', value: ''}];
  }
};

/**
 * Converts an array of `EnvVarRow` objects into a JSON string.
 *
 * @param rows - An array of key-value row objects to serialize.
 * @returns A JSON string representation of the non-empty key-value pairs.
 *
 * @remarks
 * Rows with empty keys are excluded from the output. The result is
 * a compact JSON string suitable for storage or transmission.
 */
export const convertRowsToJson = (rows: EnvVarRow[]): string => {
  const result: Record<string, string> = {};

  rows.forEach((row) => {
    if (row.key.trim() !== '') {
      result[row.key.trim()] = row.value;
    }
  });

  return JSON.stringify(result, null, 2);
};

/**
 * Validates whether a given string is valid JSON.
 *
 * @param str - The string to validate.
 * @returns `true` if the string is valid JSON, `false` otherwise.
 */
export const isValidJson = (str: string): boolean => {
  if (!str || str.trim() === '') return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};
