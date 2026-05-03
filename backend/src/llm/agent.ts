/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module llm/agent
 * @description Autonomous agent loop — connects an LLM to MCP tools.
 *
 * The agent loop is the core intelligence of the MCP server:
 *
 * 1. Receives a user message
 * 2. Sends it (along with conversation history) to the LLM
 * 3. If the LLM requests tool calls, executes them via the tool registry
 * 4. Feeds tool results back to the LLM
 * 5. Repeats until the LLM provides a final answer (no more tool calls)
 *
 * ## Architecture
 *
 * ```
 * User Message → LLM → [Tool Call?] → MCP Tool → Result → LLM → ... → Final Answer
 *                                  ↓ (no tool call)
 *                              Response
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { runAgentLoop } from '@/llm/agent';
 *
 * const response = await runAgentLoop({
 *   messages: [{ role: 'user', content: 'What time is it?' }],
 *   provider: myProvider,
 *   maxIterations: 10,
 * });
 *
 * console.log(response.content);
 * // Also includes: response.toolCalls, response.iterations, response.totalTokens
 * ```
 */

import type {ChatMessage, LLMCompletionResponse} from '@/mcp/types';
import type {LLMProvider, LLMGenerationParams, LLMToolDefinition} from './types';
import {toolRegistry} from '@/mcp/tools/registry';

/** Valid message roles for input validation */
const VALID_ROLES = new Set(['user', 'assistant', 'system', 'tool']);

/** Options for running the agent loop */
export interface AgentLoopOptions {
  /** LLM provider to use */
  provider: LLMProvider;
  /** Conversation history + current user message */
  messages: ChatMessage[];
  /** Maximum tool-call iterations before forcing a stop (default: 10) */
  maxIterations?: number;
  /** Additional generation parameters */
  generationParams?: Partial<LLMGenerationParams>;
  /** Callback for each iteration (useful for streaming/debugging) */
  onIteration?: (iteration: AgentIteration) => void;
  /** AbortSignal to cancel the agent loop mid-execution */
  signal?: AbortSignal;
}

/** Result of the agent loop */
export interface AgentResult {
  /** The final assistant message content */
  content: string;
  /** All messages exchanged (including tool calls/results) */
  messages: ChatMessage[];
  /** Total number of iterations (LLM calls) */
  iterations: number;
  /** Cumulative token usage */
  totalTokens: { prompt: number; completion: number; total: number };
  /** All tool calls that were made during the loop */
  toolCallsMade: Array<{ name: string; arguments: Record<string, unknown>; result: string }>;
  /** Whether the loop completed naturally (LLM gave final answer without hitting limits) */
  completed: boolean;
  /** Reason the loop stopped */
  stopReason: 'completed' | 'max_iterations' | 'aborted';
}

/** Single agent iteration (for callbacks) */
export interface AgentIteration {
  /** Iteration number (1-based) */
  index: number;
  /** LLM response for this iteration */
  response: LLMCompletionResponse;
  /** Tool calls made in this iteration */
  toolResults: Array<{ name: string; success: boolean; result: string }>;
}

/**
 * Safely parse tool call arguments from string or object form.
 *
 * @param raw - Raw arguments, either a JSON string, an object, or undefined.
 * @returns Parsed arguments and any parse error encountered.
 *
 * ### Changelog
 * - 2026-01-15: Extracted from inline parsing in runAgentLoop for reuse and consistency.
 * - 2026-01-15: Added validation that parsed arguments are a JSON object (not array or primitive).
 */
function parseToolCallArguments(
  raw: string | Record<string, unknown> | undefined,
): { args: Record<string, unknown>; parseError: string | null } {
  if (typeof raw === 'object' && raw !== null) {
    return {args: raw as Record<string, unknown>, parseError: null};
  }

  if (raw === undefined || raw === '') {
    return {args: {}, parseError: null};
  }

  try {
    const parsed: unknown = JSON.parse(raw as string);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      const hint = `JSON ${Array.isArray(parsed) ? 'array' : typeof parsed}`;
      return {
        args: {error: `Tool arguments must be a JSON object, got ${hint}`},
        parseError: `Tool arguments must be a JSON object, got ${hint}`,
      };
    }
    return {args: parsed as Record<string, unknown>, parseError: null};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      args: {error: `Failed to parse arguments: ${message}`},
      parseError: message,
    };
  }
}

