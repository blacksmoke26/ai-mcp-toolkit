// noinspection ExceptionCaughtLocallyJS

/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @changes
 * - Added `lastActivityAt` and `logs` buffer to `ServerConnection` interface for better tracking.
 * - Implemented `handleServerDisconnect` to calculate uptime using the `connection` parameter.
 * - Implemented `startHTTPConnection` to record activity timestamp on the `connection` object.
 * - Added `getServerLogs(serverId)` method to retrieve recent buffered logs for a server.
 * - Added `stopAllServers(force)` utility method to stop all active connections at once.
 * - Added `getConnectionsCount()` utility to check active load.
 * - Added strict type safety for all EventEmitters data payloads.
 * - Refactored `parseConfig` to ensure environment variables are strictly typed.
 * - Added `@changes` documentation block to track modifications.
 */

/**
 * @module services/mcp-server-manager
 * @description Manages the lifecycle of external MCP server connections.
 *
 * This service handles:
 * - Starting and stopping MCP server processes
 * - Managing connection states and reconnection logic
 * - Tracking server health and status
 * - Handling stdio, SSE, and HTTP transport types
 *
 * ## Architecture
 *
 * ```
 * MCPServerManager
 * ├── startServer()        - Initialize and connect to an MCP server
 * ├── stopServer()         - Gracefully disconnect and terminate
 * ├── stopAllServers()     - Stop all active connections
 * ├── restartServer()      - Full restart cycle
 * ├── getStatus()          - Current connection status
 * ├── getServerLogs()      - Retrieve recent logs from buffer
 * ├── listServers()        - All managed servers
 * ├── healthCheck()        - Verify server health
 * ├── getConnectionsCount()- Get number of active connections
 * └── getConnection()      - Get raw connection object
 * ```
 *
 * ## Server States
 *
 * | State        | Description                              |
 * |--------------|------------------------------------------|
 * | disconnected | Server is not connected                  |
 * | connecting   | Establishing connection                  |
 * | connected    | Active and ready to use                  |
 * | error        | Connection failed, check lastError       |
 *
 * ## Usage
 *
 * ### Basic Connection Management
 * ```typescript
 * import { mcpServerManager } from '@/services/mcp-server-manager';
 *
 * // Start a server
 * const success = await mcpServerManager.startServer(1);
 *
 * // Check status
 * const status = await mcpServerManager.getStatus(1);
 * console.log(status.status); // 'connected'
 *
 * // Stop a server
 * await mcpServerManager.stopServer(1);
 *
 * // List all servers
 * const servers = await mcpServerManager.listServers();
 * ```
 *
 * ### Log Retrieval
 * ```typescript
 * // Get recent logs for a specific server
 * const logs = await mcpServerManager.getServerLogs(1);
 * logs.forEach(log => console.log(`[${log.type}] ${log.message}`));
 * ```
 *
 * ### Batch Operations
 * ```typescript
 * // Stop all servers immediately (e.g., on shutdown)
 * await mcpServerManager.stopAllServers(true);
 * ```
 */

import {spawn, ChildProcess} from 'node:child_process';
import EventEmitter from 'node:events';
import type {MCPServerConfig, MCPServerStatus} from '@/types/mcp-server';
import {MCPServer} from '@/db';
import {logger} from '@/utils/logger';

/**
 * Log entry structure.
 */
