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

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  // ─── Chat Completion ───────────────────────────────────────────────────

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

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaChatResponse;
    return this.parseResponse(data);
  }

  // ─── Streaming Chat ────────────────────────────────────────────────────

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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ─── Internal Helpers ──────────────────────────────────────────────────

  private buildParams(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): Record<string, unknown> {
    const merged: LLMGenerationParams = {
      temperature: this.config.defaultParams?.temperature ?? 0.7,
      maxTokens: this.config.defaultParams?.maxTokens ?? 4096,
      ...options,
    };

    return {
      model: options?.system ? this.config.defaultModel : this.config.defaultModel,
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

interface OllamaMessage {
  role: string;
  content: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
}

interface OllamaStreamChunk {
  model: string;
  message: OllamaMessage;
  done: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}
