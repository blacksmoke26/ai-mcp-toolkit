/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module mcp/resources/registry
 * @description Resource registry for managing MCP resources.
 *
 * Resources are read-only data sources that the LLM can access.
 * Examples: files, database tables, API responses.
 */

import {sampleResources} from './predefined';
import type {ResourceDefinition, ResourceContent, ReadResourceResult} from '../types';

/**
 * Handler function for reading a resource.
 * @param uri - The URI of the resource to read.
 * @returns A promise that resolves to an array of resource content items.
 */
export type ResourceHandler = (uri: string) => Promise<ResourceContent[]>;

/**
 * Extended resource definition with an associated read handler.
 * @extends ResourceDefinition
 */
export interface RegisteredResource extends ResourceDefinition {
  /**
   * The handler function responsible for reading the resource content.
   */
  handler: ResourceHandler;
}

/**
 * Registry for managing MCP resources.
 * Provides functionality to register, unregister, list, and read resources.
 */
class ResourceRegistry {
  /**
   * Internal map storing registered resources keyed by their URI.
   */
  private readonly resources: Map<string, RegisteredResource> = new Map();

  constructor() {
    // register the predefined prompts
    sampleResources.forEach(x => this.register(x));
  }

  /**
   * Registers a new resource in the registry.
   * @param resource - The resource to register, including its handler.
   * @throws {Error} If a resource with the same URI is already registered.
   */
  public register(resource: RegisteredResource): void {
    if (this.resources.has(resource.uri)) {
      throw new Error(`Resource "${resource.uri}" is already registered.`);
    }
    this.resources.set(resource.uri, resource);
  }

  /**
   * Unregisters a resource from the registry.
   * @param uri - The URI of the resource to remove.
   * @returns True if the resource was found and removed, false otherwise.
   */
  public unregister(uri: string): boolean {
    return this.resources.delete(uri);
  }

  /**
   * Retrieves a registered resource by its URI.
   * @param uri - The URI of the resource to retrieve.
   * @returns The registered resource if found, otherwise undefined.
   */
  public get(uri: string): RegisteredResource | undefined {
    return this.resources.get(uri);
  }

  /**
   * Lists all registered resource definitions, excluding their handlers.
   * @returns An array of resource definitions.
   */
  public listDefinitions(): ResourceDefinition[] {
    return Array.from(this.resources.values()).map(({handler: _h, ...def}) => def);
  }

  /**
   * Reads the content of a resource by its URI.
   * @param uri - The URI of the resource to read.
   * @returns A promise that resolves to the read resource result containing content.
   * @throws {Error} If the resource is not found in the registry.
   */
  public async read(uri: string): Promise<ReadResourceResult> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    const contents = await resource.handler(uri);
    return {contents};
  }

  /**
   * Gets the number of registered resources.
   * @returns The count of resources in the registry.
   */
  public get size(): number {
    return this.resources.size;
  }
}

/**
 * Singleton instance of the ResourceRegistry.
 * Use this instance to manage resources throughout the application.
 */
export const resourceRegistry: ResourceRegistry = new ResourceRegistry();

/**
 * Default export of the singleton resource registry instance.
 */
export default resourceRegistry;
