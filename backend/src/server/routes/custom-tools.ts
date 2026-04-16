/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/custom-tools
 * @description API endpoints for managing custom MCP tools.
 *
 * These endpoints allow users to:
 *
 * - Create new custom tools with JavaScript handler code
 * - Read/List all custom tools
 * - Update existing custom tools
 * - Delete custom tools
 * - Test custom tools before deployment
 * - Enable/Disable custom tools dynamically
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |-----|------|-------------|
 * | GET | `/api/custom-tools` | List all custom tools |
 * | POST | `/api/custom-tools` | Create a new custom tool |
 * | GET | `/api/custom-tools/:id` | Get a specific custom tool |
 * | PUT | `/api/custom-tools/:id` | Update a custom tool |
 * | DELETE | `/api/custom-tools/:id` | Delete a custom tool |
 * | POST | `/api/custom-tools/:id/test` | Test a custom tool with arguments |
 * | POST | `/api/custom-tools/:id/toggle` | Enable/Disable a custom tool |
 * | GET | `/api/custom-tools/templates` | Get example tool templates |
 */

import {CustomTool as CustomToolModel} from '@/db/index.js';
import customToolExecutor from '@/tools/custom-tool-executor.js';
import {logger} from '@/utils/logger.js';
import type {FastifyPluginAsync} from 'fastify';
import type {CallToolResult} from '@/mcp/types.js';
import customToolsTemplates from '@/constants/custom-tools-templates';