/**
 * Extract the final assistant content from the messages array.
 *
 * Prefers the most recent assistant message without tool calls (the true final answer),
 * falling back to the most recent assistant message overall, then a default string.
 *
 * @param messages - The conversation messages to search.
 * @returns The extracted content string.
 *
 * ### Changelog
 * - 2026-01-15: Extracted from inline logic in runAgentLoop; optimized from two separate
 *   `[...messages].reverse().find()` calls to a single reverse pass.
 */
function extractFinalContent(messages: ChatMessage[]): string {
  let lastAssistant: ChatMessage | undefined;
  let lastFinalAssistant: ChatMessage | undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;

    if (!lastAssistant) {
      lastAssistant = m;
    }

    if (!lastFinalAssistant && (!m.tool_calls || m.tool_calls.length === 0)) {
      lastFinalAssistant = m;
      break;
    }
  }

  return lastFinalAssistant?.content || lastAssistant?.content || 'No response generated.';
}

/**
 * Build MCP tool definitions for the LLM provider format.
 *
 * @returns Array of tool definitions formatted for the LLM provider.
 *
 * ### Changelog
 * - 2026-01-01: Initial implementation
 * - 2026-01-15: Added fallback for tools missing inputSchema (defaults to empty object schema).
 * - 2026-01-15: Handle empty registry gracefully — returns empty array.
 */
export function buildToolDefinitions(): LLMToolDefinition[] {
  const tools = toolRegistry.listDefinitions();
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: (t.inputSchema ?? {
        type: 'object',
        properties: {},
      }) as Record<string, unknown>,
    },
  }));
}

/**
 * Run the autonomous agent loop.
 *
 * This function orchestrates the LLM ↔ Tool interaction cycle until
 * the model produces a final answer or the maximum iteration count is reached.
 *
 * @param options - Agent loop configuration.
 * @returns The agent result with final content, messages, token usage, tool call history, and completion status.
 * @throws {Error} If provider is invalid, messages are empty/malformed, or maxIterations is not a positive integer.
 *
 * ### Changelog
 * - 2026-01-01: Initial implementation
 * - 2026-01-15: Added input validation for provider, messages array, message structure, and maxIterations
 * - 2026-01-15: Added AbortSignal support via `options.signal` for cancelling long-running loops
 * - 2026-01-15: Added `completed` and `stopReason` fields to AgentResult for loop outcome visibility
 * - 2026-01-15: Extracted argument parsing into `parseToolCallArguments` — parsed once per tool call, reused for execution and logging (was parsed twice)
 * - 2026-01-15: Optimized final content extraction from two `[].reverse().find()` calls to a single reverse pass via `extractFinalContent`
 * - 2026-01-15: Handle edge case: tool handler returning null/undefined or empty content array
 * - 2026-01-15: Handle edge case: tool call missing function name or ID
 * - 2026-01-15: Handle edge case: arguments parsed as non-object (array or primitive) rejected gracefully
 * - 2026-01-15: Handle edge case: maxIterations exhaustion now reported via `stopReason: 'max_iterations'` instead of silently returning
 * - 2026-01-15: Validate onIteration is a function if provided
 */
