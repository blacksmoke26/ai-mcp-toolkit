/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

 /**
 * @module db
 * @description Sequelize database connection and initialization.
 *
 * Uses SQLite for zero-configuration, file-based persistence.
 * The database file is created automatically on first run.
 *
 * ## Usage
 *
 * ```typescript
 * import { db } from '@/db';
 * import { Provider } from '@/db/models';
 *
 * // Query all providers
 * const providers = await Provider.findAll();
 *
 * // Create a new provider
 * await Provider.create({
 *   name: 'my-ollama',
 *   type: 'ollama',
 *   baseUrl: 'http://localhost:11434',
 *   isDefault: true,
 * });
 * ```
 */

import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { config } from '@/config';
import path from 'node:path';
import fs from 'node:fs';

// ─── Connection ───────────────────────────────────────────────────────────────

/** Ensure the data directory exists */
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

/**
 * The Sequelize instance. Uses SQLite dialect with native driver.
 * - `logging: false` in production to suppress SQL query logs.
 */
export const db = new Sequelize({
  dialect: 'sqlite',
  storage: config.dbPath,
  logging: config.logLevel === 'debug' ? console.log : false,
  // SQLite-specific options
  dialectOptions: {
    // Enable WAL mode for better concurrent read performance
    // (handled via raw query after sync)
  },
});

// ─── Models ───────────────────────────────────────────────────────────────────

/**
 * @model Provider
 * @description Stores LLM provider configurations (Ollama, OpenAI-compatible, etc.)
 *
 * Each provider can be used as a backend for the MCP agent.
 * Only one provider should be marked as default at a time.
 */