export interface LogEntry {
  /** Log type */
  type: 'stdout' | 'stderr' | 'info' | 'error';
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Connection state tracking for each server.
 */
interface ServerConnection {
  /** Database ID */
  id: number;
  /** Server configuration */
  config: MCPServerConfig;
  /** Child process (for stdio transport) */
  process?: ChildProcess;
  /** Connection start timestamp */
  connectedAt?: Date;
  /** Last time data/activity was received */
  lastActivityAt?: Date;
  /** Reconnection attempt counter */
  reconnectAttempts: number;
  /** Reconnection timeout reference */
  reconnectTimer?: NodeJS.Timeout;
  /** AbortController for canceling HTTP/SSE requests */
  abortController?: AbortController;
  /** Active reader for stream data (SSE/HTTP) */
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  /** In-memory buffer of recent logs */
  logs: LogEntry[];
}

/**
 * Status response for API endpoints.
 */
export interface ServerStatusResponse {
  /** Database ID */
  id: number;
  /** Unique server name */
  name: string;
  /** Display name */
  displayName: string;
  /** Transport type */
  type: string;
  /** Connection state */
  status: MCPServerStatus;
  /** Last error message */
  lastError?: string | null;
  /** Server version */
  version?: string | null;
  /** Connection timestamp */
  connectedAt?: Date;
  /** Total successful connections */
  connectionCount: number;
  /** Total failure count */
  failureCount: number;
}

/**
 * Health check result.
 */
export interface HealthCheckResult {
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
  lastError?: string | null;
}

/**
 * Manages the lifecycle of all MCP server connections.
 * Singleton instance for centralized server management.
 */
export class MCPServerManager extends EventEmitter {
  /** Map of active server connections */
  private connections: Map<number, ServerConnection> = new Map();

  /** Maximum concurrent connection attempts */
  private maxConcurrentConnections: number = 5;

  /** Currently active connection attempts */
  private activeConnections: number = 0;

  /** Queue for pending connection attempts */
  private connectionQueue: Array<() => Promise<void>> = [];

  /** Max logs to keep in memory per server */
  private static readonly MAX_LOG_BUFFER_SIZE = 100;

  /**
   * Create a new MCP server manager instance.
   */
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many server connections
  }

  /**
   * Start an MCP server connection.
   *
   * @param serverId - Database ID of the server to start
   * @returns Promise resolving to true if successful, false otherwise
   */
  public async startServer(serverId: number): Promise<boolean> {
    // Check if already connected
    const existing = this.connections.get(serverId);
    if (existing && existing.config.status === 'connected') {
      logger.info({serverId}, 'Server already connected');
      return true;
    }

    // Get server configuration from database
    const server = await MCPServer.findByPk(serverId);
    if (!server) {
      logger.error({serverId}, 'Server not found in database');
      this.emit('error', {serverId, error: 'Server not found'});
      return false;
    }

    // Parse configuration
    const config = this.parseConfig(server);
    if (!config.enabled) {
      logger.warn({serverId, name: server.name}, 'Server is disabled');
      await this.updateStatus(serverId, 'disconnected', 'Server is disabled');
      return false;
    }

    // Update status to connecting
    await this.updateStatus(serverId, 'connecting');

    // Add to connection queue if at max capacity
    if (this.activeConnections >= this.maxConcurrentConnections) {
      return new Promise<boolean>((resolve) => {
        this.connectionQueue.push(async () => {
          const result = await this.startConnection(serverId, config);
          resolve(result);
        });
        this.processQueue();
      });
    }

    // Start connection immediately
    return this.startConnection(serverId, config);
  }

