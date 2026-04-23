/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module llm/registry
 * @description LLM provider registry — manages provider instances and routing.
 *
 * The registry allows you to:
 *
 * - Register multiple LLM providers simultaneously
 * - Set a default provider for the agent loop
 * - Switch providers at runtime
 * - Load provider configurations from the database
 *
 * ## Usage
 *
 * ```typescript
 * import { llmRegistry } from '@/llm/registry';
 * import { OllamaProvider } from '@/llm/ollama';
 *
 * // Register a provider
 * llmRegistry.register(new OllamaProvider({
 *   type: 'ollama',
 *   baseUrl: 'http://localhost:11434',
 *   defaultModel: 'llama3.1',
 * }));
 *
 * // Get the default provider
 * const provider = llmRegistry.getDefault();
 *
 * // Use it
 * const response = await provider.chat([
 *   { role: 'user', content: 'Hello!' },
 * ]);
 * ```
 */

import type {LLMProvider, LLMProviderConfig} from './types.js';
import {OllamaProvider} from './ollama.js';
import {OpenAIProvider} from './openai.js';

/**
 * A registry for managing LLM provider instances.
 *
 * This class allows you to register, retrieve, and manage multiple LLM providers,
 * as well as define a default provider for operations.
 */
class LLMRegistry {
  /**
   * A map of registered provider instances, keyed by their name.
   */
  private providers: Map<string, LLMProvider> = new Map();

  /**
   * The name of the currently set default provider.
   * Null if no default has been set.
   */
  private defaultName: string | null = null;

  /**
   * Get the name of the current default provider.
   */
  get defaultProviderName(): string | null {
    return this.defaultName;
  }

  /**
   * Get the total number of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }

  /**
   * Register an LLM provider.
   * @param provider - Provider instance to register
   * @param isDefault - Whether to set this as the default provider
   */
  register(provider: LLMProvider, isDefault = false): void {
    this.providers.set(provider.name, provider);
    if (isDefault || this.defaultName === null) {
      this.defaultName = provider.name;
    }
  }

  /**
   * Unregister a provider by name.
   */
  unregister(name: string): boolean {
    if (this.defaultName === name) {
      // Reset default to the first available provider
      const remaining = Array.from(this.providers.keys()).filter((k) => k !== name);
      this.defaultName = remaining[0] || null;
    }
    return this.providers.delete(name);
  }

  /**
   * Get a provider by name.
   */
  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get the default provider.
   * @throws {Error} If no providers are registered
   */
  getDefault(): LLMProvider {
    if (!this.defaultName) {
      throw new Error('No LLM provider registered. Register at least one provider.');
    }
    const provider = this.providers.get(this.defaultName);
    if (!provider) {
      throw new Error(`Default provider "${this.defaultName}" not found.`);
    }
    return provider;
  }

  /**
   * Set the default provider by name.
   * @returns true if the provider was found and set as default
   */
  setDefault(name: string): boolean {
    if (!this.providers.has(name)) return false;
    this.defaultName = name;
    return true;
  }

  /**
   * List all registered provider instances.
   */
  list(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * List all registered provider names.
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Create and register a provider from a configuration object.
   * @param config - Provider configuration
   * @param isDefault - Whether to set as default
   * @returns The created provider instance
   */
  createFromConfig(config: LLMProviderConfig, isDefault = false): LLMProvider {
    let provider: LLMProvider;

    switch (config.type) {
      case 'ollama':
        provider = new OllamaProvider(config);
        break;
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      default:
        throw new Error(`Unknown provider type: ${config.type}. Supported: 'ollama', 'openai'`);
    }

    this.register(provider, isDefault);
    return provider;
  }
}

/** Global singleton LLM provider registry */
export const llmRegistry = new LLMRegistry();

export default llmRegistry;
