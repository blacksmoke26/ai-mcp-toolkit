/**
 * @module index
 * @description Main entry point for the MCP Server.
 *
 * This file orchestrates the entire server startup:
 *
 * 1. Loads and validates configuration
 * 2. Initializes the SQLite database
 * 3. Registers built-in and custom MCP tools
 * 4. Registers LLM providers (Ollama and/or OpenAI-compatible)
 * 5. Registers MCP resources and prompts
 * 6. Registers simulation scenarios
 * 7. Starts the Fastify HTTP server
 *
 * ## Quick Start
 *
 * ```bash
 * # Development (with auto-reload)
 * bun run dev
 *
 * # Production
 * bun run start
 *
 * # With custom configuration
 * MCP_PORT=4000 OLLAMA_BASE_URL=http://my-ollama:11434 bun run start
 * ```
 *
 * ## Architecture Overview
 *
 * ```
 * ┌─────────────────────────────────────────────────┐
 * │                  Fastify Server                  │
 * │                  (Port 3100)                     │
 * ├─────────────┬──────────────┬────────────────────┤
 * │  /mcp       │  /chat       │  /admin            │
 * │  (MCP JSON- │  (Agent      │  (Provider &       │
 * │   RPC 2.0)  │   Chat API)  │   Tool Management) │
 * ├─────────────┴──────────────┴────────────────────┤
 * │              MCP Protocol Layer                  │
 * │     (JSON-RPC 2.0 + Method Dispatch)            │
 * ├─────────────────────────────────────────────────┤
 * │  Tool Registry  │  Resource Registry  │ Prompts  │
 * ├─────────────────────────────────────────────────┤
 * │              LLM Provider Layer                  │
 * │     (Ollama | OpenAI-compatible | ...)          │
 * ├─────────────────────────────────────────────────┤
 * │              Agent Loop                         │
 * │     (LLM ↔ Tool orchestration)                 │
 * ├─────────────────────────────────────────────────┤
 * │              SQLite + Sequelize                  │
 * └─────────────────────────────────────────────────┘
 * ```
 */

import { config, printConfig } from '@/config/index.js';
import { initDatabase, Provider } from '@/db/index.js';
import { createServer } from '@/server/fastify.js';
import { toolRegistry } from '@/mcp/tools/registry.js';
import { registerBuiltinTools } from '@/mcp/tools/builtin.js';
import { resourceRegistry } from '@/mcp/resources/registry.js';
import { promptRegistry } from '@/mcp/prompts/registry.js';
import { llmRegistry } from '@/llm/registry.js';
import { buildToolDefinitions } from '@/llm/agent.js';
import { logger } from '@/utils/logger.js';
import { simulator } from '@/simulation/simulator.js';
import { metricsCollector } from '@/metrics/collector.js';

// ─── Custom Tools ─────────────────────────────────────────────────────────────

import { weatherTool } from '@/tools/weather.js';
import { wordCountTool, textTransformTool } from '@/tools/text-analysis.js';

// ─── Startup ─────────────────────────────────────────────────────────────────

