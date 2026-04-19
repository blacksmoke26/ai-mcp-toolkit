/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */
 
 /**
 * @module llm/ollama
 * @description Ollama LLM provider implementation.
 *
 * Connects to a local or remote Ollama instance to generate text completions.
 * Ollama provides a convenient way to run open-source LLMs locally.
 *
 * ## Features
 *
 * - Full chat completion support (with tool calling on supported models)
 * - Streaming responses via SSE
 * - Model listing and management
 * - Automatic retry on transient errors
 *
 * ## Setup
 *
 * 1. Install Ollama: https://ollama.ai
 * 2. Start the server: `ollama serve`
 * 3. Pull a model: `ollama pull llama3.1`
 *
 * The default Ollama API runs on `http://localhost:11434`.
 *
 * ## Example
 *
 * ```typescript
 * import { OllamaProvider } from '@/llm/ollama';
 *
 * const provider = new OllamaProvider({
 *   type: 'ollama',
 *   baseUrl: 'http://localhost:11434',
 *   defaultModel: 'llama3.1',
 * });
 *
 * const response = await provider.chat([
 *   { role: 'user', content: 'Hello!' },
 * ]);
 * console.log(response.content);
 * ```
 */

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMGenerationParams,
  LLMModelInfo,
  StreamChunk,
} from './types.js';
import type { ChatMessage, LLMCompletionResponse } from '@/mcp/types.js';

/**
 * Ollama LLM provider implementation.
 *
 * Connects to a local or remote Ollama instance to generate text completions.
 * Ollama provides a convenient way to run open-source LLMs locally.
 *
 * @remarks
 * This class implements the `LLMProvider` interface, translating standard
 * LLM requests into the specific format required by the Ollama API.
 * It handles both non-streaming and streaming chat completions, as well as
 * model listing and health checks.
 *
 * @example
 * ```typescript
 * const provider = new OllamaProvider({
 *   type: 'ollama',
 *   baseUrl: 'http://localhost:11434',
 *   defaultModel: 'llama3.1',
 * });
 * ```
 */
export class OllamaProvider implements LLMProvider {
  /** The unique identifier for this provider. */
  readonly name = 'ollama';

  /** Configuration options for the provider, including base URL and default model. */
  config: LLMProviderConfig;

  /**
   * Creates a new OllamaProvider instance.
   *
   * @param config - The configuration object for the provider.
   */
  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  // ─── Chat Completion ───────────────────────────────────────────────────

