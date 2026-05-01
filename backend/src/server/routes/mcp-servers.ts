/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/mcp-servers
 * @description API endpoints for managing external MCP servers.
 *
 * These endpoints provide full CRUD operations for MCP server configurations:
 *
 * - Create, read, update, and delete MCP server configurations
 * - Start, stop, and restart server connections
 * - Monitor server health and status
 * - Test server connectivity
 * - Get server templates for quick setup
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | GET | `/api/mcp-servers` | List all MCP servers |
 * | POST | `/api/mcp-servers` | Create a new MCP server |
 * | GET | `/api/mcp-servers/:id` | Get server details |
 * | PUT | `/api/mcp-servers/:id` | Update server configuration |
 * | DELETE | `/api/mcp-servers/:id` | Delete server |
 * | POST | `/api/mcp-servers/:id/start` | Start server connection |
 * | POST | `/api/mcp-servers/:id/stop` | Stop server connection |
 * | POST | `/api/mcp-servers/:id/restart` | Restart server |
 * | GET | `/api/mcp-servers/:id/status` | Get server status |
 * | GET | `/api/mcp-servers/:id/health` | Health check |
 * | POST | `/api/mcp-servers/:id/test` | Test connectivity |
 * | GET | `/api/mcp-servers/templates` | Get server templates |
 *
 * ## Security Notes
 *
 * - MCP server commands are executed with limited permissions
 * - User-provided commands should be validated before execution
 * - Sensitive data (API keys, credentials) should use environment variables
 * - URLs are validated to prevent SSRF attacks
 *
 * ## Example Usage
 *
 * ```bash
 * # List all servers
 * curl http://localhost:3100/api/mcp-servers
 *
 * # Create a filesystem server
 * curl -X POST http://localhost:3100/api/mcp-servers \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "name": "filesystem",
 *     "displayName": "File System Access",
 *     "description": "Read/write file access",
 *     "type": "stdio",
 *     "command": "npx",
 *     "args": ["-y", "@modelcontextprotocol/server-filesystem", "/safe/path"],
 *     "enabled": true
 *   }'
 *
 * # Start a server
 * curl -X POST http://localhost:3100/api/mcp-servers/1/start
 *
 * # Check status
 * curl http://localhost:3100/api/mcp-servers/1/status
 *
 * # Stop a server
 * curl -X POST http://localhost:3100/api/mcp-servers/1/stop
 * ```
 */

import {MCPServer} from '@/db';
import {mcpServerManager} from '@/services/mcp-server-manager';
import {logger} from '@/utils/logger';
import {Op, WhereOptions} from 'sequelize';
import type {FastifyPluginAsync} from 'fastify';
import type {
  CreateMCPServerRequest,
  UpdateMCPServerRequest,
  MCPServerResponse,
  MCPServerTemplate,
} from '@/types/mcp-server';
import mcpServerTemplates from '@/constants/mcp-server-templates';

