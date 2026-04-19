/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module llm/openai
 * @description OpenAI-compatible LLM provider implementation.
 *
 * Works with any API that implements the OpenAI chat completions format:
 *
 * - OpenAI (GPT-4, GPT-3.5, etc.)
 * - Azure OpenAI
 * - LiteLLM proxy
 * - vLLM
 * - Together AI
 * - Anyscale
 * - Fireworks AI
 * - Ollama's OpenAI-compatible endpoint (`/v1/chat/completions`)
 *
 * ## Features
 *
 * - Full chat completion support with tool calling
 * - Streaming responses
 * - Model listing
 * - Token usage tracking
 *
 * ## Configuration
 *
 * ```typescript
 * const provider = new OpenAIProvider({
 *   type: 'openai',
 *   baseUrl: 'https://api.openai.com/v1',  // or any compatible endpoint
 *   apiKey: 'sk-...',
 *   defaultModel: 'gpt-4',
 * });
 * ```
 */

import type {
  LLMProvider,
  LLMProviderConfig,
  LLMGenerationParams,
  LLMModelInfo,
  StreamChunk,
} from './types.js';
import type { ChatMessage, LLMCompletionResponse, ToolCall } from '@/mcp/types.js';
import { createHttpClient, type HttpClientConfig, HttpError } from '@/utils/httpClient.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  config: LLMProviderConfig;

  /** HTTP client instance for making API requests. */
  private httpClient: ReturnType<typeof createHttpClient>;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      console.warn('⚠️  OpenAI provider created without an API key. Set OPENAI_API_KEY or configure in the database.');
    }
    this.config = config;
    this.httpClient = createHttpClient(this.buildHttpClientConfig());
  }

  /**
   * Builds the HTTP client configuration from provider config.
   *
   * @returns HttpClientConfig object with base URL, headers, and authentication.
   */
  private buildHttpClientConfig(): HttpClientConfig {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return {
      baseUrl: this.config.baseUrl,
      timeout: 60000, // 60 seconds timeout for LLM requests
      headers,
      maxRetries: 3,
      retryDelay: 1000,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    };
  }

  // ─── Chat Completion ───────────────────────────────────────────────────

  async chat(
    messages: ChatMessage[],
    options?: Partial<LLMGenerationParams>,
  ): Promise<LLMCompletionResponse> {
    const body = this.buildBody(messages, options);

    try {
      const response = await this.httpClient.post<OpenAIChatResponse>('/chat/completions', body);

      if (response.status < 200 || response.status >= 300) {
        throw new HttpError(
          `OpenAI API error: ${response.status} ${response.statusText}`,
          response.status,
          { data: response.data, status: response.status, statusText: response.statusText },
        );
      }

      return this.parseResponse(response.data);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(`OpenAI chat request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ─── Streaming Chat ────────────────────────────────────────────────────

  async *streamChat(
    messages: ChatMessage[],
    options?: Partial<LLMGenerationParams>,
  ): AsyncGenerator<StreamChunk> {
    const body = this.buildBody(messages, options);
    body.stream = true;

    try {
      const stream = await this.httpClient.stream('/chat/completions', {
        method: 'POST',
        data: body,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const payload = trimmed.slice(6);
          if (payload === '[DONE]') {
            yield { type: 'done' };
            return;
          }

          try {
            const chunk = JSON.parse(payload) as OpenAIStreamChunk;
            const delta = chunk.choices?.[0]?.delta;

            if (delta?.content) {
              yield {
                type: 'content',
                delta: delta.content,
                finish_reason: chunk.choices?.[0]?.finish_reason ?? undefined,
              };
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                yield {
                  type: 'tool_call',
                  id: tc.id ?? '',
                  name: tc.function?.name ?? '',
                  arguments: tc.function?.arguments ?? '',
                  finish_reason: chunk.choices?.[0]?.finish_reason ?? undefined,
                };
              }
            }

            if (chunk.choices?.[0]?.finish_reason === 'stop' || chunk.choices?.[0]?.finish_reason === 'tool_calls') {
              yield {
                type: 'done',
                usage: chunk.usage
                  ? {
                      prompt_tokens: chunk.usage.prompt_tokens,
                      completion_tokens: chunk.usage.completion_tokens,
                      total_tokens: chunk.usage.total_tokens,
                    }
                  : undefined,
              };
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(`OpenAI streaming request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ─── Model Management ──────────────────────────────────────────────────

  async listModels(): Promise<LLMModelInfo[]> {
    try {
      const response = await this.httpClient.get<{ data: Array<{ id: string; owned_by?: string }> }>('/models');

      if (response.status < 200 || response.status >= 300) {
        throw new HttpError(
          `OpenAI list models error: ${response.status}`,
          response.status,
          { data: response.data, status: response.status, statusText: response.statusText },
        );
      }

      return (response.data.data || []).map((m) => ({
        id: m.id,
        name: m.id,
        owned_by: m.owned_by,
      }));
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(`OpenAI list models request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await this.httpClient.get('/models', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.status >= 200 && response.status < 300;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof HttpError && error.isCancelled) {
          return false;
        }
        throw error;
      }
    } catch {
      return false;
    }
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────

  private buildBody(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): Record<string, unknown> {
    const merged: LLMGenerationParams = {
      temperature: this.config.defaultParams?.temperature ?? 0.7,
      maxTokens: this.config.defaultParams?.maxTokens ?? 4096,
      ...options,
    };

    const body: Record<string, unknown> = {
      model: this.config.defaultModel,
      messages: messages.map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        if (m.name) msg.name = m.name;
        return msg;
      }),
      temperature: merged.temperature,
      max_tokens: merged.maxTokens,
      stream: false,
    };

    if (merged.topP !== undefined) body.top_p = merged.topP;
    if (merged.frequencyPenalty !== undefined) body.frequency_penalty = merged.frequencyPenalty;
    if (merged.presencePenalty !== undefined) body.presence_penalty = merged.presencePenalty;
    if (merged.stop) body.stop = merged.stop;
    if (merged.tools) body.tools = merged.tools;
    if (merged.toolChoice) body.tool_choice = merged.toolChoice;

    return body;
  }

  private parseResponse(data: OpenAIChatResponse): LLMCompletionResponse {
    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';

    const toolCalls: ToolCall[] | undefined = choice?.message?.tool_calls?.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    return {
      content,
      tool_calls: toolCalls?.length ? toolCalls : undefined,
      model: data.model || this.config.defaultModel,
      finish_reason: choice?.finish_reason || 'stop',
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }
}

// ─── OpenAI API Types ────────────────────────────────────────────────────────

interface OpenAIChatResponse {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
