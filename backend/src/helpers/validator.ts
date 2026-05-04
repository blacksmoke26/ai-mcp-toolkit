/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

import {isJsonRpcNotification, JsonRpcNotification, JsonRpcRequest} from '@/mcp/types';

/**
 * Validates a value as a non-empty string.
 *
 * @changelog
 * - v1.1.0: Initial implementation
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Validates a value as a plain object (not null, not array).
 *
 * @changelog
 * - v1.1.0: Initial implementation
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Validates a JSON-RPC 2.0 request structure.
 * Returns a human-readable error string if invalid, or `null` if valid.
 *
 * Per the JSON-RPC 2.0 spec:
 * - `jsonrpc` MUST be exactly `"2.0"`
 * - `method` MUST be a non-empty string
 * - `id` (when present) MUST be string, number, or null
 * - `params` (when present) MUST be an object or array
 *
 * @changelog
 * - v1.1.0: Initial implementation
 * - v1.2.0: Added support for validating `JsonRpcNotification` structures (id field optional/absent)
 */
export const validateJsonRpcRequest = (request: unknown): string | null => {
  if (!isPlainObject(request)) {
    return 'Request must be a JSON object';
  }

  const req = request as Record<string, unknown>;

  if (req.jsonrpc !== '2.0') {
    return 'Invalid or missing "jsonrpc" field — must be exactly "2.0"';
  }

  if (!isNonEmptyString(req.method)) {
    return 'Invalid or missing "method" field — must be a non-empty string';
  }

  if ('id' in req && req.id !== null && typeof req.id !== 'string' && typeof req.id !== 'number') {
    return 'Invalid "id" field — must be string, number, or null';
  }

  if ('params' in req && req.params !== null && req.params !== undefined && typeof req.params !== 'object') {
    return 'Invalid "params" field — must be an object, array, or omitted';
  }

  return null;
};

/**
 * Determines whether a JSON-RPC request is a notification.
 * Per JSON-RPC 2.0: a notification is a request without an `id` member,
 * or with `id` set to `null`/`undefined` (backward-compatible behavior).
 *
 * @changelog
 * - v1.1.0: Initial implementation
 * - v1.2.0: Updated to handle both `JsonRpcRequest` and `JsonRpcNotification` types
 */
export const isNotification = (request: JsonRpcRequest | JsonRpcNotification): boolean => {
  if (isJsonRpcNotification(request)) return true;
  return !('id' in request) || request.id === null || request.id === undefined;
};