export const mcpServersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/mcp-servers
   * List all MCP servers with optional filtering and pagination.
   *
   * @query enabled - Filter by enabled status (optional)
   * @query status - Filter by connection status (optional)
   * @query search - Search in name and description (optional)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 50, max: 100)
   */
  fastify.get<{
    Querystring: {
      enabled?: string;
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
  }>('/api/mcp-servers', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          enabled: {type: 'string', enum: ['true', 'false']},
          status: {type: 'string'},
          search: {type: 'string', minLength: 1},
          page: {type: 'string', pattern: '^\\d+$'},
          limit: {type: 'string', pattern: '^\\d+$'},
        },
      },
    },
  }, async (request, reply) => {
    const {enabled, status, search, page = '1', limit = '50'} = request.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100); // Cap at 100
    const offset = (pageNum - 1) * limitNum;

    const where: WhereOptions<MCPServer> = {};

    if (enabled !== undefined) {
      where.enabled = enabled === 'true';
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      // @ts-ignore
      where[Op.or] = [
        {name: {[Op.iLike]: `%${search}%`}},
        {displayName: {[Op.iLike]: `%${search}%`}},
        {description: {[Op.iLike]: `%${search}%`}},
      ];
    }

    const {count, rows} = await MCPServer.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset,
    });

    const parse = (p: string | null) => {
      try {
      	return JSON.parse(p || '');
      } catch {
      	return {};
      }
    };

    const responses: MCPServerResponse[] = rows.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
      description: s.description,
      type: s.type,
      url: s.url || undefined,
      enabled: s.enabled,
      status: s.status,
      lastError: s.lastError || undefined,
      timeout: s.timeout || 30000,
      autoReconnect: s.autoReconnect ?? true,
      maxReconnectAttempts: s.maxReconnectAttempts ?? -1,
      reconnectDelay: s.reconnectDelay ?? 5000,
      version: s.version || undefined,
      lastConnectedAt: s.lastConnectedAt,
      connectionCount: s.connectionCount || 0,
      failureCount: s.failureCount || 0,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      args: parse(s.args),
      command: s.command,
      env: parse(s.env),
      headers: s.headers,
      settings: parse(s.settings),
      lastDisconnectedAt: s.lastDisconnectedAt,
    })) as MCPServerResponse[];

    return reply.send({
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
      servers: responses,
    });
  });

  /**
   * POST /api/mcp-servers
   * Create a new MCP server configuration.
   */
  fastify.post<{
    Body: CreateMCPServerRequest;
  }>('/api/mcp-servers', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'displayName', 'description', 'type'],
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
          },
          displayName: {type: 'string', minLength: 1, maxLength: 100},
          description: {type: 'string', minLength: 1, maxLength: 500},
          type: {type: 'string', enum: ['stdio', 'sse', 'streamable-http']},
          command: {type: 'string'},
          args: {type: 'array', items: {type: 'string'}},
          env: {type: 'object', additionalProperties: {type: 'string'}},
          url: {type: 'string', format: 'uri'},
          headers: {type: 'object', additionalProperties: {type: 'string'}},
          enabled: {type: 'boolean'},
          timeout: {type: 'number', minimum: 1000},
          autoReconnect: {type: 'boolean'},
          maxReconnectAttempts: {type: 'integer', minimum: -1},
          reconnectDelay: {type: 'number', minimum: 100},
          settings: {type: 'object'},
        },
        if: {
          properties: {type: {const: 'stdio'}},
        },
        then: {
          required: ['command'],
          properties: {
            url: false, // URL not allowed for stdio
          },
        },
        else: {
          if: {
            properties: {type: {enum: ['sse', 'streamable-http']}},
          },
          then: {
            required: ['url'],
            properties: {
              command: false, // Command not allowed for HTTP/SSE
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    // Check if server name already exists
    const existing = await MCPServer.findOne({where: {name: body.name}});
    if (existing) {
      return reply.code(409).send({
        error: `Server with name "${body.name}" already exists`,
      });
    }

    try {
      const server = await MCPServer.create({
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        type: body.type,
        command: body.command || null,
        args: body.args ? JSON.stringify(body.args) : null,
        env: body.env ? JSON.stringify(body.env) : null,
        url: body.url || null,
        headers: body.headers ? JSON.stringify(body.headers) : null,
        enabled: body.enabled ?? false,
        status: 'disconnected',
        timeout: body.timeout || 30000,
        autoReconnect: body.autoReconnect ?? true,
        maxReconnectAttempts: body.maxReconnectAttempts ?? -1,
        reconnectDelay: body.reconnectDelay ?? 5000,
        settings: body.settings ? JSON.stringify(body.settings) : null,
        version: null,
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        connectionCount: 0,
        failureCount: 0,
      });

      logger.info({server: server.name, id: server.id, type: server.type}, 'MCP server created');

      // Auto-start if enabled
      if (server.enabled) {
        logger.info({serverId: server.id}, 'Auto-starting newly created server');
        // Fire and forget, or await? Awaiting ensures status is correct immediately after creation
        await mcpServerManager.startServer(server.id);
      }

      return reply.status(201).send({
        status: 'created',
        server: {
          id: server.id,
          name: server.name,
          displayName: server.displayName,
          description: server.description,
          type: server.type,
          enabled: server.enabled,
          status: server.status,
          createdAt: server.createdAt,
        },
      });
    } catch (err) {
      logger.error({err, body}, 'Failed to create MCP server');
      return reply.code(500).send({
        error: 'Failed to create MCP server',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * GET /api/mcp-servers/:id
   * Get detailed information about a specific MCP server.
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/mcp-servers/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {type: 'string', pattern: '^\\d+$'},
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    // Get runtime status from manager
    const runtimeStatus = await mcpServerManager.getStatus(serverId);

    return reply.send({
      id: server.id,
      name: server.name,
      displayName: server.displayName,
      description: server.description,
      type: server.type,
      command: server.command,
      args: server.args ? JSON.parse(server.args) : null,
      env: server.env ? JSON.parse(server.env) : null,
      url: server.url,
      headers: server.headers ? JSON.parse(server.headers) : null,
      enabled: server.enabled,
      status: runtimeStatus?.status || server.status,
      lastError: runtimeStatus?.lastError || server.lastError,
      timeout: server.timeout || 30000,
      autoReconnect: server.autoReconnect ?? true,
      maxReconnectAttempts: server.maxReconnectAttempts ?? -1,
      reconnectDelay: server.reconnectDelay ?? 5000,
      settings: server.settings ? JSON.parse(server.settings) : null,
      version: server.version || undefined,
      lastConnectedAt: runtimeStatus?.connectedAt || server.lastConnectedAt,
      connectionCount: server.connectionCount || 0,
      failureCount: server.failureCount || 0,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
    });
  });

  /**
   * PUT /api/mcp-servers/:id
   * Update an existing MCP server configuration.
   */
  fastify.put<{
    Params: { id: string };
    Body: UpdateMCPServerRequest;
  }>('/api/mcp-servers/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z][a-zA-Z0-9_-]*$',
          },
          displayName: {type: 'string', minLength: 1, maxLength: 100},
          description: {type: 'string', minLength: 1, maxLength: 500},
          type: {type: 'string', enum: ['stdio', 'sse', 'streamable-http']},
          command: {type: 'string'},
          args: {type: 'array', items: {type: 'string'}},
          env: {type: 'object', additionalProperties: {type: 'string'}},
          url: {type: 'string', format: 'uri'},
          headers: {type: 'object', additionalProperties: {type: 'string'}},
          timeout: {type: 'number', minimum: 1000},
          autoReconnect: {type: 'boolean'},
          maxReconnectAttempts: {type: 'integer', minimum: -1},
          reconnectDelay: {type: 'number', minimum: 100},
          settings: {type: 'object'},
          enabled: {type: 'boolean'},
        },
        // Conditional logic not strictly necessary for update (partial),
        // but good to keep consistency if full type change occurs
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);
    const body = request.body;

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    // Check name uniqueness if name is being changed
    if (body.name && body.name !== server.name) {
      const existing = await MCPServer.findOne({where: {name: body.name}});
      if (existing) {
        return reply.code(409).send({
          error: `Server with name "${body.name}" already exists`,
        });
      }
    }

    // Validate type constraints if type is being updated
    if (body.type && body.type !== server.type) {
      if (body.type === 'stdio' && !body.command && !server.command) {
        return reply.code(400).send({error: 'Command is required for stdio type'});
      }
      if ((body.type === 'sse' || body.type === 'streamable-http') && !body.url && !server.url) {
        return reply.code(400).send({error: 'URL is required for http/sse types'});
      }
    }

    try {
      const updates: Record<string, unknown> = {};

      if (body.displayName !== undefined) updates.displayName = body.displayName;
      if (body.description !== undefined) updates.description = body.description;
      if (body.type !== undefined) updates.type = body.type;
      if (body.command !== undefined) updates.command = body.command;
      if (body.args !== undefined) updates.args = JSON.stringify(body.args);
      if (body.env !== undefined) updates.env = JSON.stringify(body.env);
      if (body.url !== undefined) updates.url = body.url;
      if (body.headers !== undefined) updates.headers = JSON.stringify(body.headers);
      if (body.timeout !== undefined) updates.timeout = body.timeout;
      if (body.autoReconnect !== undefined) updates.autoReconnect = body.autoReconnect;
      if (body.maxReconnectAttempts !== undefined) updates.maxReconnectAttempts = body.maxReconnectAttempts;
      if (body.reconnectDelay !== undefined) updates.reconnectDelay = body.reconnectDelay;
      if (body.settings !== undefined) updates.settings = JSON.stringify(body.settings);
      if (body.name !== undefined) updates.name = body.name;
      if (body.enabled !== undefined) updates.enabled = body.enabled;

      await server.update(updates);

      // If server is running, restart it to apply changes
      if (server.enabled) {
        // Check if runtime state is connected
        const status = await mcpServerManager.getStatus(serverId);
        if (status?.status === 'connected') {
          logger.info({serverId, server: server.name}, 'Restarting server to apply configuration changes');
          await mcpServerManager.restartServer(serverId);
        }
      }

      logger.info({serverId, server: server.name, updates}, 'MCP server updated');

      return reply.send({
        status: 'updated',
        server: {
          id: server.id,
          name: server.name,
          displayName: server.displayName,
          type: server.type,
          enabled: server.enabled,
          status: server.status,
          updatedAt: server.updatedAt,
        },
      });
    } catch (err) {
      logger.error({err, serverId, body}, 'Failed to update MCP server');
      return reply.code(500).send({
        error: 'Failed to update MCP server',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * DELETE /api/mcp-servers/:id
   * Delete an MCP server configuration and stop its connection.
   */
  fastify.delete<{
    Params: { id: string };
  }>('/api/mcp-servers/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    try {
      // Stop the server connection if running
      await mcpServerManager.stopServer(serverId, true);

      // Delete from database
      await server.destroy();

      logger.info({serverId, server: server.name}, 'MCP server deleted');

      return reply.send({
        status: 'deleted',
        server: server.name,
      });
    } catch (err) {
      logger.error({err, serverId}, 'Failed to delete MCP server');
      return reply.code(500).send({
        error: 'Failed to delete MCP server',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /api/mcp-servers/:id/start
   * Start the MCP server connection.
   */
  fastify.post<{
    Params: { id: string };
  }>('/api/mcp-servers/:id/start', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    if (!server.enabled) {
      return reply.code(400).send({
        error: 'Server is disabled. Enable it first before starting.',
      });
    }

    const success = await mcpServerManager.startServer(serverId);

    if (!success) {
      return reply.code(500).send({
        error: 'Failed to start server',
      });
    }

    return reply.send({
      status: 'started',
      server: {
        id: server.id,
        name: server.name,
        displayName: server.displayName,
      },
    });
  });

  /**
   * POST /api/mcp-servers/:id/stop
   * Stop the MCP server connection.
   */
  fastify.post<{
    Params: { id: string };
    Body: { force?: boolean };
  }>('/api/mcp-servers/:id/stop', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
      body: {
        type: 'object',
        properties: {
          force: {type: 'boolean'},
        },
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);
    const body = request.body || {};

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    const success = await mcpServerManager.stopServer(serverId, body.force ?? false);

    if (!success) {
      return reply.code(500).send({
        error: 'Failed to stop server',
      });
    }

    return reply.send({
      status: 'stopped',
      server: {
        id: server.id,
        name: server.name,
        displayName: server.displayName,
      },
    });
  });

  /**
   * POST /api/mcp-servers/:id/restart
   * Restart the MCP server connection.
   */
  fastify.post<{
    Params: { id: string };
  }>('/api/mcp-servers/:id/restart', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    const success = await mcpServerManager.restartServer(serverId);

    if (!success) {
      return reply.code(500).send({
        error: 'Failed to restart server',
      });
    }

    return reply.send({
      status: 'restarted',
      server: {
        id: server.id,
        name: server.name,
        displayName: server.displayName,
      },
    });
  });

  /**
   * GET /api/mcp-servers/:id/status
   * Get the current connection status of an MCP server.
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/mcp-servers/:id/status', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    // Validate server exists first
    const server = await MCPServer.findByPk(serverId);
    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    const status = await mcpServerManager.getStatus(serverId);

    if (!status) {
      // If manager doesn't know about it, but it exists in DB, return DB status
      return reply.send({
        id: server.id,
        status: server.status,
        lastError: server.lastError,
      });
    }

    return reply.send(status);
  });

  /**
   * GET /api/mcp-servers/:id/health
   * Perform a health check on an MCP server.
   */
  fastify.get<{
    Params: { id: string };
  }>('/api/mcp-servers/:id/health', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: {type: 'integer'},
            name: {type: 'string'},
            status: {type: 'string', enum: ['healthy', 'unhealthy', 'unknown']},
            connectionStatus: {type: 'string'},
            uptime: {type: 'number'},
            lastError: {type: 'string'},
            checkedAt: {type: 'string', format: 'date-time'},
          },
        },
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    const status = await mcpServerManager.getStatus(serverId);

    const health: {
      id: number;
      name: string;
      status: 'healthy' | 'unhealthy' | 'unknown';
      connectionStatus: string;
      uptime?: number;
      lastError?: string | null;
      checkedAt: Date;
    } = {
      id: server.id,
      name: server.name,
      status: 'unknown',
      connectionStatus: status?.status || server.status,
      checkedAt: new Date(),
    };

    if (status?.status === 'connected' && status.connectedAt) {
      health.status = 'healthy';
      health.uptime = Math.floor((Date.now() - status.connectedAt.getTime()) / 1000);
    } else if (status?.status === 'error' || server.status === 'error') {
      health.status = 'unhealthy';
      health.lastError = status?.lastError || server.lastError;
    } else if (server.enabled && status?.status === 'disconnected') {
      // If enabled but disconnected, considered unhealthy
      health.status = 'unhealthy';
    }

    return reply.send(health);
  });

  /**
   * POST /api/mcp-servers/:id/test
   * Test connectivity to an MCP server.
   * Temporarily starts the server, attempts connection, then stops it.
   */
  fastify.post<{
    Params: { id: string };
  }>('/api/mcp-servers/:id/test', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {id: {type: 'string', pattern: '^\\d+$'}},
      },
    },
  }, async (request, reply) => {
    const {id} = request.params;
    const serverId = parseInt(id, 10);

    const server = await MCPServer.findByPk(serverId);

    if (!server) {
      return reply.code(404).send({error: 'Server not found'});
    }

    // Check if already running to avoid disrupting active connection
    const currentStatus = await mcpServerManager.getStatus(serverId);
    if (currentStatus?.status === 'connected') {
      return reply.send({
        success: true,
        status: 'connected',
        message: 'Server is already running and connected',
        alreadyRunning: true,
      });
    }

    try {
      logger.info({serverId}, 'Testing server connectivity');

      // Attempt to start the server
      const startSuccess = await mcpServerManager.startServer(serverId);

      if (!startSuccess) {
        return reply.send({
          success: false,
          status: 'error',
          message: 'Failed to start server for testing',
        });
      }

      // Wait dynamically based on server timeout, default 2s
      const waitTime = Math.min((server.timeout || 30000) / 2, 5000);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      const status = await mcpServerManager.getStatus(serverId);

      // Stop the server after test
      await mcpServerManager.stopServer(serverId, false);

      return reply.send({
        success: status?.status === 'connected',
        status: status?.status || 'unknown',
        message: status?.status === 'connected'
          ? 'Connection test successful'
          : 'Connection test failed',
        lastError: status?.lastError || server.lastError,
      });
    } catch (err) {
      logger.error({err, serverId}, 'Server test failed');
      return reply.code(500).send({
        error: 'Test execution failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * GET /api/mcp-servers/templates
   * Get pre-defined server templates for quick setup.
   */
  fastify.get('/api/mcp-servers/templates', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            templates: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {type: 'string'},
                  name: {type: 'string'},
                  displayName: {type: 'string'},
                  description: {type: 'string'},
                  type: {type: 'string'},
                  command: {type: 'string'},
                  args: {type: 'array', items: {type: 'string'}},
                  env: {type: 'object', additionalProperties: {type: 'string'}},
                  notes: {type: 'string'},
                  documentationUrl: {type: 'string'},
                  category: {type: 'string'},
                  icon: {type: 'string'},
                  tags: {type: 'array', items: {type: 'string'}},
                  runtime: {type: 'string'},
                  homepage: {type: 'string'},
                  variables: {type: 'array', items: {type: 'object', additionalProperties: true}},
                },
              }, // Simplified for brevity
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    return reply.send({
      templates: mcpServerTemplates as MCPServerTemplate[],
    });
  });
};

export default mcpServersRoutes;

/**
 * CHANGELOG
 *
 * 2024-05-20:
 *  - Replaced manual validation functions with Fastify JSON Schema validation for all routes.
 *  - Improved performance by utilizing Sequelize's `Op` operator for search queries instead of raw string interpolation.
 *  - Added pagination support (page/limit) to the GET /api/mcp-servers list endpoint.
 *  - Added `Op` import from sequelize for safer querying.
 *  - Fixed JSON Schema conditional logic for `stdio` vs `http/sse` types during creation.
 *  - Enhanced error handling in DELETE route to wrap DB and Manager operations in try/catch.
 *  - Improved test endpoint to check if server is already running before attempting a restart.
 *  - Added unique name validation during UPDATE operation (preventing renaming to an existing name).
 *  - Fixed schema types for `env` and `headers` (objects) vs `args` (array).
 *  - Standardized response shapes in schemas.
 *  - Added missing `required` fields in schemas.
 */
