/**
 * @module mcp/prompts/registry
 * @description Prompt template registry for managing MCP prompts.
 * 
 * Prompts are reusable templates that can include variable placeholders.
 * The LLM can request a prompt by name and get back a fully-rendered
 * message sequence ready for conversation.
 */

import type {
  PromptDefinition,
  PromptMessage,
  GetPromptResult,
} from '../types.js';

/** Handler for rendering a prompt with arguments */
export type PromptHandler = (args: Record<string, string>) => Promise<GetPromptResult>;

/** Extended prompt with render handler */
export interface RegisteredPrompt extends PromptDefinition {
  handler: PromptHandler;
}

class PromptRegistry {
  private prompts: Map<string, RegisteredPrompt> = new Map();

  register(prompt: RegisteredPrompt): void {
    if (this.prompts.has(prompt.name)) {
      throw new Error(`Prompt "${prompt.name}" is already registered.`);
    }
    this.prompts.set(prompt.name, prompt);
  }

  unregister(name: string): boolean {
    return this.prompts.delete(name);
  }

  get(name: string): RegisteredPrompt | undefined {
    return this.prompts.get(name);
  }

  listDefinitions(): PromptDefinition[] {
    return Array.from(this.prompts.values()).map(({ handler: _h, ...def }) => def);
  }

  async render(name: string, args: Record<string, string> = {}): Promise<GetPromptResult> {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return prompt.handler(args);
  }

  get size(): number {
    return this.prompts.size;
  }
}

export const promptRegistry = new PromptRegistry();
export default promptRegistry;
