/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module types/mcp-server
 * @description Type definitions for MCP server configurations and operations.
 *
 * These types define the structure of MCP server configurations,
 * connection states, and API responses throughout the system.
 */

/**
 * Represents the transport/connection type for an MCP server.
 * - `stdio`: Standard input/output (local process)
 * - `sse`: Server-Sent Events over HTTP
 * - `streamable-http`: HTTP with streaming support
 */
export type MCPServerType = 'stdio' | 'sse' | 'streamable-http';

/**
 * Represents the current connection status of an MCP server.
 */
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Configuration for an MCP server connection.
 * This type is used both for database records and runtime configuration.
 *
 * @property id - Unique database identifier
 * @property name - Unique server name/identifier (e.g., 'filesystem', 'postgres')
 * @property displayName - Human-readable name for UI display
 * @property description - Detailed description of server capabilities
 * @property type - Connection transport type
 * @property command - Executable command (for stdio type)
 * @property args - Command-line arguments as JSON array (for stdio type)
 * @property env - Environment variables as JSON object (for stdio type)
 * @property url - Server URL endpoint (for sse/streamable-http types)
 * @property headers - HTTP headers as JSON object (for sse/streamable-http types)
 * @property enabled - Whether the server is active
 * @property status - Current connection state
 * @property timeout - Connection timeout in milliseconds
 * @property autoReconnect - Whether to automatically reconnect on failure
 * @property maxReconnectAttempts - Maximum reconnection attempts (-1 for unlimited)
 * @property reconnectDelay - Base delay between reconnection attempts in ms
 * @property settings - Additional configuration as JSON object
 */
export interface MCPServerConfig {
  /** Database ID */
  id: number;
  /** Unique server name */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Server description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** Command for stdio transport */
  command?: string;
  /** Arguments for stdio transport (JSON array) */
  args?: string[];
  /** Environment variables for stdio transport */
  env?: Record<string, string>;
  /** URL for HTTP-based transports */
  url?: string;
  /** HTTP headers for HTTP-based transports */
  headers?: Record<string, string>;
  /** Whether server is enabled */
  enabled: boolean;
  /** Current status */
  status: MCPServerStatus;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Auto-reconnect flag */
  autoReconnect?: boolean;
  /** Max reconnection attempts (-1 for unlimited) */
  maxReconnectAttempts?: number;
  /** Reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Additional settings */
  settings?: Record<string, unknown>;
  /** Last error message */
  lastError?: string;
  /** Server version */
  version?: string;
}

/**
 * Request body for creating a new MCP server.
 */
export interface CreateMCPServerRequest {
  /** Unique server name (alphanumeric with underscores) */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** Command (required for stdio) */
  command?: string;
  /** Arguments as JSON array (required for stdio) */
  args?: string[];
  /** Environment variables (for stdio) */
  env?: Record<string, string>;
  /** URL (required for sse/streamable-http) */
  url?: string;
  /** Headers (for sse/streamable-http) */
  headers?: Record<string, string>;
  /** Whether to enable immediately */
  enabled?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Auto-reconnect flag */
  autoReconnect?: boolean;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay */
  reconnectDelay?: number;
  /** Additional settings */
  settings?: Record<string, unknown>;
}

/**
 * Request body for updating an MCP server.
 */
export interface UpdateMCPServerRequest {
  /** Display name */
  displayName?: string;
  /** Display name */
  name?: string;
  /** Description */
  description?: string;
  /** Transport type */
  type?: MCPServerType;
  /** Command */
  command?: string;
  /** Arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** URL */
  url?: string;
  /** Headers */
  headers?: Record<string, string>;
  /** Timeout */
  timeout?: number;
  /** Auto-reconnect */
  autoReconnect?: boolean;
  /** Max reconnection attempts */
  maxReconnectAttempts?: number;
  /** Reconnection delay */
  reconnectDelay?: number;
  /** Additional settings */
  settings?: Record<string, unknown>;
  /** Whether to enable immediately */
  enabled?: boolean;
}

/**
 * Response object for MCP server API endpoints.
 */
export interface MCPServerResponse {
  /** Database ID */
  id: number;
  /** Server name */
  name: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** URL (masked for security) */
  url?: string;
  /** Whether enabled */
  enabled: boolean;
  /** Current status */
  status: MCPServerStatus;
  /** Last error */
  lastError?: string;
  /** Timeout */
  timeout: number;
  /** Auto-reconnect */
  autoReconnect: boolean;
  /** Max reconnect attempts */
  maxReconnectAttempts: number;
  /** Reconnect delay */
  reconnectDelay: number;
  /** Version */
  version?: string;
  /** Last connected timestamp */
  lastConnectedAt?: Date;
  /** Connection count */
  connectionCount: number;
  /** Failure count */
  failureCount: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Update timestamp */
  updatedAt: Date;
}

/**
 * Health check response for an MCP server.
 */
export interface MCPServerHealthCheck {
  /** Server ID */
  id: number;
  /** Server name */
  name: string;
  /** Health status */
  status: 'healthy' | 'unhealthy' | 'unknown';
  /** Connection status */
  connectionStatus: MCPServerStatus;
  /** Uptime in seconds */
  uptime?: number;
  /** Last error */
  lastError?: string;
  /** Check timestamp */
  checkedAt: Date;
}

/**
 * Represents documentation for a specific environment variable.
 */
export interface VariableDoc {
  /** The key name of the environment variable */
  key: string;
  /** Human-readable description of the variable */
  description: string;
  /** Whether the variable is required for the server to start */
  required: boolean;
  /** Default value if omitted (optional) */
  default?: string;
  /** Example value for guidance */
  example?: string;
}

/**
 * Template for common MCP servers.
 * Used to help users quickly configure popular servers.
 */
export interface MCPServerTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Transport type */
  type: MCPServerType;
  /** Example command */
  command?: string;
  /** Example arguments */
  args?: string[];
  /** Example URL */
  url?: string;
  /** Example environment variables */
  env?: Record<string, string>;
  /** Example headers */
  headers?: Record<string, string>;
  /** Additional configuration notes */
  notes?: string;
  /** Documentation URL */
  documentationUrl?: string;
  /** Category classification for the server template */
  category: string;
  /** Icon identifier or URL for UI display */
  icon: string;
  /** Tags for searchability and grouping */
  tags: string[];
  /** Runtime environment required (e.g., 'node', 'python') */
  runtime: string;
  /** Homepage URL for the server project */
  homepage: string;
  /** Documentation for required environment variables */
  variables: Array<VariableDoc>;
}

/**
 * Log entry from an MCP server.
 */
export interface MCPServerLogEntry {
  /** Server ID */
  serverId: number;
  /** Server name */
  serverName: string;
  /** Log type */
  type: 'stdout' | 'stderr' | 'error' | 'info';
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: Date;
}