export class Provider extends Model<InferAttributes<Provider>, InferCreationAttributes<Provider>> {
  /** Auto-incrementing primary key */
  declare id: CreationOptional<number>;
  /** Human-readable provider name (e.g., "local-ollama", "remote-gpt4") */
  declare name: string;
  /** Provider type: 'ollama' or 'openai' (OpenAI-compatible) */
  declare type: 'ollama' | 'openai';
  /** Base URL for the provider's API */
  declare baseUrl: string;
  /** API key (required for OpenAI-compatible, optional for Ollama) */
  declare apiKey: CreationOptional<string | null>;
  /** Default model to use with this provider */
  declare defaultModel: string;
  /** Whether this is the active default provider */
  declare isDefault: boolean;
  /** Extra JSON configuration (maxTokens, temperature, etc.) */
  declare settings: CreationOptional<string | null>;
  /** Timestamps */
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

/**
 * @model Conversation
 * @description Stores conversation threads between users and the MCP agent.
 */
export class Conversation extends Model<InferAttributes<Conversation>, InferCreationAttributes<Conversation>> {
  declare id: CreationOptional<number>;
  /** Unique conversation identifier */
  declare conversationId: string;
  /** Display title for the conversation */
  declare title: CreationOptional<string>;
  /** Provider ID used for this conversation */
  declare providerId: number;
  /** Model name used for this conversation */
  declare modelName: string;
  /** Conversation status */
  declare status: 'active' | 'archived' | 'deleted';
  /** Metadata JSON (token counts, etc.) */
  declare metadata: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  /** Eager-loaded messages (populated via `include`) */
  declare messages?: Message[];
}

/**
 * @model Message
 * @description Stores individual messages within a conversation.
 */
export class Message extends Model<InferAttributes<Message>, InferCreationAttributes<Message>> {
  declare id: CreationOptional<number>;
  /** Reference to the parent conversation */
  declare conversationId: number;
  /** Message role: system, user, assistant, or tool */
  declare role: 'system' | 'user' | 'assistant' | 'tool';
  /** The text content of the message */
  declare content: string;
  /** Name of the tool that generated this message (if role = 'tool') */
  declare toolName: CreationOptional<string | null>;
  /** Tool call ID for correlating requests/responses */
  declare toolCallId: CreationOptional<string | null>;
  /** Token count for this message */
  declare tokenCount: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
}

/**
 * @model ToolConfig
 * @description Stores MCP tool registrations and their configurations.
 */
export class ToolConfig extends Model<InferAttributes<ToolConfig>, InferCreationAttributes<ToolConfig>> {
  declare id: CreationOptional<number>;
  /** Unique tool name (matches MCP tool name) */
  declare name: string;
  /** Human-readable description */
  declare description: string;
  /** Whether this tool is currently enabled */
  declare enabled: boolean;
  /** JSON Schema for the tool's input parameters */
  declare inputSchema: string;
  /** Tool category for organizational purposes */
  declare category: CreationOptional<string | null>;
  /** Extra configuration JSON */
  declare settings: CreationOptional<string | null>;
  /** Timestamp when the server was created */
  declare createdAt: CreationOptional<Date>;
  /** Timestamp when the server was last updated */
  declare updatedAt: CreationOptional<Date>;
}

/**
 * @model CustomTool
 * @description Stores user-defined custom MCP tools with executable code.
 *
 * Custom tools allow users to define their own tool functions via the API.
 * The handler code is stored as JavaScript/TypeScript and executed safely.
 */
export class CustomTool extends Model<InferAttributes<CustomTool>, InferCreationAttributes<CustomTool>> {
  declare id: CreationOptional<number>;
  /** Unique tool name (used in MCP protocol) */
  declare name: string;
  /** Human-readable display name */
  declare displayName: string;
  /** Detailed description shown to users and LLM */
  declare description: string;
  /** JSON Schema for the tool's input parameters */
  declare inputSchema: string;
  /** The executable handler code (JavaScript function body) */
  declare handlerCode: string;
  /** Whether this tool is currently enabled */
  declare enabled: boolean;
  /** Tool category for organizational purposes */
  declare category: CreationOptional<string | null>;
  /** Icon/emoji for the tool UI */
  declare icon: CreationOptional<string | null>;
  /** Extra configuration JSON (API keys, endpoints, etc.) */
  declare settings: CreationOptional<string | null>;
  /** Last tested arguments for testing */
  declare lastTestArgs: CreationOptional<string | null>;
  /** Last test result for feedback */
  declare lastTestResult: CreationOptional<string | null>;
  /** Timestamp when the server was created */
  declare createdAt: CreationOptional<Date>;
  /** Timestamp when the server was last updated */
  declare updatedAt: CreationOptional<Date>;
}

/**
 * @model MCPServer
 * @description Stores external MCP server configurations and connection details.
 *
 * MCPServer allows the system to connect to and manage multiple external
 * Model Context Protocol (MCP) servers. Each server can provide its own
 * set of tools, resources, and prompts that can be used by the LLM.
 *
 * ## Server Types
 *
 * - `stdio`: Local process-based servers (most common for MCP)
 * - `sse`: Server-Sent Events over HTTP
 * - `streamable-http`: HTTP with streaming support
 *
 * ## Usage Example
 *
 * ```typescript
 * import { MCPServer } from '@/db';
 *
 * // Create a new MCP server
 * const server = await MCPServer.create({
 *   name: 'filesystem-server',
 *   displayName: 'File System Access',
 *   description: 'Provides read/write access to the local filesystem',
 *   type: 'stdio',
 *   command: 'npx',
 *   args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/dir'],
 *   enabled: true,
 *   timeout: 30000,
 *   settings: JSON.stringify({ readOnly: false }),
 * });
 * ```
 */
export class MCPServer extends Model<InferAttributes<MCPServer>, InferCreationAttributes<MCPServer>> {
  /** Auto-incrementing primary key */
  declare id: CreationOptional<number>;
  /** Unique server identifier/name (e.g., 'filesystem', 'postgres') */
  declare name: string;
  /** Human-readable display name for the UI */
  declare displayName: string;
  /** Detailed description of what the server provides */
  declare description: string;
  /** Connection type: stdio, sse, or streamable-http */
  declare type: 'stdio' | 'sse' | 'streamable-http';
  /** For stdio: The command to execute (e.g., 'npx', 'node', '/usr/bin/python3') */
  declare command: CreationOptional<string | null>;
  /** For stdio: JSON-encoded array of command arguments */
  declare args: CreationOptional<string | null>;
  /** For stdio: JSON-encoded environment variables object */
  declare env: CreationOptional<string | null>;
  /** For sse/streamable-http: The server URL endpoint */
  declare url: CreationOptional<string | null>;
  /** For sse/streamable-http: JSON-encoded HTTP headers object */
  declare headers: CreationOptional<string | null>;
  /** Whether this server is currently enabled and active */
  declare enabled: boolean;
  /** Current connection status: disconnected, connecting, connected, error */
  declare status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Last known error message (if status is 'error') */
  declare lastError: CreationOptional<string | null>;
  /** Connection timeout in milliseconds */
  declare timeout: CreationOptional<number>;
  /** Auto-reconnect after disconnection */
  declare autoReconnect: CreationOptional<boolean>;
  /** Maximum number of reconnection attempts (-1 for unlimited) */
  declare maxReconnectAttempts: CreationOptional<number>;
  /** Reconnection delay in milliseconds */
  declare reconnectDelay: CreationOptional<number>;
  /** JSON-encoded additional configuration settings */
  declare settings: CreationOptional<string | null>;
  /** Server version string (if provided by the server) */
  declare version: CreationOptional<string | null>;
  /** Timestamp when the server was last successfully connected */
  declare lastConnectedAt: CreationOptional<Date | null>;
  /** Timestamp when the server was last disconnected */
  declare lastDisconnectedAt: CreationOptional<Date | null>;
  /** Total number of successful connections */
  declare connectionCount: CreationOptional<number>;
  /** Total number of connection failures */
  declare failureCount: CreationOptional<number>;
  /** Timestamp when the server was created */
  declare createdAt: CreationOptional<Date>;
  /** Timestamp when the server was last updated */
  declare updatedAt: CreationOptional<Date>;
}

// ─── Model Initialization ─────────────────────────────────────────────────────

Provider.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ollama' },
    baseUrl: { type: DataTypes.STRING, allowNull: false },
    apiKey: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    defaultModel: { type: DataTypes.STRING, allowNull: false, defaultValue: 'llama3.1' },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    settings: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize: db, tableName: 'providers' },
);

