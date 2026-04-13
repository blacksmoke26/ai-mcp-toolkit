/**
 * @module mcp/resources/registry
 * @description Resource registry for managing MCP resources.
 * 
 * Resources are read-only data sources that the LLM can access.
 * Examples: files, database tables, API responses.
 */

import type { ResourceDefinition, ResourceContent, ReadResourceResult } from '../types.js';

/** Handler function for reading a resource */
export type ResourceHandler = (uri: string) => Promise<ResourceContent[]>;

/** Extended resource with read handler */
export interface RegisteredResource extends ResourceDefinition {
  handler: ResourceHandler;
}

class ResourceRegistry {
  private resources: Map<string, RegisteredResource> = new Map();

  register(resource: RegisteredResource): void {
    if (this.resources.has(resource.uri)) {
      throw new Error(`Resource "${resource.uri}" is already registered.`);
    }
    this.resources.set(resource.uri, resource);
  }

  unregister(uri: string): boolean {
    return this.resources.delete(uri);
  }

  get(uri: string): RegisteredResource | undefined {
    return this.resources.get(uri);
  }

  listDefinitions(): ResourceDefinition[] {
    return Array.from(this.resources.values()).map(({ handler: _h, ...def }) => def);
  }

  async read(uri: string): Promise<ReadResourceResult> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }
    const contents = await resource.handler(uri);
    return { contents };
  }

  get size(): number {
    return this.resources.size;
  }
}

export const resourceRegistry = new ResourceRegistry();
export default resourceRegistry;
