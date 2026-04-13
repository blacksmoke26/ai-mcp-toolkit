/**
 * @module simulation/simulator
 * @description Simulation and testing framework for MCP tools and scenarios.
 *
 * Provides capabilities for:
 *
 * - Mocking tool responses for testing
 * - Running predefined scenarios
 * - Simulating load and stress conditions
 * - Testing tool interactions and dependencies
 *
 * ## Features
 *
 * - **Mock Responses**: Override tool outputs for deterministic testing
 * - **Scenario Runner**: Execute predefined test scenarios
 * - **Load Simulation**: Simulate concurrent requests and operations
 * - **Response Templates**: Predefined response patterns for testing
 *
 * ## Usage
 *
 * ```typescript
 * import { simulator } from '@/simulation/simulator';
 *
 * // Set up mock responses
 * simulator.setMock('get_current_time', {
 *   content: [{ type: 'text', text: 'Mock time: 2024-01-01T00:00:00Z' }]
 * });
 *
 * // Run a scenario
 * const results = await simulator.runScenario('basic_flow');
 *
 * // Simulate load
 * await simulator.simulateLoad({
 *   tools: ['get_current_time', 'calculator'],
 *   concurrentUsers: 10,
 *   durationMs: 5000
 * });
 *
 * // Clear mocks
 * simulator.clearMocks();
 * ```
 */

import { toolRegistry } from '@/mcp/tools/registry.js';
import type { CallToolResult, ToolDefinition } from '@/mcp/types.js';
import { metricsCollector } from '@/metrics/collector.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Mock response configuration for a tool */
export interface MockResponse {
  /** Mock content to return */
  content: Array<{ type: 'text'; text: string }>;
  /** Optional isError flag */
  isError?: boolean;
  /** Optional delay to simulate network latency */
  delayMs?: number;
  /** Optional random failure probability (0-1) */
  failureRate?: number;
}

/** Scenario step definition */
export interface ScenarioStep {
  /** Step name/identifier */
  name: string;
  /** Tool name to call */
  tool: string;
  /** Tool arguments */
  args?: Record<string, unknown>;
  /** Expected response validation */
  expects?: {
    contains?: string;
    notContains?: string;
    hasError?: boolean;
    maxDurationMs?: number;
  };
  /** Description of what this step does */
  description?: string;
}

/** Scenario definition */
export interface Scenario {
  /** Scenario identifier */
  name: string;
  /** Scenario description */
  description: string;
  /** Steps to execute */
  steps: ScenarioStep[];
  /** Initial mock setup (optional) */
  setupMocks?: Record<string, MockResponse>;
  /** Cleanup mocks after scenario (optional) */
  cleanupMocks?: boolean;
}

/** Scenario execution result */
export interface ScenarioResult {
  /** Scenario name */
  name: string;
  /** Whether scenario passed */
  passed: boolean;
  /** Total execution time in ms */
  durationMs: number;
  /** Step results */
  steps: StepResult[];
  /** Any errors encountered */
  errors: string[];
  /** Timestamp */
  timestamp: Date;
}

/** Individual step result */
export interface StepResult {
  /** Step name */
  name: string;
  /** Whether step passed */
  passed: boolean;
  /** Execution time in ms */
  durationMs: number;
  /** Actual response */
  response?: CallToolResult;
  /** Error if any */
  error?: string;
}

/** Load simulation configuration */
export interface LoadConfig {
  /** Tools to simulate */
  tools: string[];
  /** Arguments templates for each tool */
  argsTemplates?: Record<string, Record<string, unknown>[]>;
  /** Number of concurrent users/requests */
  concurrentUsers: number;
  /** Duration of simulation in ms */
  durationMs: number;
  /** Request rate per user per second */
  requestsPerSecond?: number;
  /** Whether to record metrics */
  recordMetrics?: boolean;
}