export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentResult> {
  const {
    provider,
    messages: initialMessages,
    maxIterations = 10,
    generationParams,
    onIteration,
    signal,
  } = options;

  // --- Input validations ---

  if (!provider || typeof provider.chat !== 'function') {
    throw new Error('Agent loop requires a valid LLM provider with a chat method.');
  }

  if (!Array.isArray(initialMessages)) {
    throw new Error('Agent loop requires messages to be an array.');
  }

  if (initialMessages.length === 0) {
    throw new Error('Agent loop requires at least one message.');
  }

  for (let i = 0; i < initialMessages.length; i++) {
    const msg = initialMessages[i];
    if (!msg || typeof msg !== 'object') {
      throw new Error(`Invalid message at index ${i}: must be an object.`);
    }
    if (!VALID_ROLES.has(msg.role)) {
      throw new Error(
        `Invalid message at index ${i}: unsupported role "${msg.role}". ` +
        `Expected one of: ${[...VALID_ROLES].join(', ')}.`,
      );
    }
    if (msg.role === 'tool' && !msg.tool_call_id) {
      throw new Error(`Invalid tool message at index ${i}: missing tool_call_id.`);
    }
  }

  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new Error('maxIterations must be a positive integer (>= 1).');
  }

  if (onIteration !== undefined && typeof onIteration !== 'function') {
    throw new Error('onIteration must be a function if provided.');
  }

  // --- State initialization ---

  const messages: ChatMessage[] = [...initialMessages];
  const toolCallsMade: AgentResult['toolCallsMade'] = [];
  let totalTokens = {prompt: 0, completion: 0, total: 0};
  let iterations = 0;
  let completedNaturally = false;
  let aborted = false;

  // Build tool definitions from registry (once, before the loop)
  const tools = buildToolDefinitions();
  const hasTools = tools.length > 0;

  while (iterations < maxIterations) {
    // Check for cancellation before each LLM call
    if (signal?.aborted) {
      aborted = true;
      break;
    }

    iterations++;

    // Call the LLM
    const response = await provider.chat(messages, {
      ...generationParams,
      tools: hasTools ? tools : undefined,
      toolChoice: hasTools ? 'auto' : undefined,
    });

    // Track token usage
    if (response.usage) {
      totalTokens.prompt += response.usage.prompt_tokens;
      totalTokens.completion += response.usage.completion_tokens;
      totalTokens.total += response.usage.total_tokens;
    }

    // If no tool calls, we're done — the LLM gave a final answer
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // Add the final assistant message
      messages.push({role: 'assistant', content: response.content || ''});
      completedNaturally = true;
      break;
    }

    // Add assistant message with tool calls to conversation
    messages.push({
      role: 'assistant',
      content: response.content || '',
      tool_calls: response.tool_calls,
    });

    // Execute each tool call
    const iterationToolResults: AgentIteration['toolResults'] = [];

    for (const toolCall of response.tool_calls) {
      // Check for cancellation before each tool execution
      if (signal?.aborted) {
        aborted = true;
        break;
      }

      const toolName = toolCall.function?.name || '';
      const toolCallId = toolCall.id || '';

      // Parse arguments once — reuse for both execution and logging
      const {args, parseError} = parseToolCallArguments(toolCall.function?.arguments);

      let result = '';
      let success = true;

      try {
        if (parseError) {
          result = `Error: Failed to parse tool arguments: ${parseError}`;
          success = false;
        } else if (!toolName) {
          result = 'Error: Tool call is missing a function name.';
          success = false;
        } else {
          const tool = toolRegistry.get(toolName);

          if (!tool) {
            result = `Error: Tool "${toolName}" not found`;
            success = false;
          } else {
            const toolResult = await tool.handler(args);

            // Guard against null/undefined handler results or empty content
            if (!toolResult?.content || toolResult.content.length === 0) {
              result = '';
            } else {
              result = toolResult.content
                .map((c) => (c.type === 'text' ? c.text : `[${c.type} content]`))
                .join('\n');
            }
          }
        }
      } catch (err) {
        result = `Error executing tool: ${err instanceof Error ? err.message : String(err)}`;
        success = false;
      }

      // Add tool result message to conversation
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCallId,
        name: toolName,
      });

      toolCallsMade.push({
        name: toolName,
        arguments: args,
        result,
      });

      iterationToolResults.push({
        name: toolName,
        success,
        result,
      });
    }

    // If aborted during tool execution, exit loop
    if (aborted) {
      break;
    }

    // Notify iteration callback
    if (onIteration) {
      onIteration({index: iterations, response, toolResults: iterationToolResults});
    }
  }

  // Determine stop reason
  let stopReason: AgentResult['stopReason'];
  if (completedNaturally) {
    stopReason = 'completed';
  } else if (aborted) {
    stopReason = 'aborted';
  } else {
    stopReason = 'max_iterations';
  }

  // Extract final content
  const content = extractFinalContent(messages);

  return {
    content,
    messages,
    iterations,
    totalTokens,
    toolCallsMade,
    completed: completedNaturally,
    stopReason,
  };
}