export const customToolsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/custom-tools
   * List all custom tools with their status and metadata.
   */
  fastify.get<{
    readonly Querystring: {
      enabled?: boolean;
      category?: string;
      search?: string;
    };
  }>('/api/custom-tools', async (request, reply) => {
    const {enabled, category, search} = request.query;

    const where: Record<string, unknown> = {};

    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where[
        '$name ILIKE $OR displayName ILIKE $OR description ILIKE$'
        ] = `%${search}%`;
    }

    const tools = await CustomToolModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    return reply.send({
      total: tools.length,
      tools: tools.map((t) => ({
        id: t.id,
        name: t.name,
        displayName: t.displayName,
        description: t.description,
        enabled: t.enabled,
        category: t.category,
        icon: t.icon,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        hasTestResult: !!t.lastTestResult,
      })),
    });
  });

  /**
   * GET /api/custom-tools/:id
   * Get details of a specific custom tool including its code.
   */
  fastify.get<{ Params: { id: string } }>('/api/custom-tools/:id', async (request, reply) => {
    const {id} = request.params;
    const toolId = parseInt(id, 10);

    if (isNaN(toolId)) {
      return reply.code(400).send({error: 'Invalid tool ID'});
    }

    const tool = await CustomToolModel.findByPk(toolId);

    if (!tool) {
      return reply.code(404).send({error: 'Tool not found'});
    }

    return reply.send({
      id: tool.id,
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      inputSchema: tool.inputSchema,
      handlerCode: tool.handlerCode,
      enabled: tool.enabled,
      category: tool.category,
      icon: tool.icon,
      settings: tool.settings ? JSON.parse(tool.settings) : null,
      lastTestArgs: tool.lastTestArgs ? JSON.parse(tool.lastTestArgs) : null,
      lastTestResult: tool.lastTestResult ? JSON.parse(tool.lastTestResult) : null,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    });
  });

  /**
   * POST /api/custom-tools
   * Create a new custom MCP tool.
   *
   * ## Request Body
   * ```json
   * {
   *   "name": "my_custom_tool",
   *   "displayName": "My Custom Tool",
   *   "description": "What this tool does",
   *   "inputSchema": "{ ...JSON Schema... }",
   *   "handlerCode": "const { param } = args; return { content: [...] };",
   *   "category": "custom",
   *   "icon": "🔧",
   *   "settings": "{ ...JSON settings... }"
   * }
   * ```
   */
  fastify.post<{
    Body: {
      name: string;
      displayName: string;
      description: string;
      inputSchema: string;
      handlerCode: string;
      category?: string;
      icon?: string;
      settings?: string;
    };
  }>('/api/custom-tools', async (request, reply) => {
    const body = request.body;

    // Validate required fields
    if (!body?.name || !body?.displayName || !body?.description || !body?.inputSchema || !body?.handlerCode) {
      return reply.code(400).send({
        error: 'Missing required fields: name, displayName, description, inputSchema, handlerCode',
      });
    }

    // Validate tool name format (alphanumeric with underscores)
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!nameRegex.test(body.name)) {
      return reply.code(400).send({
        error: 'Invalid tool name. Must start with a letter and contain only letters, numbers, and underscores.',
      });
    }

    // Validate JSON schema
    const schemaValidation = customToolExecutor.validateSchema(body.inputSchema);
    if (!schemaValidation.valid) {
      return reply.code(400).send({
        error: 'Invalid input schema',
        details: schemaValidation.error,
      });
    }

    // Validate handler code syntax
    const codeValidation = customToolExecutor.validateCode(body.handlerCode);
    if (!codeValidation.valid) {
      return reply.code(400).send({
        error: 'Invalid handler code',
        details: codeValidation.error,
      });
    }

    // Check if tool name already exists
    const existing = await CustomToolModel.findOne({where: {name: body.name}});
    if (existing) {
      return reply.code(409).send({
        error: `Tool with name "${body.name}" already exists`,
      });
    }

    try {
      const tool = await CustomToolModel.create({
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        inputSchema: body.inputSchema,
        handlerCode: body.handlerCode,
        enabled: true,
        category: body.category || 'custom',
        icon: body.icon || null,
        settings: body.settings || null,
        lastTestArgs: null,
        lastTestResult: null,
      });

      // Load the tool into the executor (it will be enabled by default)
      await customToolExecutor.loadAllFromDatabase();

      logger.info({tool: tool.name, id: tool.id}, 'Custom tool created');

      return reply.status(201).send({
        status: 'created',
        tool: {
          id: tool.id,
          name: tool.name,
          displayName: tool.displayName,
          description: tool.description,
          enabled: tool.enabled,
          category: tool.category,
          icon: tool.icon,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt,
        },
      });
    } catch (err) {
      logger.error({err, body}, 'Failed to create custom tool');
      return reply.code(500).send({
        error: 'Failed to create custom tool',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * PUT /api/custom-tools/:id
   * Update an existing custom tool.
   *
   * ## Request Body
   * ```json
   * {
   *   "displayName": "Updated Tool Name",
   *   "description": "Updated description",
   *   "inputSchema": "{ ... }",
   *   "handlerCode": "const { param } = args; return { content: [...] };",
   *   "category": "updated-category",
   *   "icon": "🔧",
   *   "settings": "{ ... }"
   * }
   * ```
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      displayName?: string;
      description?: string;
      inputSchema?: string;
      handlerCode?: string;
      category?: string;
      icon?: string;
      settings?: string;
    };
  }>('/api/custom-tools/:id', async (request, reply) => {
    const {id} = request.params;
    const toolId = parseInt(id, 10);
    const body = request.body;

    if (isNaN(toolId)) {
      return reply.code(400).send({error: 'Invalid tool ID'});
    }

    const tool = await CustomToolModel.findByPk(toolId);

    if (!tool) {
      return reply.code(404).send({error: 'Tool not found'});
    }

    // If inputSchema is being updated, validate it
    if (body.inputSchema !== undefined) {
      const schemaValidation = customToolExecutor.validateSchema(body.inputSchema);
      if (!schemaValidation.valid) {
        return reply.code(400).send({
          error: 'Invalid input schema',
          details: schemaValidation.error,
        });
      }
    }

    // If handlerCode is being updated, validate it
    if (body.handlerCode !== undefined) {
      const codeValidation = customToolExecutor.validateCode(body.handlerCode);
      if (!codeValidation.valid) {
        return reply.code(400).send({
          error: 'Invalid handler code',
          details: codeValidation.error,
        });
      }
    }

    try {
      const updates: Record<string, unknown> = {};

      if (body.displayName !== undefined) updates.displayName = body.displayName;
      if (body.description !== undefined) updates.description = body.description;
      if (body.inputSchema !== undefined) updates.inputSchema = body.inputSchema;
      if (body.handlerCode !== undefined) updates.handlerCode = body.handlerCode;
      if (body.category !== undefined) updates.category = body.category;
      if (body.icon !== undefined) updates.icon = body.icon;
      if (body.settings !== undefined) updates.settings = body.settings;

      await tool.update(updates);

      // Reload the tool if it's enabled
      if (tool.enabled) {
        await customToolExecutor.reloadTool(toolId);
      }

      logger.info({tool: tool.name, id: tool.id, updates}, 'Custom tool updated');

      return reply.send({
        status: 'updated',
        tool: {
          id: tool.id,
          name: tool.name,
          displayName: tool.displayName,
          description: tool.description,
          enabled: tool.enabled,
          category: tool.category,
          icon: tool.icon,
          updatedAt: tool.updatedAt,
        },
      });
    } catch (err) {
      logger.error({err, toolId, body}, 'Failed to update custom tool');
      return reply.code(500).send({
        error: 'Failed to update custom tool',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * DELETE /api/custom-tools/:id
   * Delete a custom tool permanently.
   */
  fastify.delete<{
    Params: { id: string };
  }>('/api/custom-tools/:id', async (request, reply) => {
    const {id} = request.params;
    const toolId = parseInt(id, 10);

    if (isNaN(toolId)) {
      return reply.code(400).send({error: 'Invalid tool ID'});
    }

    const tool = await CustomToolModel.findByPk(toolId);

    if (!tool) {
      return reply.code(404).send({error: 'Tool not found'});
    }

    // Unregister from executor
    await customToolExecutor.unregisterTool(toolId);

    // Delete from database
    await tool.destroy();

    logger.info({tool: tool.name, id: tool.id}, 'Custom tool deleted');

    return reply.send({status: 'deleted', tool: tool.name});
  });

  /**
   * POST /api/custom-tools/:id/test
   * Test a custom tool with provided arguments.
   *
   * ## Request Body
   * ```json
   * {
   *   "arg1": "value1",
   *   "arg2": 123
   * }
   * ```
   */
  fastify.post<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/api/custom-tools/:id/test', async (request, reply) => {
    const {id} = request.params;
    const toolId = parseInt(id, 10);
    const args = request.body;

    if (isNaN(toolId)) {
      return reply.code(400).send({error: 'Invalid tool ID'});
    }

    const tool = await CustomToolModel.findByPk(toolId);

    if (!tool) {
      return reply.code(404).send({error: 'Tool not found'});
    }

    try {
      const result: CallToolResult = await customToolExecutor.testTool(toolId, args);

      // Update last test result in database
      await CustomToolModel.update(
        {
          lastTestArgs: JSON.stringify(args),
          lastTestResult: JSON.stringify(result),
        },
        {where: {id: toolId}},
      );

      return reply.send({
        success: !result.isError,
        result,
        // @ts-ignore
        elapsedTime: Math.round(Date.now() - (request as { startTime?: number })?.startTime || Date.now()),
      });
    } catch (err) {
      logger.error({err, toolId, args}, 'Custom tool test failed');
      return reply.code(500).send({
        error: 'Test execution failed',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * POST /api/custom-tools/:id/toggle
   * Enable or disable a custom tool.
   *
   * ## Request Body
   * ```json
   * { "enabled": true }
   * ```
   */
  fastify.post<{
    Params: { id: string };
    Body: { enabled: boolean };
  }>('/api/custom-tools/:id/toggle', async (request, reply) => {
    const {id} = request.params;
    const toolId = parseInt(id, 10);
    const body = request.body;

    if (isNaN(toolId)) {
      return reply.code(400).send({error: 'Invalid tool ID'});
    }

    if (typeof body.enabled !== 'boolean') {
      return reply.code(400).send({error: 'Must provide "enabled" boolean'});
    }

    const tool = await CustomToolModel.findByPk(toolId);

    if (!tool) {
      return reply.code(404).send({error: 'Tool not found'});
    }

    try {
      await tool.update({enabled: body.enabled});

      // If enabling, reload the tool; if disabling, unregister it
      if (body.enabled) {
        await customToolExecutor.reloadTool(toolId);
      } else {
        await customToolExecutor.unregisterTool(toolId);
      }

      logger.info({tool: tool.name, id: tool.id, enabled: body.enabled}, 'Custom tool toggled');

      return reply.send({
        status: 'toggled',
        tool: {
          id: tool.id,
          name: tool.name,
          enabled: body.enabled,
        },
      });
    } catch (err) {
      logger.error({err, toolId, enabled: body.enabled}, 'Failed to toggle custom tool');
      return reply.code(500).send({
        error: 'Failed to toggle custom tool',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /**
   * GET /api/custom-tools/templates
   * Get example tool templates to help users create custom tools.
   */
  fastify.get('/api/custom-tools/templates', async (_request, reply) => {
    return reply.send({templates: customToolsTemplates});
  });
};

export default customToolsRoutes;
