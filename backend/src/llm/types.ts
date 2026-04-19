/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

 /**
 * @module llm/types
 * @description Abstract LLM provider interface and related types.
 *
 * This module defines the contract that all LLM providers must implement.
 * The MCP server uses this interface to communicate with different LLM backends
 * (Ollama, OpenAI-compatible, etc.) interchangeably.
 *
 * ## Implementing a Custom Provider
 *
 * To add support for a new LLM service:
 *
 * 1. Create a new file in `src/llm/` (e.g., `my-provider.ts`)
 * 2. Implement the `LLMProvider` interface
 * 3. Register it with the `llmRegistry`
 *
 * ```typescript
 * import type { LLMProvider, LLMProviderConfig } from './types';
 *
 * export class MyProvider implements LLMProvider {
 *   name = 'my-provider';
 *   config: LLMProviderConfig;
 *
 *   constructor(config: LLMProviderConfig) {
 *     this.config = config;
 *   }
 *
 *   async chat(messages, options) {
 *     // Your implementation
 *     return { content: '...', model: '...', finish_reason: 'stop' };
 *   }
 *
 *   async *streamChat(messages, options) {
 *     // Streaming implementation
 *     yield { type: 'content', delta: '...' };
 *   }
 *
 *   async listModels() {
 *     return [{ id: 'model-name', ... }];
 *   }
 * }
 * ```
 */

import type { ChatMessage, LLMCompletionResponse } from '@/mcp/types';

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/** Configuration for an LLM provider instance */
export interface LLMProviderConfig {
  /** Provider type identifier (e.g., 'ollama', 'openai') */
  type: string;
  /** Base URL for the provider's API */
  baseUrl: string;
  /** API key (if required) */
  apiKey?: string;
  /** Default model name */
  defaultModel: string;
  /** Default generation parameters */
  defaultParams?: Partial<LLMGenerationParams>;
  /** Arbitrary extra settings */
  extra?: Record<string, unknown>;
}

/** Parameters for LLM text generation */
export interface LLMGenerationParams {
  /** LLM model to use */
  model?: string;
  /** Sampling temperature (0.0 = deterministic, 2.0 = very creative) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p (nucleus) sampling threshold */
  topP?: number;
  /** Frequency penalty (-2.0 to 2.0) */
  frequencyPenalty?: number;
  /** Presence penalty (-2.0 to 2.0) */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
  /** System prompt (overrides the system message in the conversation) */
  system?: string;
  /** List of tools available to the model */
  tools?: LLMToolDefinition[];
  /** Whether to force tool calls (only some providers support this) */
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
}

/** Tool definition as expected by LLM providers */
export interface LLMToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Interface
// ═══════════════════════════════════════════════════════════════════════════════

/** Model information returned by listModels() */
export interface LLMModelInfo {
  /** Model identifier */
  id: string;
  /** Human-readable model name */
  name?: string;
  /** Model owner/organization */
  owned_by?: string;
  /** Context window size in tokens */
  context_length?: number;
  /** Whether the model supports tool calling */
  supports_tools?: boolean;
}

/** Streaming chunk emitted during generation */
export type StreamChunk =
  | { type: 'content'; delta: string; finish_reason?: string }
  | { type: 'tool_call'; id: string; name: string; arguments: string; finish_reason?: string }
  | { type: 'done'; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } };

/**
 * Abstract LLM provider interface.
 *
 * All LLM backends (Ollama, OpenAI, etc.) must implement this interface
 * to be usable by the MCP server's agent loop.
 */
export interface LLMProvider {
  /** Unique provider type identifier */
  readonly name: string;
  /** Provider configuration */
  config: LLMProviderConfig;

  /**
   * Send a chat completion request.
   * @param messages - Conversation history
   * @param options - Generation parameters
   * @returns The model's response
   */
  chat(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): Promise<LLMCompletionResponse>;

  /**
   * Stream a chat completion response.
   * Yields partial content as it's generated.
   * @param messages - Conversation history
   * @param options - Generation parameters
   */
  streamChat(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): AsyncGenerator<StreamChunk>;

  /**
   * List available models from this provider.
   * @returns Array of model information
   */
  listModels(): Promise<LLMModelInfo[]>;

  /**
   * Check if the provider is healthy and reachable.
   * @returns true if the provider is available
   */
  healthCheck(): Promise<boolean>;
}
