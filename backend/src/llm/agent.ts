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

import type { ChatMessage, ToolCall, LLMCompletionResponse } from '@/mcp/types.js';
import type { LLMProvider, LLMGenerationParams, LLMToolDefinition } from './types.js';
import { toolRegistry } from '@/mcp/tools/registry.js';

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
 * Build MCP tool definitions for the LLM provider format.
 */
export function buildToolDefinitions(): LLMToolDefinition[] {
  const tools = toolRegistry.listDefinitions();
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema as Record<string, unknown>,
    },
  }));
}

/**
 * Run the autonomous agent loop.
 * 
 * This function orchestrates the LLM ↔ Tool interaction cycle until
 * the model produces a final answer or the maximum iteration count is reached.
 */
export async function runAgentLoop(options: AgentLoopOptions): Promise<AgentResult> {
  const {
    provider,
    messages: initialMessages,
    maxIterations = 10,
    generationParams,
    onIteration,
  } = options;

  const messages: ChatMessage[] = [...initialMessages];
  const toolCallsMade: AgentResult['toolCallsMade'] = [];
  let totalTokens = { prompt: 0, completion: 0, total: 0 };
  let iterations = 0;

  // Build tool definitions from registry
  const tools = buildToolDefinitions();

  while (iterations < maxIterations) {
    iterations++;

    // Call the LLM
    const response = await provider.chat(messages, {
      ...generationParams,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice: tools.length > 0 ? 'auto' : undefined,
    });

    // Track token usage
    if (response.usage) {
      totalTokens.prompt += response.usage.prompt_tokens;
      totalTokens.completion += response.usage.completion_tokens;
      totalTokens.total += response.usage.total_tokens;
    }

    // If no tool calls, we're done
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // Add the final assistant message
      messages.push({ role: 'assistant', content: response.content });
      break;
    }

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: response.content || '',
      tool_calls: response.tool_calls,
    });

    // Execute each tool call
    const iterationToolResults: AgentIteration['toolResults'] = [];

    for (const toolCall of response.tool_calls) {
      let result = '';
      let success = true;

      try {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const tool = toolRegistry.get(toolCall.function.name);

        if (!tool) {
          result = `Error: Tool "${toolCall.function.name}" not found`;
          success = false;
        } else {
          const toolResult = await tool.handler(args);
          result = toolResult.content
            .map((c) => (c.type === 'text' ? c.text : `[${c.type} content]`))
            .join('\n');
        }
      } catch (err) {
        result = `Error executing tool: ${err instanceof Error ? err.message : String(err)}`;
        success = false;
      }

      // Add tool result message
      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      });

      toolCallsMade.push({
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments || '{}'),
        result,
      });

      iterationToolResults.push({
        name: toolCall.function.name,
        success,
        result,
      });
    }

    // Notify callback
    if (onIteration) {
      onIteration({ index: iterations, response, toolResults: iterationToolResults });
    }
  }

  // Extract final content
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const content = lastAssistant?.content || 'No response generated.';

  return {
    content,
    messages,
    iterations,
    totalTokens,
    toolCallsMade,
  };
}
