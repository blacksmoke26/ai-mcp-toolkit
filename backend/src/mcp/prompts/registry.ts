/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module mcp/prompts/registry
 * @description Prompt template registry for managing MCP prompts.
 *
 * Prompts are reusable templates that can include variable placeholders.
 * The LLM can request a prompt by name and get back a fully-rendered
 * message sequence ready for conversation.
 */

import type {GetPromptResult, PromptDefinition} from '../types';
import {samplePrompts} from './predefined';

/**
 * Handler function type for rendering a prompt with provided arguments.
 *
 * @param args - A record mapping variable names to their string values for substitution.
 * @returns A Promise that resolves to the rendered prompt result containing messages.
 */
export type PromptHandler = (args: Record<string, string>) => Promise<GetPromptResult>;

/**
 * Represents a registered prompt with its associated render handler.
 * Extends the base PromptDefinition with execution capabilities.
 */
export interface RegisteredPrompt extends PromptDefinition {
  /**
   * The handler function responsible for rendering the prompt template
   * with the provided arguments.
   */
  handler: PromptHandler;
}

/**
 * Registry class for managing prompt templates and their rendering logic.
 * Provides methods to register, retrieve, list, and render prompts.
 */
class PromptRegistry {
  /** Internal storage mapping prompt names to their registered definitions. */
  private prompts: Map<string, RegisteredPrompt> = new Map();

  constructor() {
    // register the predefined prompts
    samplePrompts.forEach(x => this.register(x));
  }

  /**
   * Registers a new prompt in the registry.
   *
   * @param prompt - The prompt definition including its render handler.
   * @throws {Error} If a prompt with the same name is already registered.
   */
  register(prompt: RegisteredPrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt "${prompt.name}" is already registered.`);
    }
    this.prompts.set(prompt.name, prompt);
  }

  /**
   * Removes a prompt from the registry.
   *
   * @param name - The name of the prompt to unregister.
   * @returns True if the prompt was found and removed, false otherwise.
   */
  unregister(name: string): boolean {
    return this.prompts.delete(name);
  }

  /**
   * Retrieves a registered prompt by name.
   *
   * @param name - The name of the prompt to retrieve.
   * @returns The RegisteredPrompt if found, otherwise undefined.
   */
  get(name: string): RegisteredPrompt | undefined {
    return this.prompts.get(name);
  }

  /**
   * Lists all registered prompt definitions without their handlers.
   *
   * @returns An array of PromptDefinition objects representing all registered prompts.
   */
  listDefinitions(): PromptDefinition[] {
    return Array.from(this.prompts.values()).map(({handler: _h, ...def}) => def);
  }

  /**
   * Renders a prompt by name with the provided arguments.
   *
   * @param name - The name of the prompt to render.
   * @param args - Optional record of variable names to values for substitution.
   * @returns A Promise that resolves to the rendered GetPromptResult.
   * @throws {Error} If no prompt with the given name is registered.
   */
  async render(name: string, args: Record<string, string> = {}): Promise<GetPromptResult> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return prompt.handler(args);
  }

  /**
   * Gets the number of prompts currently registered.
   *
   * @returns The count of registered prompts.
   */
  get size(): number {
    return this.prompts.size;
  }
}

/** Global singleton instance of the PromptRegistry. */
export const promptRegistry = new PromptRegistry();
export default promptRegistry;