Conversation.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.STRING, allowNull: false, unique: true },
    title: { type: DataTypes.STRING, allowNull: true },
    providerId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'providers', key: 'id' } },
    modelName: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'active' },
    metadata: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize: db, tableName: 'conversations' },
);

Message.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'conversations', key: 'id' } },
    role: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    toolName: { type: DataTypes.STRING, allowNull: true },
    toolCallId: { type: DataTypes.STRING, allowNull: true },
    tokenCount: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize: db, tableName: 'messages' },
);

ToolConfig.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING, allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    inputSchema: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: true },
    settings: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize: db, tableName: 'tool_configs' },
);

CustomTool.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    inputSchema: { type: DataTypes.TEXT, allowNull: false },
    handlerCode: { type: DataTypes.TEXT, allowNull: false },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    category: { type: DataTypes.STRING, allowNull: true, defaultValue: 'custom' },
    icon: { type: DataTypes.STRING, allowNull: true },
    settings: { type: DataTypes.TEXT, allowNull: true },
    lastTestArgs: { type: DataTypes.TEXT, allowNull: true },
    lastTestResult: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize: db, tableName: 'custom_tools' },
);

MCPServer.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    displayName: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'stdio' },
    command: { type: DataTypes.STRING, allowNull: true },
    args: { type: DataTypes.TEXT, allowNull: true },
    env: { type: DataTypes.TEXT, allowNull: true },
    url: { type: DataTypes.TEXT, allowNull: true },
    headers: { type: DataTypes.TEXT, allowNull: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'disconnected' },
    lastError: { type: DataTypes.TEXT, allowNull: true },
    timeout: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 30000 },
    autoReconnect: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
    maxReconnectAttempts: { type: DataTypes.INTEGER, allowNull: true, defaultValue: -1 },
    reconnectDelay: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 5000 },
    settings: { type: DataTypes.TEXT, allowNull: true },
    version: { type: DataTypes.STRING, allowNull: true },
    lastConnectedAt: { type: DataTypes.DATE, allowNull: true },
    lastDisconnectedAt: { type: DataTypes.DATE, allowNull: true },
    connectionCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    failureCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize: db, tableName: 'mcp_servers' },
);

// ─── Associations ─────────────────────────────────────────────────────────────

Provider.hasMany(Conversation, { foreignKey: 'providerId', as: 'conversations' });
Conversation.belongsTo(Provider, { foreignKey: 'providerId', as: 'provider' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Custom tools have no direct associations currently, but could be linked to users in future

// ─── Database Initialization ──────────────────────────────────────────────────

/**
 * Initializes the database: creates tables and seeds default data.
 * Should be called once at application startup.
 */
export async function initDatabase(): Promise<void> {
  // Create all tables
  await db.sync();

  // Enable WAL mode for better performance
  await db.query('PRAGMA journal_mode=WAL');

  // Seed default Ollama provider if none exists
  const providerCount = await Provider.count();
  if (providerCount === 0) {
    await Provider.create({
      name: 'local-ollama',
      type: 'ollama',
      baseUrl: config.ollamaBaseUrl,
      defaultModel: config.defaultModel,
      isDefault: true,
    });
    console.log('✅ Seeded default Ollama provider');
  }

  // Seed example custom tools if none exist
  const customToolCount = await CustomTool.count();
  if (customToolCount === 0) {
    const exampleTools = [
      {
        name: 'example_calculator',
        displayName: 'Example Calculator',
        description: 'A simple calculator that performs basic arithmetic operations.',
        inputSchema: JSON.stringify({
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' },
            operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'], description: 'Operation to perform' }
          },
          required: ['a', 'b', 'operation']
        }, null, 2),
        handlerCode: `const { a, b, operation } = args;
const results = {
  add: a + b,
  subtract: a - b,
  multiply: a * b,
  divide: b !== 0 ? a / b : "Error: Division by zero"
};
return {
  content: [{ type: 'text', text: \`\${operation}(\${a}, \${b}) = \${results[operation]}\` }]
};`,
        enabled: true,
        category: 'examples',
        icon: '🧮'
      }
    ];
    await CustomTool.bulkCreate(exampleTools);
    console.log('✅ Seeded example custom tools');
  }
}

export default db;
