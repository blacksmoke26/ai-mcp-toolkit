/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

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
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                         Fastify Server                               │
 * │                      (Port 3100 / Configurable)                      │
 * ├──────────────┬──────────────┬──────────────┬─────────────────────────┤
 * │  /mcp        │  /chat       │  /admin      │  /api                   │
 * │  (JSON-RPC)  │  (Agent API) │  (Mgmt UI)   │  (REST)                 │
 * ├──────────────┴──────────────┴──────────────┴─────────────────────────┤
 * │                      WebSocket Layer (Real-time)                     │
 * │                  (Events: mcp, chat, metrics, simulate)              │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                    MCP Protocol Layer                                │
 * │           (JSON-RPC 2.0 + Method Dispatch + SSE)                     │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │  Tool Registry  │  Resource Registry  │  Prompt Registry             │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                    LLM Provider Layer                                │
 * │        (Ollama | OpenAI-compatible | Custom / Dynamic)               │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                    Agent Loop & Orchestration                        │
 * │              (LLM ↔ Tool Execution ↔ Memory)                         │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                    Simulation & Mocking Layer                        │
 * │              (Scenarios, Tool Mocks, Batch Testing)                  │
 * ├──────────────────────────────────────────────────────────────────────┤
 * │                    Persistence Layer                                 │
 * │              (SQLite + Sequelize + Custom Tool Storage)              │
 * └──────────────────────────────────────────────────────────────────────┘
 * ```
 */

import {config, printConfig} from '@/config';
import {initDatabase, Provider} from '@/db';
import {createServer} from '@/server/fastify';
import {toolRegistry} from '@/mcp/tools/registry';
import {registerBuiltinTools} from '@/mcp/tools/builtin';
import {resourceRegistry} from '@/mcp/resources/registry';
import {promptRegistry} from '@/mcp/prompts/registry';
import {llmRegistry} from '@/llm/registry';
import {buildToolDefinitions} from '@/llm/agent';
import logger from '@/utils/logger';
import {simulator} from '@/simulation/simulator';
import {customToolExecutor} from '@/tools/custom-tool-executor';

// ─── Custom Tools ─────────────────────────────────────────────────────────────
import predefinedTools from '@/tools/index';
import promptTemplates from '@/constants/prompt-templates';
import {EVENT_REGISTRY} from '@/websocket';

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

  // Custom tools from source code
  predefinedTools.forEach(x => toolRegistry.register(x));

  // Load custom tools from database
  console.log('\n🔌 Loading custom tools from database...');
  await customToolExecutor.loadAllFromDatabase();

  const categories = toolRegistry.getByCategory();
  for (const [category, names] of Object.entries(categories)) {
    console.log(`   ✓ ${category}: ${names.join(', ')}`);
  }
  console.log(`   Total: ${toolRegistry.size} tools (${customToolExecutor.size} custom)`);

  // 3.5 Register simulation scenarios
  console.log('\n🧪 Registering simulation scenarios...');
  simulator.registerBuiltInScenarios();
  console.log(`   ✓ ${simulator.listScenariosName().length} scenarios registered`);

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

  promptTemplates.forEach(x => promptRegistry.register(x));

  console.log(`   ✓ ${promptRegistry.size} prompts registered`);

  // 7. Start server
  console.log('\n🌐 Starting Fastify server...');

  const server = await createServer();

  try {
    const address = await server.listen({port: config.port, host: config.host});
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
    console.log(`   GET  ${address}/mcp/health     → MCP Health Check`);
    console.log(`   POST ${address}/mcp/debug/echo → Debug Echo`);
    console.log(`   POST ${address}/chat           → Agent Chat`);
    console.log(`   POST ${address}/chat/stream    → Agent Chat (SSE)`);
    console.log(`   GET  ${address}/chat/conversations → List Chats`);
    console.log(`   GET  ${address}/chat/conversations/:id → Get Chat`);
    console.log(`   PATCH ${address}/chat/conversations/:id → Update Chat`);
    console.log(`   DELETE ${address}/chat/conversations/:id → Delete Chat`);
    console.log('   ────────┬───────┬───────────┬─────────');
    console.log('   Custom Tools API:');
    console.log(`   GET  ${address}/api/custom-tools      → List all custom tools`);
    console.log(`   POST ${address}/api/custom-tools      → Create custom tool`);
    console.log(`   GET  ${address}/api/custom-tools/:id  → Get tool details`);
    console.log(`   PUT  ${address}/api/custom-tools/:id  → Update tool`);
    console.log(`   DELETE ${address}/api/custom-tools/:id → Delete tool`);
    console.log(`   POST ${address}/api/custom-tools/validate → Validate tool code`);
    console.log(`   POST ${address}/api/custom-tools/batch → Batch enable/disable`);
    console.log(`   POST ${address}/api/custom-tools/:id/test → Test tool`);
    console.log(`   PATCH ${address}/api/custom-tools/:id/toggle → Enable/Disable tool`);
    console.log(`   GET  ${address}/api/custom-tools/templates → Get example templates`);
    console.log('   ────────┬───────┬───────────┬─────────');
    console.log('   Health & Monitoring:');
    console.log(`   GET  ${address}/health         → Health Check`);
    console.log(`   GET  ${address}/health/alive   → Liveness Check`);
    console.log(`   GET  ${address}/health/ready   → Readiness Check`);
    console.log(`   GET  ${address}/health/deep    → Deep Health Check`);
    console.log(`   GET  ${address}/info           → Server Info`);
    console.log(`   GET  ${address}/metrics        → Performance Metrics`);
    console.log(`   GET  ${address}/metrics/tools  → Tool Usage Metrics`);
    console.log(`   GET  ${address}/metrics/tokens → Token Usage Metrics`);
    console.log(`   GET  ${address}/metrics/providers → Provider Status`);
    console.log(`   GET  ${address}/metrics/errors → Error Logs`);
    console.log(`   GET  ${address}/metrics/system → System Metrics`);
    console.log(`   GET  ${address}/metrics/export → Export Metrics`);
    console.log(`   DELETE ${address}/metrics/clear → Clear Metrics`);
    console.log(`   GET  ${address}/metrics/live   → Real-time Metrics (SSE)`);
    console.log(`   GET  ${address}/metrics/compare → Compare Periods`);
    console.log(`   GET  ${address}/metrics/anomaly → Anomaly Detection`);
    console.log(`   GET  ${address}/metrics/score   → Health Score`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   Administration:');
    console.log(`   GET  ${address}/admin/providers → List Providers`);
    console.log(`   POST ${address}/admin/providers → Add Provider`);
    console.log(`   DELETE ${address}/admin/providers/:name → Remove Provider`);
    console.log(`   POST ${address}/admin/providers/:name/default → Set Default`);
    console.log(`   POST ${address}/admin/providers/:name/test → Test Provider`);
    console.log(`   GET  ${address}/admin/providers/:name/models → List Models`);
    console.log(`   GET  ${address}/admin/tools     → List Tools`);
    console.log(`   POST ${address}/admin/tools/batch → Batch Update Tools`);
    console.log(`   GET  ${address}/admin/tools/:name → Get Tool Details`);
    console.log(`   PATCH ${address}/admin/tools/:name → Enable/Disable Tool`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   MCP Servers Management:');
    console.log(`   GET  ${address}/api/mcp-servers → List Servers`);
    console.log(`   POST ${address}/api/mcp-servers → Create Server`);
    console.log(`   GET  ${address}/api/mcp-servers/:id → Get Server`);
    console.log(`   PUT  ${address}/api/mcp-servers/:id → Update Server`);
    console.log(`   DELETE ${address}/api/mcp-servers/:id → Delete Server`);
    console.log(`   POST ${address}/api/mcp-servers/:id/start → Start Server`);
    console.log(`   POST ${address}/api/mcp-servers/:id/stop → Stop Server`);
    console.log(`   POST ${address}/api/mcp-servers/:id/restart → Restart Server`);
    console.log(`   GET  ${address}/api/mcp-servers/:id/status → Server Status`);
    console.log(`   GET  ${address}/api/mcp-servers/:id/health → Server Health`);
    console.log(`   GET  ${address}/api/mcp-servers/templates → Server Templates`);
    console.log('   ──────────────────────────────────────────────');
    console.log('   Simulation & Testing:');
    console.log(`   GET  ${address}/simulate/scenarios   → List Scenarios`);
    console.log(`   GET  ${address}/simulate/scenarios/:name → Get Scenario`);
    console.log(`   POST ${address}/simulate/scenarios   → Create Scenario`);
    console.log(`   POST ${address}/simulate/scenarios/:name/run → Run Scenario`);
    console.log(`   GET  ${address}/simulate/mocks       → Mock Management`);
    console.log(`   POST ${address}/simulate/mocks       → Set Mock`);
    console.log(`   POST ${address}/simulate/mocks/batch → Batch Set Mocks`);
    console.log(`   DELETE ${address}/simulate/mocks/:tool → Delete Mock`);
    console.log(`   DELETE ${address}/simulate/mocks → Clear Mocks`);
    console.log(`   GET  ${address}/simulate/mocks/status → Mock Status`);
    console.log(`   POST ${address}/simulate/mocks/toggle → Toggle Mock Mode`);
    console.log(`   POST ${address}/simulate/load        → Load Simulation`);
    console.log(`   POST ${address}/simulate/tool        → Test Single Tool`);
    console.log(`   POST ${address}/simulate/batch       → Batch Execution`);
    console.log(`   GET  ${address}/simulate/status      → Simulation Status`);
    console.log('   ────────┬───────┬───────────┬─────────');
    console.log('   WebSocket Real-time:');
    console.log(`   WS   ${address.replace('http', 'ws')}/ws          → WebSocket Real-time Events`);
    console.log(`   ───────────────────────────────────────────`);
    console.log(`   Available Events: ${EVENT_REGISTRY?.length || 30} across 10 categories`);
    console.log(`   Rooms: general, mcp, chat, chat-stream, providers, simulate, metrics, admin`);
    console.log('─'.repeat(52));
    console.log('');
    logger.info({address}, 'MCP Server started');
  } catch (err) {
    logger.error({err}, 'Failed to start server');
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