/** Load simulation results */
export interface LoadResults {
  /** Total requests executed */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** Min latency in ms */
  minLatencyMs: number;
  /** Max latency in ms */
  maxLatencyMs: number;
  /** P50 latency in ms */
  p50LatencyMs: number;
  /** P95 latency in ms */
  p95LatencyMs: number;
  /** P99 latency in ms */
  p99LatencyMs: number;
  /** Requests per second achieved */
  rps: number;
  /** Latency by tool */
  byTool: Record<string, {
    count: number;
    avgLatencyMs: number;
    errors: number;
  }>;
  /** Start and end times */
  startTime: Date;
  endTime: Date;
}

// ─── Simulator Class ───────────────────────────────────────────────────────

class Simulator {
  /** Mock responses map */
  private readonly mocks: Map<string, MockResponse> = new Map();

  /** Registered scenarios */
  private readonly scenarios: Map<string, Scenario> = new Map();

  /** Whether mock mode is enabled */
  private mockModeEnabled = false;

  /**
   * Enable/disable mock mode globally
   */
  setMockMode(enabled: boolean): void {
    this.mockModeEnabled = enabled;
  }

  /**
   * Check if mock mode is enabled
   */
  isMockModeEnabled(): boolean {
    return this.mockModeEnabled;
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Mock Management ────

  /**
   * Set a mock response for a tool
   */
  setMock(toolName: string, mock: MockResponse): void {
    this.mocks.set(toolName, mock);
  }

  /**
   * Get a mock response for a tool
   */
  getMock(toolName: string): MockResponse | undefined {
    return this.mocks.get(toolName);
  }

  /**
   * Remove a mock response
   */
  removeMock(toolName: string): boolean {
    return this.mocks.delete(toolName);
  }

  /**
   * Clear all mock responses
   */
  clearMocks(): void {
    this.mocks.clear();
  }

  /**
   * List all registered mocks
   */
  listMocks(): Record<string, Omit<MockResponse, 'content'>> {
    const result: Record<string, Omit<MockResponse, 'content'>> = {};
    for (const [name, mock] of this.mocks) {
      result[name] = {
        isError: mock.isError,
        delayMs: mock.delayMs,
        failureRate: mock.failureRate,
      };
    }
    return result;
  }

  // ─── Tool Execution with Mock Support ────

  /**
   * Execute a tool with optional mock support
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<CallToolResult> {
    const start = Date.now();

    // Check if we should use mock
    if (this.mockModeEnabled) {
      const mock = this.mocks.get(toolName);
      if (mock) {
        // Simulate delay
        if (mock.delayMs) {
          await this.sleep(mock.delayMs);
        }

        // Simulate random failure
        if (mock.failureRate && Math.random() < mock.failureRate) {
          throw new Error(`Mock failure for tool: ${toolName}`);
        }

        const result: CallToolResult = {
          content: mock.content,
          isError: mock.isError,
        };

        // Record metric
        metricsCollector.recordTool({
          toolName,
          durationMs: Date.now() - start,
          success: !mock.isError,
          inputKeys: Object.keys(args),
        });

        return result;
      }
    }

    // Execute real tool
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const result = await tool.handler(args);

    // Record metric
    metricsCollector.recordTool({
      toolName,
      durationMs: Date.now() - start,
      success: !result.isError,
      inputKeys: Object.keys(args),
    });

    return result;
  }

  // ─── Scenario Management ────

  /**
   * Register a scenario
   */
  registerScenario(scenario: Scenario): void {
    if (this.scenarios.has(scenario.name)) {
      throw new Error(`Scenario "${scenario.name}" already registered`);
    }
    this.scenarios.set(scenario.name, scenario);
  }

  /**
   * Get a scenario
   */
  getScenario(name: string): Scenario | undefined {
    return this.scenarios.get(name);
  }

  /**
   * List all scenario names
   */
  listScenarios(): string[] {
    return Array.from(this.scenarios.keys());
  }

  /**
   * Remove a scenario
   */
  removeScenario(name: string): boolean {
    return this.scenarios.delete(name);
  }

  /**
   * Validate a step against expectations
   */
  private validateStep(step: ScenarioStep, response: CallToolResult): { valid: boolean; reason?: string } {
    if (!step.expects) {
      return { valid: true };
    }

    const expectations = step.expects;
    const textContent = response.content
      .map(c => c.type === 'text' ? c.text : '')
      .join('\n');

    // Check if response should have error
    if (expectations.hasError !== undefined) {
      const hasError = response.isError || false;
      if (expectations.hasError && !hasError) {
        return { valid: false, reason: 'Expected error but got success' };
      }
      if (!expectations.hasError && hasError) {
        return { valid: false, reason: 'Expected success but got error' };
      }
    }

    // Check contains
    if (expectations.contains) {
      if (!textContent.includes(expectations.contains)) {
        return { valid: false, reason: `Response does not contain: "${expectations.contains}"` };
      }
    }

    // Check notContains
    if (expectations.notContains) {
      if (textContent.includes(expectations.notContains)) {
        return { valid: false, reason: `Response should not contain: "${expectations.notContains}"` };
      }
    }

    return { valid: true };
  }

  /**
   * Run a scenario
   */
  async runScenario(name: string): Promise<ScenarioResult> {
    const scenario = this.scenarios.get(name);
    if (!scenario) {
      throw new Error(`Scenario not found: ${name}`);
    }

    const startTime = Date.now();
    const steps: StepResult[] = [];
    const errors: string[] = [];
    let passed = true;

    try {
      // Setup mocks if specified
      if (scenario.setupMocks) {
        const previousMode = this.mockModeEnabled;
        this.mockModeEnabled = true;
        for (const [toolName, mock] of Object.entries(scenario.setupMocks)) {
          this.setMock(toolName, mock);
        }

        // Execute steps
        for (const step of scenario.steps) {
          const stepStart = Date.now();
          try {
            const response = await this.executeTool(step.tool, step.args || {});

            const stepPassed = this.validateStep(step, response);
            if (!stepPassed.valid) {
              passed = false;
              errors.push(stepPassed.reason || 'Validation failed');
            }

            steps.push({
              name: step.name,
              passed: stepPassed.valid,
              durationMs: Date.now() - stepStart,
              response,
            });
          } catch (error) {
            passed = false;
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(errorMsg);
            steps.push({
              name: step.name,
              passed: false,
              durationMs: Date.now() - stepStart,
              error: errorMsg,
            });
          }
        }

        // Cleanup mocks if specified
        if (scenario.cleanupMocks) {
          for (const toolName of Object.keys(scenario.setupMocks)) {
            this.removeMock(toolName);
          }
        }

        this.mockModeEnabled = previousMode;
      } else {
        // Run without mocks
        for (const step of scenario.steps) {
          const stepStart = Date.now();
          try {
            const response = await this.executeTool(step.tool, step.args || {});

            const stepPassed = this.validateStep(step, response);
            if (!stepPassed.valid) {
              passed = false;
              errors.push(stepPassed.reason || 'Validation failed');
            }

            steps.push({
              name: step.name,
              passed: stepPassed.valid,
              durationMs: Date.now() - stepStart,
              response,
            });
          } catch (error) {
            passed = false;
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(errorMsg);
            steps.push({
              name: step.name,
              passed: false,
              durationMs: Date.now() - stepStart,
              error: errorMsg,
            });
          }
        }
      }
    } finally {
      // Always cleanup if specified
      if (scenario.setupMocks && scenario.cleanupMocks) {
        for (const toolName of Object.keys(scenario.setupMocks)) {
          this.removeMock(toolName);
        }
      }
    }

    return {
      name: scenario.name,
      passed,
      durationMs: Date.now() - startTime,
      steps,
      errors,
      timestamp: new Date(),
    };
  }

  // ─── Load Simulation ────

  /**
   * Simulate load by executing tools concurrently
   */
  async simulateLoad(config: LoadConfig): Promise<LoadResults> {
    const startTime = new Date();
    const endMarker = startTime.getTime() + config.durationMs;

    const latencies: number[] = [];
    const byToolStats: Map<string, { latencies: number[]; errors: number }> = new Map();
    let successfulRequests = 0;
    let failedRequests = 0;

    // Initialize tool stats
    for (const toolName of config.tools) {
      byToolStats.set(toolName, { latencies: [], errors: 0 });
    }

    // Generate request queue
    const requests: Array<{ tool: string; args: Record<string, unknown> }> = [];
    const rps = config.requestsPerSecond || 1;
    const requestsPerSecondTotal = rps * config.concurrentUsers;
    const totalRequests = Math.round(requestsPerSecondTotal * (config.durationMs / 1000));

    for (let i = 0; i < totalRequests; i++) {
      const toolName = config.tools[i % config.tools.length];
      const argsTemplate = config.argsTemplates?.[toolName];
      const args = argsTemplate ? argsTemplate[i % argsTemplate.length] : {};
      requests.push({ tool: toolName, args });
    }

    // Execute requests with concurrency
    const chunkSize = config.concurrentUsers;
    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize);
      const promises = chunk.map(async ({ tool, args }) => {
        const start = Date.now();
        try {
          await this.executeTool(tool, args);
          successfulRequests++;
          const latency = Date.now() - start;
          latencies.push(latency);
          const stats = byToolStats.get(tool)!;
          stats.latencies.push(latency);
        } catch (error) {
          failedRequests++;
          const latency = Date.now() - start;
          latencies.push(latency);
          const stats = byToolStats.get(tool)!;
          stats.latencies.push(latency);
          stats.errors++;
        }
      });

      await Promise.all(promises);

      // Check if we've exceeded duration
      if (Date.now() > endMarker) {
        break;
      }

      // Small delay to simulate realistic timing
      if (config.durationMs > 1000 && i + chunkSize < requests.length) {
        const delayPerRequest = 1000 / requestsPerSecondTotal;
        await this.sleep(delayPerRequest);
      }
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    // Build byTool result
    const byToolResult: Record<string, { count: number; avgLatencyMs: number; errors: number }> = {};
    for (const [toolName, stats] of byToolStats) {
      byToolResult[toolName] = {
        count: stats.latencies.length,
        avgLatencyMs: stats.latencies.length > 0
          ? Math.round(stats.latencies.reduce((s, l) => s + l, 0) / stats.latencies.length)
          : 0,
        errors: stats.errors,
      };
    }

    return {
      totalRequests: latencies.length,
      successfulRequests,
      failedRequests,
      avgLatencyMs: latencies.length > 0
        ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length)
        : 0,
      minLatencyMs: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      rps: Math.round(latencies.length / (durationMs / 1000)),
      byTool: byToolResult,
      startTime,
      endTime,
    };
  }

  // ─── Built-in Scenarios ────

  /**
   * Register built-in scenarios
   */
  registerBuiltInScenarios(): void {
    // Basic tool execution scenario
    this.registerScenario({
      name: 'basic_tool_execution',
      description: 'Tests basic tool execution with mocked responses',
      setupMocks: {
        get_current_time: {
          content: [{ type: 'text', text: 'Current time: 2024-01-01T00:00:00Z' }],
        },
      },
      steps: [
        {
          name: 'Get current time',
          tool: 'get_current_time',
          args: {},
          description: 'Retrieve the current time',
          expects: {
            contains: '2024-01-01T00:00:00Z',
            hasError: false,
          },
        },
      ],
      cleanupMocks: true,
    });

    // Calculator scenario
    this.registerScenario({
      name: 'calculator_operations',
      description: 'Tests calculator tool operations',
      setupMocks: {
        calculator: {
          content: [{ type: 'text', text: 'Result: 42' }],
        },
      },
      steps: [
        {
          name: 'Calculate expression',
          tool: 'calculator',
          args: { expression: '2 + 2' },
          description: 'Perform a simple calculation',
          expects: {
            contains: 'Result:',
            hasError: false,
          },
        },
      ],
      cleanupMocks: true,
    });

    // Error handling scenario
    this.registerScenario({
      name: 'error_handling',
      description: 'Tests error handling with simulated failures',
      setupMocks: {
        failing_tool: {
          content: [{ type: 'text', text: 'This should fail' }],
          failureRate: 0.5,
        },
      },
      steps: [
        {
          name: 'Tool that may fail',
          tool: 'failing_tool',
          args: {},
          description: 'Call a tool with 50% failure rate',
          // No specific expectations since it may succeed or fail
        },
      ],
      cleanupMocks: true,
    });
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────

export const simulator = new Simulator();
export default simulator;