async function bootstrap() {
  console.log('');
  console.log('🚀 MCP Server — Model Context Protocol');
  console.log('   Powered by Ollama & OpenAI-compatible LLMs');
  console.log('─'.repeat(52));

  // 1. Print configuration
  printConfig();

  // 2. Initialize database
  console.log('\n📦 Initializing database...');
  await initDatabase();
  console.log(`   ✓ Database: ${config.dbPath}`);

  // 3. Register MCP tools
  console.log('\n🔧 Registering MCP tools...');

  // Built-in tools (echo, get_current_time, calculator, json_query)
  registerBuiltinTools();

  // Custom tools
  toolRegistry.register(weatherTool);
  toolRegistry.register(wordCountTool);
  toolRegistry.register(textTransformTool);

  const categories = toolRegistry.getByCategory();
  for (const [category, names] of Object.entries(categories)) {
    console.log(`   ✓ ${category}: ${names.join(', ')}`);
  }
  console.log(`   Total: ${toolRegistry.size} tools`);

  // 3.5 Register simulation scenarios
  console.log('\n🧪 Registering simulation scenarios...');
  simulator.registerBuiltInScenarios();
  console.log(`   ✓ ${simulator.listScenarios().length} scenarios registered`);

  // 4. Register LLM providers
  console.log('\n🤖 Configuring LLM providers...');

  // Load providers from database
  const dbProviders = await Provider.findAll();

  for (const p of dbProviders) {
    try {
      llmRegistry.createFromConfig(
        {
          type: p.type as 'ollama' | 'openai',
          baseUrl: p.baseUrl,
          apiKey: p.apiKey || undefined,
          defaultModel: p.defaultModel,
          defaultParams: p.settings ? JSON.parse(p.settings) : undefined,
        },
        p.isDefault,
      );
      console.log(`   ✓ ${p.name} (${p.type}) → ${p.baseUrl} [${p.defaultModel}]${p.isDefault ? ' (default)' : ''}`);
    } catch (err) {
      console.error(`   ✗ Failed to load provider "${p.name}": ${err instanceof Error ? err.message : err}`);
    }
  }

  // Ensure at least one provider is registered
  if (llmRegistry.size === 0) {
    console.log('   ! No providers in database, registering from environment config...');
    llmRegistry.createFromConfig(
      {
        type: config.defaultProvider,
        baseUrl: config.defaultProvider === 'ollama' ? config.ollamaBaseUrl : config.openaiBaseUrl,
        apiKey: config.openaiApiKey || undefined,
        defaultModel: config.defaultModel,
        defaultParams: {
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        },
      },
      true,
    );
  }

  console.log(`   Active: ${llmRegistry.listProviders().join(', ')}`);
  console.log(`   Default: ${llmRegistry.defaultProviderName}`);

  // 5. Register example resources
  console.log('\n📚 Registering MCP resources...');

  resourceRegistry.register({
    uri: 'mcp://server/info',
    name: 'Server Information',
    description: 'MCP server metadata and capabilities',
    mimeType: 'application/json',
    handler: async () => [{
      uri: 'mcp://server/info',
      mimeType: 'application/json',
      text: JSON.stringify({
        name: '@mcp/server',
        version: '1.0.0',
        protocol: 'MCP 2024-11-05',
        tools: buildToolDefinitions().length,
        providers: llmRegistry.listProviders(),
      }, null, 2),
    }],
  });

  console.log(`   ✓ ${resourceRegistry.size} resources registered`);

  // 6. Register example prompts
  console.log('\n💬 Registering MCP prompts...');

  promptRegistry.register({
    name: 'code_review',
    description: 'Generate a code review prompt with context about the code to review',
    arguments: [
      { name: 'language', description: 'Programming language', required: true },
      { name: 'code', description: 'The code to review', required: true },
      { name: 'focus', description: 'Areas to focus on (e.g., "security", "performance", "readability")' },
    ],
    handler: async (args) => ({
      description: 'Code review assistant prompt',
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `You are an expert code reviewer specializing in ${args.language}.`,
            '',
            `Please review the following ${args.language} code${args.focus ? `, focusing on ${args.focus}` : ''}:`,
            '',
            '```' + args.language,
            args.code,
            '```',
            '',
            'Provide a structured review with:',
            '1. Summary of what the code does',
            '2. Issues found (with severity levels)',
            '3. Suggestions for improvement',
            '4. Security concerns (if any)',
          ].join('\n'),
        },
      }],
    }),
  });

  promptRegistry.register({
    name: 'explain_concept',
    description: 'Generate a prompt for explaining a technical concept',
    arguments: [
      { name: 'concept', description: 'The concept to explain', required: true },
      { name: 'audience', description: 'Target audience level (beginner, intermediate, expert)' },
      { name: 'context', description: 'Additional context or domain' },
    ],
    handler: async (args) => ({
      description: 'Concept explanation prompt',
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: [
            `Please explain the concept of "${args.concept}"`,
            args.audience ? `for a ${args.audience} audience` : 'in a clear and comprehensive way',
            args.context ? `in the context of ${args.context}` : '',
            '.',
            '',
            'Include:',
            '1. A simple definition',
            '2. How it works (with analogies if helpful)',
            '3. Practical examples',
            '4. Common misconceptions',
          ].join(' '),
        },
      }],
    }),
  });

  console.log(`   ✓ ${promptRegistry.size} prompts registered`);

  // 7. Start server
  console.log('\n🌐 Starting Fastify server...');

  const server = await createServer();

  try {
    const address = await server.listen({ port: config.port, host: config.host });
    console.log('');
    console.log('─'.repeat(52));
    console.log('✅ MCP Server is running!');
    console.log(`   Address:  ${address}`);
    console.log('');
    console.log('📡 Available Endpoints:');
    console.log('   ──────────────────────────────────────────────');
    console.log('   MCP & Chat:');
    console.log(`   POST ${address}/mcp            → MCP JSON-RPC`);
    console.log(`   GET  ${address}/mcp/sse        → MCP SSE Stream`);
    console.log(`   POST ${address}/chat           → Agent Chat`);
    console.log(`   POST ${address}/chat/stream    → Agent Chat (SSE)`);
    console.log(`   GET  ${address}/chat/conversations → List Chats`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   Health & Monitoring:');
    console.log(`   GET  ${address}/health         → Health Check`);
    console.log(`   GET  ${address}/health/ready   → Readiness Check`);
    console.log(`   GET  ${address}/info           → Server Info`);
    console.log(`   GET  ${address}/metrics        → Performance Metrics`);
    console.log(`   GET  ${address}/metrics/live   → Real-time Metrics (SSE)`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   Administration:');
    console.log(`   GET  ${address}/admin/providers → Manage Providers`);
    console.log(`   GET  ${address}/admin/tools     → Manage Tools`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   Simulation & Testing:');
    console.log(`   GET  ${address}/simulate/scenarios   → List Scenarios`);
    console.log(`   POST ${address}/simulate/scenarios/:name/run → Run Scenario`);
    console.log(`   GET  ${address}/simulate/mocks       → Mock Management`);
    console.log(`   POST ${address}/simulate/load        → Load Simulation`);
    console.log(`   POST ${address}/simulate/tool        → Test Single Tool`);
    console.log('─'.repeat(52));
    console.log('');
    logger.info({ address }, 'MCP Server started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    console.error(`\n❌ Failed to start server: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n ${signal} received, shutting down gracefully...`);
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Run
bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
