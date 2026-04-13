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
 * | DELETE | `/simulate/mocks/:tool` | Remove a mock |
 * | POST | `/simulate/mocks/clear` | Clear all mocks |
 * | GET | `/simulate/mode` | Get/set mock mode status |
 * | PATCH | `/simulate/mode` | Enable/disable mock mode |
 * | POST | `/simulate/load` | Run load simulation |
 * | POST | `/simulate/tool` | Execute a single tool for testing |
 */

import type { FastifyPluginAsync } from 'fastify';
import { simulator } from '@/simulation/simulator.js';
import { toolRegistry } from '@/mcp/tools/registry.js';
import { logger } from '@/utils/logger.js';
import type {
  MockResponse,
  Scenario,
  ScenarioResult,
  LoadConfig,
  LoadResults,
} from '@/simulation/simulator.js';

export const simulationRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Scenario Management ────

  /**
   * GET /simulate/scenarios
   * List all registered test scenarios.
   */
  fastify.get('/simulate/scenarios', async (request, reply) => {
    const scenarios = simulator.listScenarios().map((name) => {
      const scenario = simulator.getScenario(name)!;
      return {
        name: scenario.name,
        description: scenario.description,
        steps: scenario.steps.length,
        hasMocks: !!scenario.setupMocks,
      };
    });

    return reply.send({
      total: scenarios.length,
      scenarios,
    });
  });

  /**
   * GET /simulate/scenarios/:name
   * Get detailed information about a specific scenario.
   */
  fastify.get('/simulate/scenarios/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const scenario = simulator.getScenario(name);

    if (!scenario) {
      return reply.code(404).send({ error: `Scenario "${name}" not found` });
    }

    return reply.send(scenario);
  });

  /**
   * POST /simulate/scenarios/:name/run
   * Execute a registered scenario and return results.
   *
   * ## Request Body (optional)
   * ```json
   * {
   *   "useMocks": true,
   *   "recordMetrics": true
   * }
   * ```
   */
  fastify.post('/simulate/scenarios/:name/run', async (request, reply) => {
    const { name } = request.params as { name: string };
    const body = request.body as {
      useMocks?: boolean;
      recordMetrics?: boolean;
    };

    const scenario = simulator.getScenario(name);
    if (!scenario) {
      return reply.code(404).send({ error: `Scenario "${name}" not found` });
    }

    logger.info({ scenario: name }, 'Running scenario');

    try {
      const result = await simulator.runScenario(name);
      logger.info({ scenario: name, passed: result.passed, durationMs: result.durationMs }, 'Scenario completed');

      return reply.send({
        scenario: name,
        result,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ scenario: name, error: errorMsg }, 'Scenario failed');

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
   */
  fastify.get('/simulate/mocks', async (request, reply) => {
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
   * ## Request Body
   * ```json
   * {
   *   "tool": "tool_name",
   *   "content": [{ "type": "text", "text": "Mock response text" }],
   *   "isError": false,
   *   "delayMs": 100,
   *   "failureRate": 0.1
   * }
   * ```
   */
  fastify.post('/simulate/mocks', async (request, reply) => {
    const body = request.body as {
      tool: string;
      content: Array<{ type: 'text'; text: string }>;
      isError?: boolean;
      delayMs?: number;
      failureRate?: number;
    };

    if (!body.tool || !body.content) {
      return reply.code(400).send({
        error: 'Missing required fields: tool, content',
      });
    }

    // Verify tool exists
    if (!toolRegistry.has(body.tool)) {
      // Allow mocking non-existent tools for testing purposes
      logger.warn({ tool: body.tool }, 'Mocking non-registered tool');
    }

    const mock: MockResponse = {
      content: body.content,
      isError: body.isError,
      delayMs: body.delayMs,
      failureRate: body.failureRate,
    };

    simulator.setMock(body.tool, mock);

    logger.info({ tool: body.tool }, 'Mock configured');

    return reply.status(201).send({
      status: 'configured',
      tool: body.tool,
    });
  });

  /**
   * DELETE /simulate/mocks/:tool
   * Remove a mock response for a specific tool.
   */
  fastify.delete('/simulate/mocks/:tool', async (request, reply) => {
    const { tool } = request.params as { tool: string };

    const removed = simulator.removeMock(tool);
    if (!removed) {
      return reply.code(404).send({ error: `Mock for "${tool}" not found` });
    }

    logger.info({ tool }, 'Mock removed');

    return reply.send({ status: 'removed', tool });
  });

  /**
   * POST /simulate/mocks/clear
   * Clear all mock responses.
   */
  fastify.post('/simulate/mocks/clear', async (request, reply) => {
    const mockCount = simulator.listMocks();
    simulator.clearMocks();

    logger.info({ count: Object.keys(mockCount).length }, 'Mocks cleared');

    return reply.send({
      status: 'cleared',
      clearedCount: Object.keys(mockCount).length,
    });
  });

  // ─── Mock Mode Control ────

  /**
   * GET /simulate/mode
   * Get current mock mode status.
   */
  fastify.get('/simulate/mode', async (request, reply) => {
    return reply.send({
      mockModeEnabled: simulator.isMockModeEnabled(),
    });
  });

  /**
   * PATCH /simulate/mode
   * Enable or disable mock mode globally.
   *
   * When mock mode is enabled, all tool executions will use mock responses
   * if they are configured. Otherwise, real tool execution is used.
   *
   * ## Request Body
   * ```json
   * { "enabled": true }
   * ```
   */
  fastify.patch('/simulate/mode', async (request, reply) => {
    const body = request.body as { enabled?: boolean };

    if (body.enabled === undefined) {
      return reply.code(400).send({
        error: 'Must provide "enabled" boolean',
      });
    }

    simulator.setMockMode(body.enabled);

    logger.info({ enabled: body.enabled }, 'Mock mode updated');

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
   * ## Request Body
   * ```json
   * {
   *   "tools": ["get_current_time", "calculator"],
   *   "concurrentUsers": 10,
   *   "durationMs": 5000,
   *   "requestsPerSecond": 2,
   *   "argsTemplates": {
   *     "calculator": [
   *       { "expression": "1 + 1" },
   *       { "expression": "2 + 2" }
   *     ]
   *   },
   *   "useMocks": false
   * }
   * ```
   *
   * ## Response
   * Returns comprehensive load test results including:
   * - Total/successful/failed requests
   * - Latency percentiles (p50, p95, p99)
   * - Requests per second achieved
   * - Breakdown by tool
   */
  fastify.post('/simulate/load', async (request, reply) => {
    const body = request.body as LoadConfig & {
      useMocks?: boolean;
    };

    // Validate required fields
    if (!body.tools || !Array.isArray(body.tools) || body.tools.length === 0) {
      return reply.code(400).send({
        error: 'Must provide non-empty tools array',
      });
    }

    if (!body.concurrentUsers || body.concurrentUsers < 1) {
      return reply.code(400).send({
        error: 'concurrentUsers must be at least 1',
      });
    }

    if (!body.durationMs || body.durationMs <= 0) {
      return reply.code(400).send({
        error: 'durationMs must be positive',
      });
    }

    // Validate tools exist
    const invalidTools = body.tools.filter(t => !toolRegistry.has(t));
    if (invalidTools.length > 0) {
      return reply.code(400).send({
        error: 'Unknown tools',
        invalidTools,
        availableTools: toolRegistry.listAll().map(t => t.name),
      });
    }

    logger.info({ config: body }, 'Starting load simulation');

    try {
      // Temporarily enable mock mode if requested
      const previousMockMode = simulator.isMockModeEnabled();
      if (body.useMocks) {
        simulator.setMockMode(true);
      }

      const results: LoadResults = await simulator.simulateLoad(body);

      // Restore previous mock mode
      simulator.setMockMode(previousMockMode);

      logger.info(
        {
          totalRequests: results.totalRequests,
          successful: results.successfulRequests,
          failed: results.failedRequests,
          avgLatencyMs: results.avgLatencyMs,
          p99LatencyMs: results.p99LatencyMs,
          rps: results.rps,
        },
        'Load simulation completed'
      );

      return reply.send({
        status: 'completed',
        results,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ error: errorMsg }, 'Load simulation failed');

      return reply.code(500).send({
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
   * This endpoint allows testing tool execution with custom arguments
   * without going through the full MCP protocol.
   *
   * ## Request Body
   * ```json
   * {
   *   "name": "calculator",
   *   "args": { "expression": "2 + 2" },
   *   "useMock": false
   * }
   * ```
   *
   * ## Response
   * Returns the tool execution result with timing information.
   */
  fastify.post('/simulate/tool', async (request, reply) => {
    const body = request.body as {
      name: string;
      args?: Record<string, unknown>;
      useMock?: boolean;
    };

    if (!body.name) {
      return reply.code(400).send({
        error: 'Must provide tool name',
      });
    }

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

      const result = await simulator.executeTool(body.name, body.args || {});
      const durationMs = Date.now() - start;

      logger.info({ tool: body.name, durationMs }, 'Tool executed');

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

      logger.warn({ tool: body.name, error: errorMsg, durationMs }, 'Tool execution failed');

      return reply.code(400).send({
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

  // ─── Health & Status ────

  /**
   * GET /simulate/status
   * Get overall simulation framework status.
   *
   * Returns information about:
   * - Mock mode status
   * - Number of configured mocks
   * - Number of registered scenarios
   * - Available tools
   */
  fastify.get('/simulate/status', async (request, reply) => {
    return reply.send({
      mockModeEnabled: simulator.isMockModeEnabled(),
      mocksCount: Object.keys(simulator.listMocks()).length,
      scenariosCount: simulator.listScenarios().length,
      availableTools: toolRegistry.listAll().map(t => t.name),
      mockModeDescription: simulator.isMockModeEnabled()
        ? 'Enabled - using mock responses'
        : 'Disabled - using real tool execution',
    });
  });
};
