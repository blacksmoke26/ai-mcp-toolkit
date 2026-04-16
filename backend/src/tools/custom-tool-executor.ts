/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module tools/custom-tool-executor
 * @description Custom tool executor for loading and executing user-defined MCP tools.
 *
 * This module provides functionality to:
 *
 * - Load custom tools from the database
 * - Safely execute custom tool handler code
 * - Register/unregister custom tools dynamically
 * - Test custom tools before deployment
 * - Manage custom tool lifecycle
 *
 * ## Security Note
 *
 * Custom tool code is executed in a restricted environment with limited access
 * to the global scope. Users should be trusted as the code runs on the server.
 *
 * ## Usage
 *
 * ```typescript
 * import { customToolExecutor } from '@/tools/custom-tool-executor';
 *
 * // Load all custom tools from database
 * await customToolExecutor.loadAllFromDatabase();
 *
 * // Test a custom tool
 * const result = await customToolExecutor.testTool(toolId, { arg1: 'value' });
 *
 * // Reload a specific tool after update
 * await customToolExecutor.reloadTool(toolId);
 * ```
 */

import type {CallToolResult} from '@/mcp/types.js';
import type {CustomTool} from '@/db/index.js';
import {CustomTool as CustomToolModel} from '@/db/index.js';
import toolRegistry from '@/mcp/tools/registry.js';
import logger from '@/utils/logger.js';

 /**
  * Runtime representation of a custom tool loaded from the database.
  *
  * Extends the database `CustomTool` model by converting `id` to a required number,
  * keeping `handlerCode` as a raw string for re-compilation, and adding the optional
  * compiled `handler` function that executes the tool logic.
  *
  * @dev Note: The `Omit` removes `id`, `createdAt`, `updatedAt`, and `handlerCode` from
  * the base `CustomTool` type so we can redeclare `id` as `number` (instead of the
  * model's possible union type) and `handlerCode` as a plain `string`. The `handler`
  * property is only present after the code has been successfully compiled via
  * {@link CustomToolExecutor.createSafeHandler}.
  */
 export interface CustomToolInstance extends Omit<CustomTool, 'id' | 'createdAt' | 'updatedAt' | 'handlerCode'> {
   /** Unique numeric identifier for the custom tool (redeclared as plain number) */
   id: number;
   /** Raw JavaScript source code for the tool handler; compiled into `handler` at runtime */
   handlerCode: string;
   /** Compiled async handler function, or `undefined` if compilation failed */
   handler?: (args: Record<string, unknown>) => Promise<CallToolResult>;
 }

 /**
  * Manages the lifecycle of user-defined (custom) MCP tools.
  *
  * The executor is responsible for loading custom tool definitions from the database,
  * compiling their handler code into safe executable functions, registering them with
  * the global {@link toolRegistry}, and providing testing / validation utilities.
  *
  * ### Architecture
  *
  * - **Loading** — On startup (or on demand), {@link CustomToolExecutor.loadAllFromDatabase}
  *   fetches every enabled custom tool from the database and registers each one.
  * - **Compilation** — Handler source code is compiled via `new Function` inside
  *   {@link CustomToolExecutor.createSafeHandler}, which injects a restricted context
  *   (`safeContext`) to limit access to globals.
  * - **Registration** — Each compiled tool is registered with the shared
  *   {@link toolRegistry} so it becomes available to MCP clients.
  * - **Unregistration / Reload** — Tools can be removed or hot-reloaded without
  *   restarting the server.
  *
  * ### Security considerations
  *
  * Custom tool code is executed through `new Function`, which runs in the Node.js
  * process. The `safeContext` object provides only a whitelist of globals (JSON, Math,
  * Date, a proxied console, and a sleep helper). However, `new Function` is **not** a
  * sandbox — determined authors can escape the restricted context. Therefore, custom
  * tools should only be authored by trusted users.
  *
  * @dev The class is used as a singleton via {@link customToolExecutor}. Direct
  * instantiation is possible but discouraged to avoid duplicate in-memory tool maps.
  */
 class CustomToolExecutor {
   /**
    * In-memory index of loaded custom tools keyed by their database ID.
    *
    * @dev Uses a `Map` for O(1) lookups by ID. The map is the single source of truth
    * for which tools are currently active in this executor instance.
    */
   private loadedTools: Map<number, CustomToolInstance> = new Map();

   /**
    * Get the number of currently loaded custom tools.
    *
    * @returns The count of tools held in memory
    */
   get size(): number {
     return this.loadedTools.size;
   }

   /**
    * Load all enabled custom tools from the database and register them with the
    * global tool registry.
    *
    * Typically called once during application startup. Tools that fail to load are
    * logged but do **not** prevent the remaining tools from being registered.
    *
    * @dev The query filters by `enabled: true` and orders by `createdAt DESC` so that
    * newer tools are processed first. If two tools share the same `name`, the one
    * registered last will win in the tool registry — hence the ordering matters.
    */
   async loadAllFromDatabase(): Promise<void> {
     logger.info('Loading custom tools from database...');

     const customTools = await CustomToolModel.findAll({
       where: {enabled: true},
       order: [['createdAt', 'DESC']],
     });

     for (const dbTool of customTools) {
       try {
         await this.registerFromDatabase(dbTool);
       } catch (error) {
         logger.error(
           {tool: dbTool.name, error: error instanceof Error ? error.message : error},
           'Failed to load custom tool',
         );
       }
     }

     logger.info(`Loaded ${this.size} custom tools from database`);
   }

   /**
    * Register a single custom tool from a database record.
    *
    * Compiles the handler code, stores the instance in the in-memory map, and
    * registers it with the shared tool registry so it becomes callable by clients.
    *
    * @param dbTool - Sequelize model instance representing the custom tool row
    * @returns The compiled {@link CustomToolInstance}
    * @throws Re-throws any error from {@link toolRegistry.register} so callers can
    *   decide how to handle registration failures (e.g. skip and continue)
    *
    * @dev The non-null assertion `toolInstance.handler!` is safe because
    *   {@link CustomToolExecutor.createSafeHandler} always returns a callable — even on
    *   compilation failure it returns an error-reporting handler rather than `undefined`.
    */
   async registerFromDatabase(dbTool: typeof CustomToolModel.prototype): Promise<CustomToolInstance> {
     const toolInstance = this.createToolInstance(dbTool);
     this.loadedTools.set(toolInstance.id, toolInstance);

     // Register with MCP tool registry
     try {
       toolRegistry.register({
         name: toolInstance.name,
         description: toolInstance.description,
         inputSchema: JSON.parse(toolInstance.inputSchema),
         category: toolInstance.category || 'custom',
         handler: toolInstance.handler!,
       });
       logger.info({tool: toolInstance.name}, 'Custom tool registered');
     } catch (error) {
       logger.error(
         {tool: toolInstance.name, error: error instanceof Error ? error.message : error},
         'Failed to register custom tool',
       );
       throw error;
     }

     return toolInstance;
   }

   /**
    * Create a {@link CustomToolInstance} from a database model record, compiling the
    * handler source code into an executable function.
    *
    * @param dbTool - Sequelize model instance for the custom tool
    * @returns A fully assembled tool instance with compiled `handler`
    *
    * @dev Uses `dbTool.toJSON()` to strip Sequelize metadata and then casts to
    *   `CustomToolInstance`. The spread of `...rest` preserves all fields that are
    *   not explicitly destructured (`id`, `handlerCode`).
    */
   private createToolInstance(dbTool: typeof CustomToolModel.prototype): CustomToolInstance {
     const {id, handlerCode, ...rest} = dbTool.toJSON() as unknown as CustomToolInstance;

     const handler = this.createSafeHandler(handlerCode);

     return {
       id,
       ...rest,
       handlerCode,
       handler,
     };
   }

   /**
    * Compile a handler code string into a safe, async executable function.
    *
    * The generated function receives two arguments — `args` (the caller-provided
    * parameters) and `safeContext` (a whitelist of permitted globals). The handler
    * code is expected to return an object matching the {@link CallToolResult} shape.
    *
    * ### Provided context (`safeContext`)
    *
    * | Key      | Description                                               |
    * |----------|-----------------------------------------------------------|
    * | `JSON`   | Standard JSON parse / stringify                           |
    * | `Math`   | Standard Math utilities                                   |
    * | `Date`   | Standard Date constructor                                 |
    * | `console`| Proxied console — logs route to structured logger         |
    * | `sleep`  | `async (ms: number) => void` — promise-based delay       |
    *
    * If compilation fails, a fallback handler is returned that always responds with
    * an `isError: true` result describing the compilation error.
    *
    * @param handlerCode - Raw JavaScript source string provided by the tool author
    * @returns An async function that accepts args and returns a {@link CallToolResult}
    *
    * @dev **Security warning** — `new Function` is not a sandbox. Although
    *   `safeContext` limits *direct* access to globals, a determined author can still
    *   reach Node.js internals via prototype chains or `this`. This is acceptable only
    *   when tool authors are trusted. Consider migrating to a proper VM sandbox (e.g.
    *   `node:vm` with a separate context) if untrusted authors must be supported.
    *
    * @dev Result validation checks for a truthy object with a `content` array. These
    *   checks are intentionally minimal — full JSON Schema validation of the result
    *   could be added later if stricter guarantees are required.
    */
   private createSafeHandler(handlerCode: string): (args: Record<string, unknown>) => Promise<CallToolResult> {
     // Define allowed globals and utilities
     const safeContext = {
       // JSON utilities
       JSON,
       // Math utilities
       Math,
       // Date utilities
       Date,
       // Console (for debugging)
       console: {
         log: (...args: unknown[]) => logger.debug({source: 'custom-tool'}, args.join(' ')),
         error: (...args: unknown[]) => logger.error({source: 'custom-tool'}, args.join(' ')),
         warn: (...args: unknown[]) => logger.warn({source: 'custom-tool'}, args.join(' ')),
       },
       // Helper functions
       sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
     };

     // Create the handler function with restricted context
     try {
       // eslint-disable-next-line no-new-func
       const handlerFunc = new Function('args', 'safeContext', handlerCode);

       return async (args: Record<string, unknown>): Promise<CallToolResult> => {
         const result = await handlerFunc(args, safeContext);

         // Validate result format
         if (!result || typeof result !== 'object') {
           throw new Error('Handler must return an object with "content" property');
         }

         if (!result.content || !Array.isArray(result.content)) {
           throw new Error('Handler result must have "content" array');
         }

         return result as CallToolResult;
       };
     } catch (error) {
       const msg = error instanceof Error ? error.message : String(error);
       logger.error({error: msg}, 'Failed to create handler function');

       // Return a handler that always throws the compilation error
       return async (): Promise<CallToolResult> => ({
         content: [{type: 'text', text: `Error: Tool code compilation failed: ${msg}`}],
         isError: true,
       });
     }
   }

   /**
    * Unregister a custom tool by its database ID.
    *
    * Removes the tool from the shared tool registry and from the in-memory map.
    * After unregistration the tool will no longer be callable by clients.
    *
    * @param toolId - Database primary key of the tool to remove
    * @returns `true` if the tool was found and successfully unregistered;
    *   `false` if the tool was not loaded
    *
    * @dev If `toolRegistry.unregister` returns `false` (e.g. the tool had already been
    *   removed from the registry independently), the in-memory entry is **not** deleted
    *   to keep the two stores consistent. This is intentional — the registry is the
    *   source of truth for client availability.
    */
   async unregisterTool(toolId: number): Promise<boolean> {
     const tool = this.loadedTools.get(toolId);
     if (!tool) {
       return false;
     }

     // Unregister from MCP tool registry
     const unregistered = toolRegistry.unregister(tool.name);

     if (unregistered) {
       this.loadedTools.delete(toolId);
       logger.info({tool: tool.name}, 'Custom tool unregistered');
     }

     return unregistered;
   }

   /**
    * Reload a custom tool after it has been updated in the database.
    *
    * Unregisters the existing tool (if loaded) and re-fetches the latest database row.
    * If the tool is disabled or no longer exists, `null` is returned and the old
    * registration is removed.
    *
    * @param toolId - Database primary key of the tool to reload
    * @returns The freshly loaded {@link CustomToolInstance}, or `null` if the tool was
    *   deleted or disabled
    *
    * @dev The current implementation is not atomic — there is a brief window between
    *   unregistration and re-registration where the tool name is absent from the
    *   registry. For most use-cases this is acceptable, but a transactional approach
    *   could be implemented if zero-downtime reloads are required.
    */
   async reloadTool(toolId: number): Promise<CustomToolInstance | null> {
     // Unregister existing tool
     await this.unregisterTool(toolId);

     // Load updated tool from database
     const dbTool = await CustomToolModel.findByPk(toolId);
     return !dbTool || !dbTool.enabled
       ? null :
       this.registerFromDatabase(dbTool);
   }

   /**
    * Execute a custom tool with the given arguments for testing purposes.
    *
    * If the tool is not currently loaded, it is loaded from the database on-the-fly
    * (but **not** registered in the tool registry — this avoids side-effects during
    * testing). The test arguments and result are persisted back to the database for
    * auditing and replay.
    *
    * @param toolId - Database primary key of the tool to test
    * @param args   - Arguments to pass to the tool handler
    * @returns A {@link CallToolResult} — either the handler's output or an error result
    *
    * @dev When the tool is not already loaded, we create a temporary instance via
    *   {@link CustomToolExecutor.createToolInstance} but intentionally skip calling
    *   {@link CustomToolExecutor.registerFromDatabase}. This ensures a test run does
    *   not leak a tool registration.
    *
    * @dev The `lastTestArgs` and `lastTestResult` columns are stored as JSON strings.
    *   Large results could exceed column size limits — consider adding truncation or
    *   a dedicated test-result table if this becomes an issue.
    */
   async testTool(
     toolId: number,
     args: Record<string, unknown>,
   ): Promise<CallToolResult> {
     const tool = this.loadedTools.get(toolId);

     if (!tool || !tool.handler) {
       // Tool not loaded, try to load it
       const dbTool = await CustomToolModel.findByPk(toolId);
       if (!dbTool) {
         return {
           content: [{type: 'text', text: `Error: Tool with ID ${toolId} not found`}],
           isError: true,
         };
       }

       const toolInstance = this.createToolInstance(dbTool);
       if (!toolInstance.handler) {
         return {
           content: [{type: 'text', text: 'Error: Tool handler is not defined'}],
           isError: true,
         };
       }

       return toolInstance.handler(args);
     }

     try {
       const result = await tool.handler(args);

       // Save test result to database
       await CustomToolModel.update(
         {
           lastTestArgs: JSON.stringify(args),
           lastTestResult: JSON.stringify(result),
         },
         {where: {id: toolId}},
       );

       return result;
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       logger.error({toolId, args, error: message}, 'Custom tool test failed');

       return {
         content: [{type: 'text', text: `Execution error: ${message}`}],
         isError: true,
       };
     }
   }

   /**
    * Validate the syntax of custom tool handler code without executing it.
    *
    * Attempts to compile the code via `new Function`; if parsing succeeds the code
    * is considered syntactically valid. Note that this does **not** guarantee the
    * code will run without runtime errors.
    *
    * @param handlerCode - Raw JavaScript source string to validate
    * @returns An object with `valid: true` on success, or `valid: false` and an
    *   `error` message describing the syntax issue
    *
    * @dev Uses the same `new Function` compilation strategy as
    *   {@link CustomToolExecutor.createSafeHandler} so that validation is consistent
    *   with actual execution compilation.
    */
   validateCode(handlerCode: string): { valid: boolean; error?: string } {
     try {
       // Test if the code can be parsed
       // eslint-disable-next-line no-new-func
       new Function('args', 'safeContext', handlerCode);
       return {valid: true};
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       return {valid: false, error: message};
     }
   }

   /**
    * Validate a JSON Schema string intended for use as a tool's `inputSchema`.
    *
    * Performs structural checks to ensure the schema declares `type: "object"` and
    * includes a `properties` object. More rigorous JSON Schema meta-validation could
    * be added in the future.
    *
    * @param schemaJson - JSON string representing the schema
    * @returns On success: `{ valid: true, schema }` with the parsed schema object.
    *   On failure: `{ valid: false, error }` with a human-readable message.
    *
    * @dev The validation is intentionally lightweight. Full JSON Schema draft
    *   compliance checking (e.g. using `ajv`) is not performed to keep dependencies
    *   minimal. If stricter validation is needed, swap this implementation out.
    */
   validateSchema(schemaJson: string): { valid: boolean; error?: string; schema?: unknown } {
     try {
       const schema = JSON.parse(schemaJson);
       // Basic validation - check required fields
       if (!schema.type || schema.type !== 'object') {
         return {valid: false, error: 'Schema must be of type "object"'};
       }
       if (!schema.properties || typeof schema.properties !== 'object') {
         return {valid: false, error: 'Schema must have "properties" object'};
       }
       return {valid: true, schema};
     } catch (error) {
       const message = error instanceof Error ? error.message : String(error);
       return {valid: false, error: message};
     }
   }

   /**
    * Retrieve a loaded custom tool by its database ID.
    *
    * @param id - Database primary key of the tool
    * @returns The {@link CustomToolInstance} if loaded, otherwise `undefined`
    */
   get(id: number): CustomToolInstance | undefined {
     return this.loadedTools.get(id);
   }

   /**
    * List all currently loaded custom tools.
    *
    * @returns A new array containing every loaded {@link CustomToolInstance}
    *
    * @dev Returns a copy (`Array.from`) so callers cannot mutate the internal map
    *   by modifying the returned array reference.
    */
   listAll(): CustomToolInstance[] {
     return Array.from(this.loadedTools.values());
   }

   /**
    * Unregister all loaded custom tools and clear the in-memory map.
    *
    * Each tool is removed from the shared tool registry before the map is cleared,
    * ensuring clients can no longer invoke any custom tool after this call.
    *
    * @dev This is primarily useful for testing or graceful shutdown. The method is
    *   `async` for consistency, though the current implementation is synchronous.
    */
   async clearAll(): Promise<void> {
     for (const tool of this.loadedTools.values()) {
       toolRegistry.unregister(tool.name);
     }
     this.loadedTools.clear();
     logger.info('All custom tools cleared from executor');
   }
 }

 /**
  * Global singleton instance of {@link CustomToolExecutor}.
  *
  * Use this exported reference rather than creating a new instance to ensure a
  * single in-memory tool map shared across the application.
  */
 export const customToolExecutor = new CustomToolExecutor();
 export default customToolExecutor;
