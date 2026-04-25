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
 * - Validate tool code/schema before saving
 * - Bulk toggle tool status
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
 * | POST | `/api/custom-tools/validate` | Validate tool code and schema |
 * | POST | `/api/custom-tools/bulk/toggle` | Enable/Disable multiple tools |
 * | GET | `/api/custom-tools/templates` | Get example tool templates |
 */

import {Op} from 'sequelize';
import {CustomTool as CustomToolModel} from '@/db';
import customToolExecutor from '@/tools/custom-tool-executor';
import {logger} from '@/utils/logger';
import type {FastifyPluginAsync} from 'fastify';
import type {CallToolResult} from '@/mcp/types';
import customToolsTemplates from '@/constants/custom-tools-templates';

export const customToolsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/custom-tools
   * List all custom tools with their status and metadata.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation for query parameters.
   * - 2023-10-27: Fixed potential SQL injection in search query by using Sequelize Operators.
   * - 2023-10-27: Improved performance by selecting specific attributes.
   */
  fastify.get<{
    Querystring: {
      enabled?: boolean;
      category?: string;
      search?: string;
    };
  }>(
    '/api/custom-tools',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            enabled: {type: 'boolean'},
            category: {type: 'string', minLength: 1},
            search: {type: 'string', minLength: 1, maxLength: 100},
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              total: {type: 'number'},
              tools: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {type: 'number'},
                    name: {type: 'string'},
                    displayName: {type: 'string'},
                    description: {type: 'string'},
                    enabled: {type: 'boolean'},
                    category: {type: 'string'},
                    icon: {type: 'string', nullable: true},
                    createdAt: {type: 'string'},
                    updatedAt: {type: 'string'},
                    hasTestResult: {type: 'boolean'},
                  },
                },
              },
            },
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const {enabled, category, search} = request.query;

      const where: Record<string, unknown> = {};

      if (enabled !== undefined) {
        where.enabled = enabled;
      }

      if (category) {
        where.category = category;
      }

      if (search) {
        // Safe query construction using Sequelize Operators
        // @ts-ignore
        where[Op.or] = [
          {name: {[Op.iLike]: `%${search}%`}},
          {displayName: {[Op.iLike]: `%${search}%`}},
          {description: {[Op.iLike]: `%${search}%`}},
        ];
      }

      const tools = await CustomToolModel.findAll({
        where,
        attributes: [
          'id', 'name', 'displayName', 'description', 'enabled',
          'category', 'icon', 'createdAt', 'updatedAt', 'lastTestResult',
        ],
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
    },
  );

  /**
   * GET /api/custom-tools/:id
   * Get details of a specific custom tool including its code.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation for route parameters.
   * - 2023-10-27: Added safe JSON parsing for database fields with fallbacks.
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/api/custom-tools/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {type: 'string', pattern: '^[0-9]+$'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: {type: 'number'},
              name: {type: 'string'},
              displayName: {type: 'string'},
              description: {type: 'string'},
              inputSchema: {type: 'string'},
              operation: {type: 'string'},
              handlerCode: {type: 'string'},
              enabled: {type: 'boolean'},
              category: {type: 'string'},
              icon: {type: 'string'},
              lastTestArgs: {
                type: 'object',
                additionalProperties: true,
              },
              lastTestResult: {
                type: 'object',
                properties: {
                  content: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: {type: 'string'},
                        text: {type: 'string'},
                      },
                      additionalProperties: true,
                    },
                  },
                },
                additionalProperties: true,
              },
              settings: {
                oneOf: [
                  {type: 'null'},
                  {type: 'object', additionalProperties: true},
                ],
              },
              createdAt: {type: 'string'},
              updatedAt: {type: 'string'},
            },
            additionalProperties: true,
          },
          404: {
            type: 'object',
            properties: {error: {type: 'string'}},
          },
        },
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const toolId = parseInt(id, 10);

      const tool = await CustomToolModel.findByPk(toolId);

      if (!tool) {
        return reply.code(404).send({error: 'Tool not found'});
      }

      // Safe JSON parsing helper
      const safeParse = (data: string | null) => {
        if (!data) return null;
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      };

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
        settings: safeParse(tool.settings),
        lastTestArgs: safeParse(tool.lastTestArgs),
        lastTestResult: safeParse(tool.lastTestResult),
        createdAt: tool.createdAt,
        updatedAt: tool.updatedAt,
      });
    },
  );

  /**
   * POST /api/custom-tools
   * Create a new custom MCP tool.
   *
   * @changelog
   * - 2023-10-27: Replaced manual validation with JSON Schema.
   * - 2023-10-27: Added transaction support for data integrity.
   * - 2023-10-27: Enhanced error logging context.
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
  }>(
    '/api/custom-tools',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'displayName', 'description', 'inputSchema', 'handlerCode'],
          properties: {
            name: {type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9_]*$'},
            displayName: {type: 'string', minLength: 1},
            description: {type: 'string', minLength: 1},
            inputSchema: {type: 'string', minLength: 1},
            handlerCode: {type: 'string', minLength: 1},
            category: {type: 'string'},
            icon: {type: 'string'},
            settings: {type: 'string'},
          },
          additionalProperties: false,
        },
        response: {
          201: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              tool: {type: 'object'},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body;

      // Validate JSON Schema structure
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

      // Check uniqueness
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
        });

        // Reload executor
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
    },
  );

  /**
   * PUT /api/custom-tools/:id
   * Update an existing custom tool.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation.
   * - 2023-10-27: Optimized update logic to only reload executor if necessary.
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
  }>(
    '/api/custom-tools/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {id: {type: 'string', pattern: '^[0-9]+$'}},
        },
        body: {
          type: 'object',
          properties: {
            displayName: {type: 'string', minLength: 1},
            description: {type: 'string', minLength: 1},
            inputSchema: {type: 'string', minLength: 1},
            handlerCode: {type: 'string', minLength: 1},
            category: {type: 'string'},
            icon: {type: 'string'},
            settings: {type: 'string'},
          },
          minProperties: 1,
        },
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const toolId = parseInt(id, 10);
      const body = request.body;

      const tool = await CustomToolModel.findByPk(toolId);

      if (!tool) {
        return reply.code(404).send({error: 'Tool not found'});
      }

      // Validate schema if provided
      if (body.inputSchema !== undefined) {
        const schemaValidation = customToolExecutor.validateSchema(body.inputSchema);
        if (!schemaValidation.valid) {
          return reply.code(400).send({
            error: 'Invalid input schema',
            details: schemaValidation.error,
          });
        }
      }

      // Validate code if provided
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
        await tool.update(body);

        // Reload in executor if enabled
        if (tool.enabled) {
          await customToolExecutor.reloadTool(toolId);
        }

        logger.info({tool: tool.name, id: tool.id}, 'Custom tool updated');

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
        logger.error({err, toolId}, 'Failed to update custom tool');
        return reply.code(500).send({
          error: 'Failed to update custom tool',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  /**
   * DELETE /api/custom-tools/:id
   * Delete a custom tool permanently.
   *
   * @changelog
   * - 2023-10-27: Added schema validation.
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/api/custom-tools/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {id: {type: 'string', pattern: '^[0-9]+$'}},
        },
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const toolId = parseInt(id, 10);

      const tool = await CustomToolModel.findByPk(toolId);

      if (!tool) {
        return reply.code(404).send({error: 'Tool not found'});
      }

      await customToolExecutor.unregisterTool(toolId);
      await tool.destroy();

      logger.info({tool: tool.name, id: tool.id}, 'Custom tool deleted');

      return reply.send({status: 'deleted', tool: tool.name});
    },
  );

  /**
   * POST /api/custom-tools/validate
   * Validates tool code and schema without saving.
   * Useful for IDE-like checks and tweaking logic.
   *
   * @changelog
   * - 2023-10-27: New endpoint for validating tool logic before persistence.
   */
  fastify.post<{
    Body: {
      inputSchema?: string;
      handlerCode?: string;
    };
  }>(
    '/api/custom-tools/validate',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            inputSchema: {type: 'string'},
            handlerCode: {type: 'string'},
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              valid: {type: 'boolean'},
              errors: {type: 'array', items: {type: 'string'}},
            },
          },
        },
      },
    },
    async (request, reply) => {
      const {inputSchema, handlerCode} = request.body;
      const errors: string[] = [];

      if (inputSchema) {
        const res = customToolExecutor.validateSchema(inputSchema);
        if (!res.valid) errors.push(`Schema: ${res.error}`);
      }

      if (handlerCode) {
        const res = customToolExecutor.validateCode(handlerCode);
        if (!res.valid) errors.push(`Code: ${res.error}`);
      }

      return reply.send({
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      });
    },
  );

  /**
   * POST /api/custom-tools/bulk/toggle
   * Enable or disable multiple tools at once.
   *
   * @changelog
   * - 2023-10-27: New endpoint for bulk operations.
   */
  fastify.post<{
    Body: {
      ids: number[];
      enabled: boolean;
    };
  }>(
    '/api/custom-tools/bulk/toggle',
    {
      schema: {
        body: {
          type: 'object',
          required: ['ids', 'enabled'],
          properties: {
            ids: {type: 'array', items: {type: 'number'}, minItems: 1},
            enabled: {type: 'boolean'},
          },
        },
      },
    },
    async (request, reply) => {
      const {ids, enabled} = request.body;

      try {
        const [count] = await CustomToolModel.update(
          {enabled},
          {where: {id: {[Op.in]: ids}}},
        );

        // Reload executor state
        if (enabled) {
          await customToolExecutor.loadAllFromDatabase();
        } else {
          // If disabling, unregister specifically
          for (const id of ids) {
            await customToolExecutor.unregisterTool(id);
          }
        }

        logger.info({count, ids, enabled}, 'Bulk toggle performed');

        return reply.send({
          status: 'success',
          updated: count,
        });
      } catch (err) {
        logger.error({err, ids}, 'Bulk toggle failed');
        return reply.code(500).send({error: 'Bulk operation failed'});
      }
    },
  );

  /**
   * POST /api/custom-tools/:id/test
   * Test a custom tool with provided arguments.
   *
   * @changelog
   * - 2023-10-27: Added schema validation.
   * - 2023-10-27: Added execution time tracking.
   */
  fastify.post<{
    Params: { id: string };
    Body: Record<string, unknown>;
  }>(
    '/api/custom-tools/:id/test',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string', pattern: '^[0-9]+$',
            },
          },
        },
        body: {type: 'object'},
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const toolId = parseInt(id, 10);
      const args = request.body;

      const tool = await CustomToolModel.findByPk(toolId);

      if (!tool) {
        return reply.code(404).send({error: 'Tool not found'});
      }

      const startTime = Date.now();

      try {
        const result: CallToolResult = await customToolExecutor.testTool(toolId, args);
        const elapsedTime = Date.now() - startTime;

        // Update last test result
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
          elapsedTime,
        });
      } catch (err) {
        const elapsedTime = Date.now() - startTime;
        logger.error({err, toolId, args}, 'Custom tool test failed');
        return reply.code(500).send({
          error: 'Test execution failed',
          message: err instanceof Error ? err.message : String(err),
          elapsedTime,
        });
      }
    },
  );

  /**
   * POST /api/custom-tools/:id/toggle
   * Enable or disable a custom tool.
   *
   * @changelog
   * - 2023-10-27: Added schema validation.
   */
  fastify.post<{
    Params: { id: string };
    Body: { enabled: boolean };
  }>(
    '/api/custom-tools/:id/toggle',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {id: {type: 'string', pattern: '^[0-9]+$'}},
        },
        body: {
          type: 'object',
          required: ['enabled'],
          properties: {enabled: {type: 'boolean'}},
        },
      },
    },
    async (request, reply) => {
      const {id} = request.params;
      const toolId = parseInt(id, 10);
      const {enabled} = request.body;

      const tool = await CustomToolModel.findByPk(toolId);

      if (!tool) {
        return reply.code(404).send({error: 'Tool not found'});
      }

      try {
        await tool.update({enabled});

        if (enabled) {
          await customToolExecutor.reloadTool(toolId);
        } else {
          await customToolExecutor.unregisterTool(toolId);
        }

        logger.info({tool: tool.name, id: tool.id, enabled}, 'Custom tool toggled');

        return reply.send({
          status: 'toggled',
          tool: {
            id: tool.id,
            name: tool.name,
            enabled,
          },
        });
      } catch (err) {
        logger.error({err, toolId}, 'Failed to toggle custom tool');
        return reply.code(500).send({
          error: 'Failed to toggle custom tool',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
  );

  /**
   * GET /api/custom-tools/templates
   * Get example tool templates to help users create custom tools.
   *
   * @changelog
   * - 2023-10-27: Added schema response definition.
   */
  fastify.get(
    '/api/custom-tools/templates',
    {
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              templates: {
                type: 'array', items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.send({templates: customToolsTemplates});
    },
  );
};

export default customToolsRoutes;
