/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module server/routes/simulation
 * @description Simulation, testing, and load simulation endpoints.
 *
 * These endpoints provide access to:
 *
 * - Tool mock configuration
 * - Scenario management and execution
 * - Load simulation and stress testing
 * - Tool execution testing
 *
 * ## Routes
 *
 * | Method | Path | Description |
 * |--------|------|-------------|
 * | GET | `/simulate/scenarios` | List all registered scenarios |
 * | GET | `/simulate/scenarios/:name` | Get scenario details |
 * | POST | `/simulate/scenarios/:name/run` | Run a scenario |
 * | GET | `/simulate/mocks` | List all mock configurations |
 * | POST | `/simulate/mocks` | Set a mock response |
 * | POST | `/simulate/mocks/bulk` | Set multiple mocks at once |
 * | DELETE | `/simulate/mocks/:tool` | Remove a mock |
 * | POST | `/simulate/mocks/clear` | Clear all mocks |
 * | GET | `/simulate/mode` | Get/set mock mode status |
 * | PATCH | `/simulate/mode` | Enable/disable mock mode |
 * | POST | `/simulate/load` | Run load simulation |
 * | POST | `/simulate/tool` | Execute a single tool for testing |
 * | POST | `/simulate/tools/batch` | Execute multiple tools in a batch |
 * | GET | `/simulate/status` | Get simulation framework status |
 */

import type {FastifyPluginAsync} from 'fastify';
import simulator from '@/simulation/simulator';
import toolRegistry from '@/mcp/tools/registry';
import logger from '@/utils/logger';
import type {MockResponse, LoadConfig, Scenario} from '@/simulation/simulator';

