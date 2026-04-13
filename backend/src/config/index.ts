/**
 * @module config
 * @description Centralized configuration management for the MCP Server.
 * 
 * All settings can be overridden via environment variables.
 * Uses sensible defaults that work out-of-the-box with local Ollama installations.
 * 
 * ## Environment Variables
 * 
 * | Variable | Description | Default |
 * |----------|-------------|---------|
 * | `MCP_PORT` | Server listen port | `3100` |
 * | `MCP_HOST` | Server listen host | `0.0.0.0` |
 * | `MCP_LOG_LEVEL` | Pino log level | `info` |
 * | `MCP_DB_PATH` | SQLite database path | `./data/mcp.db` |
 * | `OLLAMA_BASE_URL` | Ollama API base URL | `http://localhost:11434` |
 * | `DEFAULT_MODEL` | Default LLM model name | `llama3.1` |
 * | `DEFAULT_PROVIDER` | Default LLM provider | `ollama` |
 * | `OPENAI_BASE_URL` | OpenAI-compatible API URL | `http://localhost:11434/v1` |
 * | `OPENAI_API_KEY` | OpenAI-compatible API key | (empty) |
 * | `MCP_MAX_TOKENS` | Max tokens for LLM responses | `4096` |
 * | `MCP_TEMPERATURE` | Default temperature for generation | `0.7` |
 * | `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `*` |
 */

import { z } from 'zod';

// ─── Schema Validation ────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  /** TCP port the Fastify server listens on */
  port: z.coerce.number().min(1).max(65535).default(3100),
  /** Host address to bind to */
  host: z.string().default('0.0.0.0'),
  /** Pino log level: trace, debug, info, warn, error, fatal */
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  /** Filesystem path to the SQLite database */
  dbPath: z.string().default('./data/mcp.db'),
  /** Base URL for the Ollama API */
  ollamaBaseUrl: z.string().url().default('http://localhost:11434'),
  /** Default LLM model to use */
  defaultModel: z.string().default('llama3.1'),
  /** Default LLM provider identifier */
  defaultProvider: z.enum(['ollama', 'openai']).default('ollama'),
  /** Base URL for OpenAI-compatible API endpoints */
  openaiBaseUrl: z.string().url().default('http://localhost:11434/v1'),
  /** API key for OpenAI-compatible endpoints */
  openaiApiKey: z.string().default(''),
  /** Maximum tokens to generate in LLM responses */
  maxTokens: z.coerce.number().min(1).max(131072).default(4096),
  /** Default sampling temperature (0.0 = deterministic, 1.0 = creative) */
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  /** Comma-separated list of allowed CORS origins, or '*' for all */
  corsOrigin: z.string().default('*'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// ─── Environment Loading ──────────────────────────────────────────────────────

function loadConfig(): AppConfig {
  const raw: Record<string, unknown> = {
    port: process.env.MCP_PORT,
    host: process.env.MCP_HOST,
    logLevel: process.env.MCP_LOG_LEVEL,
    dbPath: process.env.MCP_DB_PATH,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    defaultModel: process.env.DEFAULT_MODEL,
    defaultProvider: process.env.DEFAULT_PROVIDER,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
    maxTokens: process.env.MCP_MAX_TOKENS,
    temperature: process.env.MCP_TEMPERATURE,
    corsOrigin: process.env.CORS_ORIGIN,
  };

  const result = ConfigSchema.safeParse(raw);

  if (!result.success) {
    console.error('❌ Configuration validation failed:');
    for (const issue of result.error.issues) {
      console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const config = loadConfig();

/**
 * Pretty-prints the active configuration (secrets masked).
 * Useful for startup banners.
 */
export function printConfig(): void {
  const masked = {
    ...config,
    openaiApiKey: config.openaiApiKey ? '••••••••' : '(none)',
    dbPath: config.dbPath,
  };
  console.log('📋 MCP Server Configuration:');
  console.table(masked);
}

export default config;