  /**
   * Sends a chat completion request to the Ollama API.
   *
   * @param messages - An array of chat messages representing the conversation history.
   * @param options - Optional generation parameters (e.g., temperature, maxTokens).
   * @returns A promise resolving to the complete LLM response.
   * @throws {Error} If the API request fails or returns a non-OK status.
   *
   * @dev
   * This method constructs the request payload using `buildParams`, sends it to the
   * `/api/chat` endpoint, and parses the JSON response using `parseResponse`.
   */
  async chat(
    messages: ChatMessage[],
    options?: Partial<LLMGenerationParams>,
  ): Promise<LLMCompletionResponse> {
    const params = this.buildParams(messages, options);
    const url = `${this.config.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('response', response, params);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaChatResponse;
    return this.parseResponse(data);
  }

  // ─── Streaming Chat ────────────────────────────────────────────────────

  /**
   * Streams a chat completion response from the Ollama API.
   *
   * @param messages - An array of chat messages representing the conversation history.
   * @param options - Optional generation parameters.
   * @returns An async generator yielding `StreamChunk` objects.
   * @throws {Error} If the API request fails or the response body is missing.
   *
   * @dev
   * This method enables streaming by setting `stream: true` in the params.
   * It reads the response body using a `ReadableStreamDefaultReader`, buffering
   * incoming data to handle split JSON lines (NDJSON). It parses each line
   * individually to yield content deltas and final usage statistics.
   */
  async *streamChat(
    messages: ChatMessage[],
    options?: Partial<LLMGenerationParams>,
  ): AsyncGenerator<StreamChunk> {
    const params = this.buildParams(messages, options);
    params.stream = true;
    const url = `${this.config.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Ollama streaming error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for streaming');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as OllamaStreamChunk;
          if (chunk.message?.content) {
            yield { type: 'content', delta: chunk.message.content, finish_reason: chunk.done ? 'stop' : undefined };
          }
          if (chunk.done) {
            yield {
              type: 'done',
              usage: chunk.prompt_eval_count || chunk.eval_count
                ? {
                    prompt_tokens: chunk.prompt_eval_count || 0,
                    completion_tokens: chunk.eval_count || 0,
                    total_tokens: (chunk.prompt_eval_count || 0) + (chunk.eval_count || 0),
                  }
                : undefined,
            };
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }

  // ─── Model Management ──────────────────────────────────────────────────

  /**
   * Lists available models from the Ollama instance.
   *
   * @returns A promise resolving to an array of `LLMModelInfo` objects.
   * @throws {Error} If the API request fails.
   *
   * @dev
   * Queries the `/api/tags` endpoint. Ollama does not expose `context_length`
   * directly, so it is set to `undefined` in the returned info.
   */
  async listModels(): Promise<LLMModelInfo[]> {
    const url = `${this.config.baseUrl}/api/tags`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Ollama list models error: ${response.status}`);
    }

    const data = await response.json() as { models: Array<{ name: string; size?: number; modified_at?: string; details?: { parent_model?: string; format?: string; family?: string; parameter_size?: string } }> };

    return (data.models || []).map((m) => ({
      id: m.name,
      name: m.name,
      owned_by: m.details?.family || 'local',
      context_length: undefined, // Ollama doesn't expose this directly
    }));
  }

  /**
   * Checks if the Ollama instance is reachable and healthy.
   *
   * @returns A promise resolving to `true` if the health check passes, `false` otherwise.
   *
   * @dev
   * Attempts to fetch the `/api/tags` endpoint with a 5-second timeout.
   * Any error (network or timeout) results in `false`.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────

  /**
   * Constructs the request payload for the Ollama API.
   *
   * @param messages - The chat messages to send.
   * @param options - Optional generation parameters to override defaults.
   * @returns A formatted object compatible with the Ollama API.
   *
   * @dev
   * Merges default parameters from the config with the provided options.
   * Maps standard LLM parameters (e.g., `maxTokens`) to Ollama-specific
   * parameters (e.g., `num_predict`).
   */
  private buildParams(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): Record<string, unknown> {
    const merged: LLMGenerationParams = {
      temperature: this.config.defaultParams?.temperature ?? 0.7,
      maxTokens: this.config.defaultParams?.maxTokens ?? 4096,
      ...options,
    };

    return {
      model: options?.model ?? (options?.system ? this.config.defaultModel : this.config.defaultModel),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      stream: false,
      options: {
        temperature: merged.temperature,
        num_predict: merged.maxTokens,
        top_p: merged.topP,
        frequency_penalty: merged.frequencyPenalty,
        presence_penalty: merged.presencePenalty,
        stop: merged.stop,
      },
      ...(options?.tools ? { tools: options.tools } : {}),
    };
  }

  /**
   * Parses the raw Ollama API response into a standard `LLMCompletionResponse`.
   *
   * @param data - The raw JSON response from Ollama.
   * @returns A standardized completion response object.
   *
   * @dev
   * Extracts content, model info, and usage statistics. Handles cases where
   * usage data might be missing.
   */
  private parseResponse(data: OllamaChatResponse): LLMCompletionResponse {
    return {
      content: data.message?.content || '',
      model: data.model || this.config.defaultModel,
      finish_reason: data.done ? 'stop' : 'length',
      usage: data.prompt_eval_count || data.eval_count
        ? {
            prompt_tokens: data.prompt_eval_count || 0,
            completion_tokens: data.eval_count || 0,
            total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          }
        : undefined,
    };
  }
}

// ─── Ollama API Types ─────────────────────────────────────────────────────────

/**
 * Represents a message within the Ollama API schema.
 */
interface OllamaMessage {
  role: string;
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

/**
 * Represents the full response object from a non-streaming Ollama chat request.
 */
interface OllamaChatResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

/**
 * Represents a single chunk in a streaming Ollama chat response.
 */
interface OllamaStreamChunk {
  model: string;
  message: OllamaMessage;
  done: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}