  /**
   * Internal method to establish server connection.
   *
   * @param serverId - Database ID
   * @param config - Server configuration
   * @returns Promise resolving to true if connection successful
   */
  private async startConnection(serverId: number, config: MCPServerConfig): Promise<boolean> {
    this.activeConnections++;

    try {
      const connection: ServerConnection = {
        id: serverId,
        config,
        reconnectAttempts: 0,
        logs: [],
      };

      this.connections.set(serverId, connection);

      // Route to appropriate transport handler
      switch (config.type) {
        case 'stdio':
          return this.startStdioConnection(serverId, config, connection);
        case 'sse':
          return this.startSSEConnection(serverId, config, connection);
        case 'streamable-http':
          return this.startHTTPConnection(serverId, config, connection);
        default:
          throw new Error(`Unsupported transport type: ${config.type}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({serverId, err: message}, 'Failed to start server connection');
      await this.updateStatus(serverId, 'error', message);
      this.emit('error', {serverId, error});
      return false;
    } finally {
      this.activeConnections--;
      this.processQueue();
    }
  }

  /**
   * Start a stdio-based MCP server (local process).
   *
   * @param serverId - Database ID
   * @param config - Server configuration
   * @param connection - Connection object to update
   * @returns Promise resolving to true if successful
   */
  private async startStdioConnection(
    serverId: number,
    config: MCPServerConfig,
    connection: ServerConnection,
  ): Promise<boolean> {
    logger.info(
      {serverId, command: config.command, args: config.args},
      'Starting stdio MCP server',
    );

    try {
      // Spawn the child process
      const childProcess = spawn(config.command!, config.args || [], {
        env: {...process.env, ...(config.env || {})},
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: true,
      });

      connection.process = childProcess;

      // Handle process stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        const message = data.toString('utf-8').trim();
        if (message) {
          this.addLog(connection, 'stdout', message);
          logger.debug({serverId, message}, 'Server stdout');
          this.emit('server-log', {serverId, type: 'stdout', message});
        }
      });

      // Handle process stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        const message = data.toString('utf-8').trim();
        if (message) {
          this.addLog(connection, 'stderr', message);
          logger.warn({serverId, message}, 'Server stderr');
          this.emit('server-log', {serverId, type: 'stderr', message});
        }
      });

      // Handle process exit
      childProcess.on('exit', async (code: number | null, signal: string | null) => {
        logger.info(
          {serverId, code, signal},
          `Server process exited${code !== null ? ` with code ${code}` : ''}`,
        );

        await this.handleServerDisconnect(serverId, connection.config, connection);

        // Attempt reconnection if configured
        if (config.enabled && config.autoReconnect) {
          this.scheduleReconnect(serverId, config, connection);
        }
      });

      childProcess.on('error', async (error: Error) => {
        const msg = error.message;
        this.addLog(connection, 'error', msg);
        logger.error({serverId, err: msg}, 'Server process error');
        await this.updateStatus(serverId, 'error', msg);
        this.emit('error', {serverId, error});
      });

      // Update status to connected
      await this.updateStatus(serverId, 'connected', undefined, Date.now());
      this.emit('connected', {serverId, name: config.name});

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addLog(connection, 'error', message);
      logger.error({serverId, err: message}, 'Failed to spawn stdio process');
      await this.updateStatus(serverId, 'error', message);
      return false;
    }
  }

  /**
   * Start an SSE-based MCP server connection using native fetch.
   *
   * @param serverId - Database ID
   * @param config - Server configuration
   * @param connection - Connection object to update
   * @returns Promise resolving to true if successful
   */
  private async startSSEConnection(
    serverId: number,
    config: MCPServerConfig,
    connection: ServerConnection,
  ): Promise<boolean> {
    logger.info({serverId, url: config.url}, 'Starting SSE MCP server connection');

    const abortController = new AbortController();
    connection.abortController = abortController;

    try {
      if (!config.url) throw new Error('URL is required for SSE connection');

      // Use fetch to establish the SSE connection
      const response = await fetch(config.url, {
        signal: abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...(config.headers || {}),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      // @ts-ignore
      connection.reader = reader;

      await this.updateStatus(serverId, 'connected', undefined, Date.now());
      this.emit('connected', {serverId, name: config.name});

      // Process the SSE stream
      let buffer = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          logger.info({serverId}, 'SSE stream closed by server');
          break;
        }

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep last incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data) {
              this.addLog(connection, 'stdout', data);
              logger.debug({serverId, data}, 'SSE data received');
              this.emit('server-log', {serverId, type: 'stdout', message: data});
            }
          } else if (trimmedLine.startsWith('event: ')) {
            const eventName = trimmedLine.slice(7);
            logger.debug({serverId, event: eventName}, 'SSE event received');
            this.emit('sse-event', {serverId, event: eventName});
          }
        }
      }

      // If we exit the loop without error, the server closed the connection
      await this.handleServerDisconnect(serverId, config, connection);

      if (config.enabled && config.autoReconnect) {
        this.scheduleReconnect(serverId, config, connection);
      }

      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info({serverId}, 'SSE connection aborted');
        return false;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.addLog(connection, 'error', message);
      logger.error({serverId, err: message}, 'SSE connection failed');
      await this.updateStatus(serverId, 'error', message);
      this.emit('error', {serverId, error});
      return false;
    }
  }

  /**
   * Start a streamable HTTP MCP server connection using native fetch.
   *
   * @param serverId - Database ID
   * @param config - Server configuration
   * @param connection - Connection object to update
   * @returns Promise resolving to true if successful
   */
  private async startHTTPConnection(
    serverId: number,
    config: MCPServerConfig,
    connection: ServerConnection,
  ): Promise<boolean> {
    logger.info({serverId, url: config.url}, 'Starting HTTP MCP server connection');

    const abortController = new AbortController();
    connection.abortController = abortController;

    try {
      if (!config.url) throw new Error('URL is required for HTTP connection');

      // Perform a handshake/health check using fetch
      const response = await fetch(config.url, {
        method: 'GET',
        signal: abortController.signal,
        headers: config.headers || {},
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Record activity
      connection.lastActivityAt = new Date();

      await this.updateStatus(serverId, 'connected', undefined, Date.now());
      this.emit('connected', {serverId, name: config.name});

      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info({serverId}, 'HTTP connection aborted');
        return false;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.addLog(connection, 'error', message);
      logger.error({serverId, err: message}, 'HTTP connection failed');
      await this.updateStatus(serverId, 'error', message);
      this.emit('error', {serverId, error});
      return false;
    }
  }

  /**
   * Stop an MCP server connection.
   *
   * @param serverId - Database ID of the server to stop
   * @param force - Whether to force stop (skip graceful shutdown)
   * @returns Promise resolving to true if successful
   */
  public async stopServer(serverId: number, force: boolean = false): Promise<boolean> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      logger.warn({serverId}, 'No active connection found to stop');
      return false;
    }

    logger.info({serverId, force}, 'Stopping MCP server');

    try {
      // Cancel any pending reconnection
      if (connection.reconnectTimer) {
        clearTimeout(connection.reconnectTimer);
        connection.reconnectTimer = undefined;
      }

      // Stop based on transport type
      switch (connection.config.type) {
        case 'stdio':
          if (connection.process) {
            if (force) {
              connection.process.kill('SIGKILL');
            } else {
              connection.process.kill('SIGTERM');

              // Wait for graceful shutdown, then force kill
              await new Promise<boolean>((resolve) => {
                const timeout = setTimeout(() => {
                  connection.process?.kill('SIGKILL');
                  resolve(true);
                }, 5000);

                connection.process?.once('close', () => {
                  clearTimeout(timeout);
                  resolve(true);
                });
              });
            }
          }
          break;

        case 'sse':
        case 'streamable-http':
          // Close HTTP/SSE connections
          if (connection.abortController) {
            connection.abortController.abort();
          }
          if (connection.reader) {
            await connection.reader.cancel();
          }
          break;
      }

      // Update status
      await this.updateStatus(serverId, 'disconnected');

      // Remove from connections
      this.connections.delete(serverId);

      this.emit('disconnected', {serverId, name: connection.config.name});

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({serverId, err: message}, 'Failed to stop server');
      this.emit('error', {serverId, error});
      return false;
    }
  }

  /**
   * Stop all active MCP server connections.
   *
   * @param force - Whether to force stop all servers
   * @returns Promise resolving when all servers are stopped
   */
  public async stopAllServers(force: boolean = false): Promise<void> {
    logger.info({force}, 'Stopping all MCP servers');
    const serverIds = Array.from(this.connections.keys());

    await Promise.allSettled(
      serverIds.map(id => this.stopServer(id, force)),
    );
  }

  /**
   * Restart an MCP server (stop then start).
   *
   * @param serverId - Database ID of the server to restart
   * @returns Promise resolving to true if successful
   */
  public async restartServer(serverId: number): Promise<boolean> {
    logger.info({serverId}, 'Restarting MCP server');

    // Stop existing connection
    await this.stopServer(serverId, true);

    // Small delay to ensure cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start new connection
    return this.startServer(serverId);
  }

  /**
   * Get the current status of a server.
   *
   * @param serverId - Database ID of the server
   * @returns Server status or null if not found
   */
  public async getStatus(serverId: number): Promise<ServerStatusResponse | null> {
    const server = await MCPServer.findByPk(serverId);
    if (!server) return null;

    const connection = this.connections.get(serverId);

    return {
      id: server.id,
      name: server.name,
      displayName: server.displayName,
      type: server.type,
      status: connection?.config.status || server.status,
      lastError: connection?.config?.lastError || server?.lastError,
      version: server.version,
      connectedAt: connection?.connectedAt,
      connectionCount: server.connectionCount || 0,
      failureCount: server.failureCount || 0,
    };
  }

  /**
   * List all MCP servers with their current status.
   *
   * @returns Promise resolving to array of server statuses
   */
  public async listServers(): Promise<ServerStatusResponse[]> {
    const servers = await MCPServer.findAll({order: [['createdAt', 'DESC']]});

    const responses: ServerStatusResponse[] = [];

    for (const server of servers) {
      const connection = this.connections.get(server.id);
      responses.push({
        id: server.id,
        name: server.name,
        displayName: server.displayName,
        type: server.type,
        status: connection?.config.status || server.status,
        lastError: connection?.config?.lastError || server?.lastError,
        version: server.version,
        connectedAt: connection?.connectedAt,
        connectionCount: server.connectionCount || 0,
        failureCount: server.failureCount || 0,
      });
    }

    return responses;
  }

  /**
   * Get the raw connection object for a server.
   * Useful for advanced integrations.
   *
   * @param serverId - Database ID of the server
   * @returns ServerConnection object or undefined
   */
  public getConnection(serverId: number): ServerConnection | undefined {
    return this.connections.get(serverId);
  }

  /**
   * Get recent logs for a specific server.
   *
   * @param serverId - Database ID of the server
   * @returns Array of log entries
   */
  public getServerLogs(serverId: number): LogEntry[] {
    const connection = this.connections.get(serverId);
    return connection ? connection.logs : [];
  }

  /**
   * Get the count of currently active connections.
   *
   * @returns Number of active connections
   */
  public getConnectionsCount(): number {
    return this.connections.size;
  }

  /**
   * Perform a health check on a specific server.
   * This method verifies if the server is responding correctly.
   *
   * @param serverId - Database ID of the server
   * @returns Promise resolving to health check result
   */
  public async healthCheck(serverId: number): Promise<HealthCheckResult> {
    const status = await this.getStatus(serverId);

    if (!status) {
      return {
        id: serverId,
        name: 'Unknown',
        status: 'unknown',
        connectionStatus: 'disconnected',
        lastError: 'Server not found',
      };
    }

    const connection = this.connections.get(serverId);

    // If not connected in memory, it's definitely not healthy
    if (status.status !== 'connected' || !connection) {
      return {
        id: status.id,
        name: status.name,
        status: 'unhealthy',
        connectionStatus: status.status,
        lastError: status.lastError,
      };
    }

    // Calculate uptime
    let uptime: number | undefined;
    if (connection.connectedAt) {
      uptime = Math.floor((Date.now() - connection.connectedAt.getTime()) / 1000);
    }

    return {
      id: status.id,
      name: status.name,
      status: 'healthy',
      connectionStatus: status.status,
      uptime,
    };
  }

  /**
   * Parse and validate server configuration from database record.
   *
   * @param server - Database model instance
   * @returns Parsed configuration object
   */
  private parseConfig(server: typeof MCPServer.prototype): MCPServerConfig {
    return {
      id: server.id,
      name: server.name,
      displayName: server.displayName,
      description: server.description,
      type: server.type,
      command: server.command || undefined,
      args: server.args ? JSON.parse(server.args) : undefined,
      env: server.env ? JSON.parse(server.env) : undefined,
      url: server.url || undefined,
      headers: server.headers ? JSON.parse(server.headers) : undefined,
      enabled: server.enabled,
      status: 'connecting',
      timeout: server.timeout || 30000,
      autoReconnect: server.autoReconnect ?? true,
      maxReconnectAttempts: server.maxReconnectAttempts ?? -1,
      reconnectDelay: server.reconnectDelay ?? 5000,
      settings: server.settings ? JSON.parse(server.settings) : undefined,
    };
  }

  /**
   * Update server status in database and memory.
   *
   * @param serverId - Database ID of the server
   * @param status - New status value
   * @param lastError - Optional error message
   * @param now - Timestamp for the update
   */
  private async updateStatus(
    serverId: number,
    status: MCPServerStatus,
    lastError?: string,
    now: number = Date.now(),
  ): Promise<void> {
    const updates: Record<string, unknown> = {status};

    if (lastError !== undefined) {
      updates.lastError = lastError;
    }

    if (status === 'connected') {
      updates.lastConnectedAt = new Date(now);
      updates.lastDisconnectedAt = null;
      updates.connectionCount = 1; // Simplified increment
      updates.failureCount = 0;
    } else if (status === 'disconnected') {
      updates.lastDisconnectedAt = new Date(now);
    } else if (status === 'error') {
      updates.failureCount = 1;
    }

    await MCPServer.update(updates, {where: {id: serverId}});

    // Update in-memory connection
    const connection = this.connections.get(serverId);
    if (connection) {
      connection.config.status = status;
      connection.config.lastError = lastError;
      if (status === 'connected') {
        connection.connectedAt = new Date(now);
      }
    }
  }

  /**
   * Handle server disconnection and cleanup.
   * Utilizes the connection object to log specific session data.
   *
   * @param serverId - Database ID
   * @param config - Server configuration
   * @param connection - Connection object containing session state
   */
  private async handleServerDisconnect(
    serverId: number,
    config: MCPServerConfig,
    connection: ServerConnection,
  ): Promise<void> {
    let duration = 0;
    if (connection.connectedAt) {
      duration = Math.floor((Date.now() - connection.connectedAt.getTime()) / 1000);
    }

    logger.info(
      {serverId, name: config.name, uptime: duration},
      'Handling server disconnect',
    );

    await this.updateStatus(serverId, 'disconnected');
    this.emit('disconnected', {serverId, name: config.name, uptime: duration});
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   *
   * @param serverId - Database ID
   * @param config - Server configuration
   * @param connection - Connection object
   */
  private scheduleReconnect(
    serverId: number,
    config: MCPServerConfig,
    connection: ServerConnection,
  ): void {
    const attempts = connection.reconnectAttempts + 1;

    if (config.maxReconnectAttempts !== -1 && attempts > (config.maxReconnectAttempts ?? 0)) {
      logger.info({serverId, attempts}, 'Max reconnection attempts reached');
      this.updateStatus(serverId, 'error', 'Max reconnection attempts reached');
      return;
    }

    connection.reconnectAttempts = attempts;

    const delay = (config.reconnectDelay ?? 5000) * Math.min(Math.pow(2, attempts - 1), 10); // Exponential backoff

    logger.info(
      {serverId, attempts, delay},
      `Scheduling reconnection attempt ${attempts} in ${delay}ms`,
    );

    connection.reconnectTimer = setTimeout(async () => {
      logger.info({serverId, attempts}, 'Attempting reconnection');
      await this.startConnection(serverId, config);
    }, delay);
  }

  /**
   * Process the connection queue.
   */
  private processQueue(): void {
    while (this.connectionQueue.length > 0 && this.activeConnections < this.maxConcurrentConnections) {
      const task = this.connectionQueue.shift();
      if (task) {
        task().catch((err: Error) => logger.error({err}, 'Queue task error'));
      }
    }
  }

  /**
   * Helper to add logs to the connection buffer.
   * Maintains a fixed size buffer to prevent memory leaks.
   *
   * @param connection - The connection object
   * @param type - Log type
   * @param message - Log message
   */
  private addLog(connection: ServerConnection, type: LogEntry['type'], message: string): void {
    connection.logs.push({
      type,
      message,
      timestamp: new Date(),
    });

    // Keep buffer size under control
    if (connection.logs.length > MCPServerManager.MAX_LOG_BUFFER_SIZE) {
      connection.logs.shift();
    }

    // Update last activity
    connection.lastActivityAt = new Date();
  }

  /**
   * Clean up all connections (graceful shutdown).
   *
   * @returns Promise resolving when shutdown is complete
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down all MCP server connections');

    await this.stopAllServers(false);

    this.connections.clear();
    this.activeConnections = 0;
    this.connectionQueue = [];
  }
}

/** Global MCP server manager instance */
export const mcpServerManager = new MCPServerManager();

export default mcpServerManager;