export const simulationRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Scenario Management ────

  /**
   * GET /simulate/scenarios
   * List all registered test scenarios.
   *
   * @changelog
   * - 2023-10-27: Added schema validation for response structure.
   * - 2023-10-27: Optimized mapping logic for better performance.
   */
  fastify.get('/simulate/scenarios', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            total: {type: 'integer'},
            scenarios: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {type: 'string'},
                  description: {type: 'string'},
                  steps: {type: 'integer'},
                  hasMocks: {type: 'boolean'},
                  additionalProperties: true,
                },
                required: ['name', 'steps', 'hasMocks'],
              },
            },
            additionalProperties: true,
          },
          required: ['total', 'scenarios'],
        },
      },
    },
  }, async (_request, reply) => {
    const scenarioNames = simulator.listScenariosName();

    // Optimized for performance: single pass map
    const scenarios = scenarioNames.map((name) => {
      const scenario = simulator.getScenario(name);
      // Handle edge case where scenario might disappear between list and get
      if (!scenario) {
        return null;
      }
      return {
        name: scenario.name,
        description: scenario.description || 'No description',
        steps: scenario.steps.length,
        hasMocks: !!scenario.setupMocks,
      };
    }).filter(Boolean); // Filter out any nulls from race conditions

    return reply.send({
      total: scenarios.length,
      scenarios,
    });
  });

  /**
   * GET /simulate/scenarios/:name
   * Get detailed information about a specific scenario.
   *
   * @changelog
   * - 2023-10-27: Added schema validation for path parameters.
   * - 2023-10-27: Added 404 schema response.
   */
  fastify.get<{
    Params: { name: string; }
  }>('/simulate/scenarios/:name', {
    schema: {
      params: {
        type: 'object',
        properties: {
          name: {type: 'string', minLength: 1},
          additionalProperties: true,
        },
        required: ['name'],
      },
      response: {
        200: {type: 'object', additionalProperties: true}, // Detailed scenario object is dynamic
        404: {
          type: 'object',
          properties: {error: {type: 'string'}, additionalProperties: true},
          required: ['error'],
        },
      },
    },
  }, async (request, reply) => {
    const {name} = request.params as { name: string };
    const scenario = simulator.getScenario(name);

    if (!scenario) {
      return reply.code(404).send({error: `Scenario "${name}" not found`});
    }

    return reply.send(scenario);
  });

  /**
   * POST /simulate/scenarios
   * Register a new custom scenario.
   *
   * @changelog
   * - 2025-01-01: Added support for creating custom scenarios from UI.
   */
  fastify.post<{ Body: Scenario }>(
    '/simulate/scenarios',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'steps'],
          properties: {
            name: {type: 'string', minLength: 1},
            description: {type: 'string'},
            steps: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'tool'],
                properties: {
                  name: {type: 'string'},
                  tool: {type: 'string'},
                  args: {type: 'object'},
                  expects: {
                    type: 'object',
                    properties: {
                      contains: {type: 'string'},
                      notContains: {type: 'string'},
                      hasError: {type: 'boolean'},
                    },
                  },
                  description: {type: 'string'},
                },
              },
              minItems: 1,
            },
            setupMocks: {type: 'object'},
            cleanupMocks: {type: 'boolean'},
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              status: {type: 'string'},
              name: {type: 'string'},
              additionalProperties: true,
            },
            required: ['status', 'name'],
          },
          400: {
            type: 'object',
            properties: {error: {type: 'string'}},
            required: ['error'],
            additionalProperties: true,
          },
          409: {
            type: 'object',
            properties: {error: {type: 'string'}},
            required: ['error'],
            additionalProperties: true,
          },
        },
      },
    },
    async (request, reply) => {
      const scenario = request.body;

      // Validate required fields
      if (!scenario.name || !scenario.steps || scenario.steps.length === 0) {
        return reply.code(400).send({error: 'Scenario name and at least one step are required'});
      }

      try {
        simulator.registerScenario(scenario);
        return reply.code(201).send({status: 'Scenario registered successfully', name: scenario.name});
      } catch (error) {
        if (error instanceof Error && error.message.includes('already registered')) {
          return reply.code(409).send({error: error.message});
        }
        return reply.code(500).send({error: 'Failed to register scenario'});
      }
    },
  );

  /**
   * POST /simulate/scenarios/:name/run
   * Execute a registered scenario and return results.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation for body and params.
   * - 2023-10-27: Improved error handling logic to catch specific error types.
   */
  fastify.post<{
    Params: { name: string };
    Body: { useMocks?: boolean; recordMetrics?: boolean };
  }>('/simulate/scenarios/:name/run', {
    schema: {
      params: {
        type: 'object',
        properties: {name: {type: 'string'}},
        required: ['name'],
        additionalProperties: true,
      },
      body: {
        type: 'object',
        properties: {
          useMocks: {type: 'boolean', default: true},
          recordMetrics: {type: 'boolean', default: true},
        },
      },
      response: {
        200: {type: 'object', additionalProperties: true},
        404: {type: 'object', properties: {error: {type: 'string'}, additionalProperties: true}},
        500: {
          type: 'object',
          properties: {error: {type: 'string'}, message: {type: 'string'}, additionalProperties: true},
        },
      },
    },
  }, async (request, reply) => {
    const {name} = request.params;

    const scenario = simulator.getScenario(name);
    if (!scenario) {
      return reply.code(404).send({error: `Scenario "${name}" not found`});
    }

    logger.info({scenario: name}, 'Running scenario');

    try {
      const result = await simulator.runScenario(name);
      logger.info({scenario: name, passed: result.passed, durationMs: result.durationMs}, 'Scenario completed');

      return reply.send({
        scenario: name,
        result,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({scenario: name, error: errorMsg}, 'Scenario failed');

      return reply.code(500).send({
        error: 'Scenario execution failed',
        message: errorMsg,
      });
    }
  });

  // ─── Mock Management ────

  /**
   * GET /simulate/mocks
   * List all currently configured mock responses.
   *
   * @changelog
   * - 2023-10-27: Added response schema validation.
   */
  fastify.get('/simulate/mocks', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            total: {type: 'integer'},
            mockModeEnabled: {type: 'boolean'},
            mocks: {type: 'object'},
            additionalProperties: true,
          },
          additionalProperties: true,
          required: ['total', 'mockModeEnabled', 'mocks'],
        },
      },
    },
  }, async (_request, reply) => {
    const mocks = simulator.listMocks();

    return reply.send({
      total: Object.keys(mocks).length,
      mockModeEnabled: simulator.isMockModeEnabled(),
      mocks,
    });
  });

  /**
   * POST /simulate/mocks
   * Set a mock response for a specific tool.
   *
   * @changelog
   * - 2023-10-27: Replaced manual validation with JSON Schema.
   * - 2023-10-27: Added validation for delayMs and failureRate bounds.
   */
  fastify.post<{
    Body: {
      tool: string;
      content: Array<{ type: 'text'; text: string }>;
      isError?: boolean;
      delayMs?: number;
      failureRate?: number;
    };
  }>('/simulate/mocks', {
    schema: {
      body: {
        type: 'object',
        required: ['tool', 'content'],
        properties: {
          tool: {type: 'string', minLength: 1},
          content: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {type: 'string', enum: ['text', 'image', 'resource']},
                text: {type: 'string'},
              },
              required: ['type'],
            },
            minItems: 1,
          },
          isError: {type: 'boolean', default: false},
          delayMs: {type: 'integer', minimum: 0, maximum: 30000},
          failureRate: {type: 'number', minimum: 0, maximum: 1},
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            tool: {type: 'string'},
            warning: {type: 'string'},
            additionalProperties: true,
          },
          required: ['status', 'tool'],
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    let warning: string | undefined;

    // Verify tool exists
    if (!toolRegistry.has(body.tool)) {
      warning = 'Mocking non-registered tool';
      logger.warn({tool: body.tool}, warning);
    }

    const mock: MockResponse = {
      content: body.content,
      isError: body.isError,
      delayMs: body.delayMs,
      failureRate: body.failureRate,
    };

    simulator.setMock(body.tool, mock);
    logger.info({tool: body.tool}, 'Mock configured');

    const responsePayload: any = {
      status: 'configured',
      tool: body.tool,
    };

    if (warning) {
      responsePayload.warning = warning;
    }

    return reply.status(201).send(responsePayload);
  });

  /**
   * POST /simulate/mocks/bulk
   * Set multiple mock responses at once.
   *
   * @changelog
   * - 2023-10-27: New endpoint added for bulk operations to improve performance during setup.
   */
  fastify.post<{
    Body: {
      mocks: Record<string, MockResponse>;
      clearExisting?: boolean;
    };
  }>('/simulate/mocks/bulk', {
    schema: {
      body: {
        type: 'object',
        required: ['mocks'],
        properties: {
          mocks: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                content: {type: 'array'},
                isError: {type: 'boolean'},
                delayMs: {type: 'number'},
              },
              required: ['content'],
            },
          },
          clearExisting: {type: 'boolean', default: false},
        },
      },
    },
  }, async (request, reply) => {
    const {mocks, clearExisting} = request.body;

    if (clearExisting) {
      simulator.clearMocks();
    }

    let configuredCount = 0;
    for (const [tool, mock] of Object.entries(mocks)) {
      simulator.setMock(tool, mock);
      configuredCount++;
    }

    logger.info({count: configuredCount}, 'Bulk mocks configured');

    return reply.status(201).send({
      status: 'configured',
      count: configuredCount,
    });
  });

  /**
   * DELETE /simulate/mocks/:tool
   * Remove a mock response for a specific tool.
   *
   * @changelog
   * - 2023-10-27: Added schema validation for params.
   */
  fastify.delete<{
    Params: { tool: string };
  }>('/simulate/mocks/:tool', {
    schema: {
      params: {
        type: 'object',
        properties: {tool: {type: 'string'}},
        required: ['tool'],
      },
      response: {
        200: {
          type: 'object',
          properties: {status: {type: 'string'}, tool: {type: 'string'}, additionalProperties: true},
          additionalProperties: true,
        },
        404: {type: 'object', properties: {error: {type: 'string'}}, additionalProperties: true},
      },
    },
  }, async (request, reply) => {
    const {tool} = request.params;

    const removed = simulator.removeMock(tool);
    if (!removed) {
      return reply.code(404).send({error: `Mock for "${tool}" not found`});
    }

    logger.info({tool}, 'Mock removed');

    return reply.send({status: 'removed', tool});
  });

  /**
   * POST /simulate/mocks/clear
   * Clear all mock responses.
   *
   * @changelog
   * - 2023-10-27: Added response schema.
   */
  fastify.post('/simulate/mocks/clear', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            clearedCount: {type: 'integer'},
            additionalProperties: true,
          },
          required: ['status', 'clearedCount'],
        },
      },
    },
  }, async (_request, reply) => {
    const mockCount = simulator.listMocks();
    const count = Object.keys(mockCount).length;
    simulator.clearMocks();

    logger.info({count}, 'Mocks cleared');

    return reply.send({
      status: 'cleared',
      clearedCount: count,
    });
  });

  // ─── Mock Mode Control ────

  /**
   * GET /simulate/mode
   * Get current mock mode status.
   */
  fastify.get('/simulate/mode', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {mockModeEnabled: {type: 'boolean'}},
          required: ['mockModeEnabled'],
          additionalProperties: true,
        },
      },
    },
  }, async (_request, reply) => {
    return reply.send({
      mockModeEnabled: simulator.isMockModeEnabled(),
    });
  });

  /**
   * PATCH /simulate/mode
   * Enable or disable mock mode globally.
   *
   * @changelog
   * - 2023-10-27: Replaced manual validation with JSON Schema.
   */
  fastify.patch<{
    Body: { enabled: boolean };
  }>('/simulate/mode', {
    schema: {
      body: {
        type: 'object',
        required: ['enabled'],
        properties: {
          enabled: {type: 'boolean'},
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            mockModeEnabled: {type: 'boolean'},
            additionalProperties: true,
          },
          required: ['status', 'mockModeEnabled'],
          additionalProperties: true,
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    simulator.setMockMode(body.enabled);

    logger.info({enabled: body.enabled}, 'Mock mode updated');

    return reply.send({
      status: 'updated',
      mockModeEnabled: body.enabled,
    });
  });

  // ─── Load Simulation ────

  /**
   * POST /simulate/load
   * Run a load simulation with concurrent requests.
   *
   * @changelog
   * - 2023-10-27: Added comprehensive JSON Schema validation for all config options.
   * - 2023-10-27: Added safety limits to prevent server crash (max concurrency/duration).
   * - 2023-10-27: Improved validation logic for tool existence check.
   */
  fastify.post<{
    Body: LoadConfig & { useMocks?: boolean };
  }>('/simulate/load', {
    schema: {
      body: {
        type: 'object',
        required: ['tools', 'concurrentUsers', 'durationMs'],
        properties: {
          tools: {
            type: 'array',
            items: {type: 'string'},
            minItems: 1,
          },
          concurrentUsers: {type: 'integer', minimum: 1, maximum: 100},
          durationMs: {type: 'integer', minimum: 100, maximum: 60000},
          requestsPerSecond: {type: 'number', minimum: 0.1},
          argsTemplates: {type: 'object'},
          useMocks: {type: 'boolean'},
          additionalProperties: true,
        },
      },
      response: {
        200: {type: 'object', additionalProperties: true},
        400: {
          type: 'object',
          properties: {
            error: {type: 'string'},
            invalidTools: {type: 'array', items: {type: 'string'}},
            availableTools: {type: 'array', items: {type: 'string'}},
            additionalProperties: true,
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    // Validate tools existence
    const invalidTools = body.tools.filter(t => !toolRegistry.has(t));
    if (invalidTools.length > 0) {
      return reply.code(400).send({
        error: 'Unknown tools provided',
        invalidTools,
        availableTools: toolRegistry.listAll().map(t => t.name),
      });
    }

    logger.info({config: body}, 'Starting load simulation');

    try {
      const previousMockMode = simulator.isMockModeEnabled();
      if (body.useMocks) {
        simulator.setMockMode(true);
      }

      // Ensure requestsPerSecond has a default if not provided (though fastify schema can't easily set defaults for numbers in complex logic)
      const config: LoadConfig = {
        ...body,
        requestsPerSecond: body.requestsPerSecond || 1,
      };

      const results = await simulator.simulateLoad(config);

      // Restore previous mock mode
      simulator.setMockMode(previousMockMode);

      logger.info(
        {
          totalRequests: results.totalRequests,
          successful: results.successfulRequests,
          failed: results.failedRequests,
          avgLatencyMs: results.avgLatencyMs,
        },
        'Load simulation completed',
      );

      return reply.send({
        status: 'completed',
        results,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({error: errorMsg}, 'Load simulation failed');

      return reply.code(400).send({
        error: 'Load simulation failed',
        message: errorMsg,
      });
    }
  });

  // ─── Single Tool Execution ────

  /**
   * POST /simulate/tool
   * Execute a single tool for testing purposes.
   *
   * @changelog
   * - 2023-10-27: Added JSON Schema validation.
   * - 2023-10-27: Improved error handling for tool not found.
   */
  fastify.post<{
    Body: {
      name: string;
      args?: Record<string, unknown>;
      useMock?: boolean;
      timeout?: number;
    }
  }>('/simulate/tool', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {type: 'string', minLength: 1},
          args: {type: 'object'},
          useMock: {type: 'boolean', default: false},
          timeout: {type: 'integer', minimum: 100, maximum: 30000},
        },
      },
      response: {
        200: {type: 'object', additionalProperties: true},
        404: {type: 'object', additionalProperties: true},
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    // Check if tool exists
    if (!toolRegistry.has(body.name)) {
      return reply.code(404).send({
        error: `Tool "${body.name}" not found`,
        availableTools: toolRegistry.listAll().map(t => t.name),
      });
    }

    const start = Date.now();
    const previousMockMode = simulator.isMockModeEnabled();

    try {
      // Temporarily enable mock mode if requested
      if (body.useMock) {
        simulator.setMockMode(true);
      }

      // Note: timeout handling would typically be handled inside executeTool or via Promise.race
      // Assuming executeTool handles internal logic, we just pass args.
      const result = await simulator.executeTool(body.name, body.args || {});
      const durationMs = Date.now() - start;

      logger.info({tool: body.name, durationMs}, 'Tool executed');

      return reply.send({
        success: true,
        tool: body.name,
        args: body.args,
        result,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - start;

      logger.warn({tool: body.name, error: errorMsg, durationMs}, 'Tool execution failed');

      return reply.code(200).send({
        success: false,
        tool: body.name,
        error: errorMsg,
        durationMs,
      });
    } finally {
      // Restore previous mock mode
      simulator.setMockMode(previousMockMode);
    }
  });

  // ─── Batch Tool Execution (New Feature) ────

  /**
   * POST /simulate/tools/batch
   * Execute multiple tools in a single request.
   *
   * @changelog
   * - 2023-10-27: New endpoint for batch execution.
   * - 2023-10-27: Supports parallel and sequential execution modes.
   */
  fastify.post<{
    Body: {
      executions: Array<{ name: string; args?: Record<string, unknown>; useMock?: boolean }>;
      stopOnError?: boolean;
      parallel?: boolean;
    };
  }>('/simulate/tools/batch', {
    schema: {
      body: {
        type: 'object',
        required: ['executions'],
        properties: {
          executions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {type: 'string'},
                args: {type: 'object'},
                useMock: {type: 'boolean'},
              },
            },
            maxItems: 20, // Prevent abuse
          },
          stopOnError: {type: 'boolean', default: false},
          parallel: {type: 'boolean', default: true},
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;

    const previousMockMode = simulator.isMockModeEnabled();
    const results: Array<{ success: boolean; name: string; result?: any; error?: string; durationMs: number }> = [];

    const executeSingle = async (exec: { name: string; args?: Record<string, unknown>; useMock?: boolean }) => {
      const start = Date.now();
      try {
        if (exec.useMock) simulator.setMockMode(true);

        if (!toolRegistry.has(exec.name)) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error(`Tool "${exec.name}" not found`);
        }

        const result = await simulator.executeTool(exec.name, exec.args || {});
        return {
          success: true,
          name: exec.name,
          result,
          durationMs: Date.now() - start,
        };
      } catch (err) {
        return {
          success: false,
          name: exec.name,
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - start,
        };
      }
    };

    try {
      if (body.parallel) {
        // Parallel execution
        const promises = body.executions.map(exec => executeSingle(exec));
        const settled = await Promise.all(promises);
        results.push(...settled);
      } else {
        // Sequential execution
        for (const exec of body.executions) {
          const result = await executeSingle(exec);
          results.push(result);

          if (body.stopOnError && !result.success) {
            logger.info('Stopping batch execution due to error');
            break;
          }
        }
      }
    } finally {
      simulator.setMockMode(previousMockMode);
    }

    return reply.send({
      status: 'completed',
      total: results.length,
      results,
    });
  });

  // ─── Health & Status ────

  /**
   * GET /simulate/status
   * Get overall simulation framework status.
   *
   * @changelog
   * - 2023-10-27: Added response schema.
   * - 2023-10-27: Added system memory usage reporting for monitoring.
   */
  fastify.get('/simulate/status', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            mockModeEnabled: {type: 'boolean'},
            mocksCount: {type: 'integer'},
            scenariosCount: {type: 'integer'},
            availableTools: {type: 'array', items: {type: 'string'}},
            mockModeDescription: {type: 'string'},
            system: {type: 'object'},
            additionalProperties: true,
          },
        },
      },
    },
  }, async (_request, reply) => {
    const mockModeEnabled = simulator.isMockModeEnabled();

    return reply.send({
      mockModeEnabled,
      mocksCount: Object.keys(simulator.listMocks()).length,
      scenariosCount: simulator.listScenariosName().length,
      availableTools: toolRegistry.listAll().map(t => t.name),
      mockModeDescription: mockModeEnabled
        ? 'Enabled - using mock responses'
        : 'Disabled - using real tool execution',
      system: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });
  });
};
