# MCP Server — Model Context Protocol

> A production-ready **Model Context Protocol (MCP)** server powered by local LLMs. Connect Ollama, OpenAI-compatible APIs, and custom toolings into a unified, well-documented, developer-friendly platform.

Built with **Fastify**, **SQLite** (Sequelize ORM), and **TypeScript**.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
  - [Health & Info](#health--info)
  - [MCP Protocol (JSON-RPC 2.0)](#mcp-protocol-json-rpc-20)
  - [Chat API (Agent Loop)](#chat-api-agent-loop)
  - [Admin API](#admin-api)
- [Creating Custom Tools](#creating-custom-tools)
- [Adding LLM Providers](#adding-llm-providers)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [License](#license)

---

## Overview

The **MCP Server** implements the [Model Context Protocol](https://modelcontextprotocol.io/) — an open standard for connecting AI models to external tools, resources, and prompts. It serves two purposes:

1. **MCP Server** — Exposes tools and resources to any MCP-compatible client via JSON-RPC 2.0 over HTTP/SSE.
2. **LLM Agent** — Connects local LLMs (Ollama) or cloud LLMs (OpenAI-compatible) to your registered tools, creating an autonomous agent that can use tools to fulfill user requests.

### Key Features

| Feature | Description |
|---------|-------------|
| **MCP Protocol** | Full JSON-RPC 2.0 implementation of MCP spec (2024-11-05) |
| **Multi-Provider LLM** | Ollama, OpenAI, vLLM, LiteLLM, Together AI, and any OpenAI-compatible API |
| **Autonomous Agent** | LLM ↔ Tool orchestration loop with configurable iteration limits |
| **Tool Registry** | Register, enable/disable, and categorize custom tools at runtime |
| **SSE Streaming** | Real-time streaming for both MCP protocol and chat responses |
| **SQLite Persistence** | Zero-config database for providers, conversations, and tool configs |
| **REST Admin API** | Full CRUD for providers and tools at runtime |
| **Type-Safe** | Strict TypeScript throughout with comprehensive JSDoc documentation |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Fastify Server                        │
│                     (Port 3100)                          │
├──────────────┬──────────────┬───────────────────────────┤
│  /mcp        │  /chat       │  /admin                   │
│  (MCP JSON-  │  (Agent      │  (Provider &              │
│   RPC 2.0)   │   Chat API)  │   Tool Management)        │
├──────────────┴──────────────┴───────────────────────────┤
│                 MCP Protocol Layer                       │
│       (JSON-RPC 2.0 + Method Dispatch)                  │
├─────────────────────────────────────────────────────────┤
│  Tool Registry  │  Resource Registry  │  Prompt Registry │
├─────────────────────────────────────────────────────────┤
│                 LLM Provider Layer                       │
│        (Ollama │ OpenAI-compatible │ Custom)            │
├─────────────────────────────────────────────────────────┤
│                  Agent Loop                              │
│        (LLM ↔ Tool orchestration)                       │
├─────────────────────────────────────────────────────────┤
│               SQLite + Sequelize                        │
└─────────────────────────────────────────────────────────┘
```

### Agent Loop Flow

```
User Message → LLM → [Tool Call?] → MCP Tool → Result → LLM → ... → Final Answer
                                ↓ (no tool call)
                            Response
```

The agent loop runs automatically when you use the `/chat` endpoint. The LLM decides which tools to call, the server executes them, feeds results back, and repeats until the LLM provides a final answer.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.0+ (runtime)
- [Ollama](https://ollama.ai) (optional, for local LLMs)

### Install & Run

```bash
# Navigate to the project
cd mcp-server

# Install dependencies
bun install

# Start the server (development mode with auto-reload)
bun run dev

# Or start in production
bun run start
```

### Verify It Works

```bash
# Health check
curl http://localhost:3100/health

# List available MCP tools
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call the echo tool
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello MCP!"}}}'

# Chat with the agent (requires a running LLM provider)
curl -X POST http://localhost:3100/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What time is it? Use the get_current_time tool."}'
```

---

## Configuration

All configuration is managed via environment variables with sensible defaults:

| Variable | Description | Default |
|----------|-------------|---------|
| `MCP_PORT` | Server listen port | `3100` |
| `MCP_HOST` | Server listen host | `0.0.0.0` |
| `MCP_LOG_LEVEL` | Log level (`trace`, `debug`, `info`, `warn`, `error`) | `info` |
| `MCP_DB_PATH` | SQLite database file path | `./data/mcp.db` |
| `OLLAMA_BASE_URL` | Ollama API base URL | `http://localhost:11434` |
| `DEFAULT_MODEL` | Default LLM model | `llama3.1` |
| `DEFAULT_PROVIDER` | Default LLM provider type | `ollama` |
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL | `http://localhost:11434/v1` |
| `OPENAI_API_KEY` | OpenAI-compatible API key | _(empty)_ |
| `MCP_MAX_TOKENS` | Max tokens for LLM responses | `4096` |
| `MCP_TEMPERATURE` | Default generation temperature | `0.7` |
| `CORS_ORIGIN` | Allowed CORS origins (`*` for all) | `*` |

Configuration is validated at startup using Zod schemas. Invalid values prevent server startup with clear error messages.

---

## API Reference

### Health & Info

#### `GET /health`
Basic liveness check.

```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z", "uptime": 123.456 }
```

#### `GET /health/ready`
Readiness probe — checks database connectivity and all LLM providers. Returns `200` if healthy, `503` if degraded.

```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok", "latencyMs": 5 },
    "provider:ollama": { "status": "ok", "latencyMs": 12 }
  }
}
```

#### `GET /info`
Server metadata, capabilities, and available tools/providers.

---

### MCP Protocol (JSON-RPC 2.0)

#### `POST /mcp`
Send MCP protocol requests. Supports single requests and batches.

**Initialize:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": { "name": "my-client", "version": "1.0.0" }
    }
  }'
```

**List Tools:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

**Call a Tool:**
```bash
curl -X POST http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "calculator",
      "arguments": { "expression": "2 + 3 * 4" }
    }
  }'
```

**Supported MCP Methods:**

| Method | Description |
|--------|-------------|
| `initialize` | Initialize the MCP connection |
| `ping` | Keep-alive check |
| `tools/list` | List available tools |
| `tools/call` | Execute a tool |
| `resources/list` | List available resources |
| `resources/read` | Read a resource by URI |
| `prompts/list` | List available prompt templates |
| `prompts/get` | Render a prompt with arguments |

#### `GET /mcp/sse`
Server-Sent Events endpoint for real-time MCP notifications.

---

### Chat API (Agent Loop)

#### `POST /chat`
Send a message and get the agent's complete response. The agent automatically uses registered tools.

**Request:**
```json
{
  "message": "What time is it in Tokyo?",
  "conversationId": "optional-existing-id",
  "provider": "ollama",
  "model": "llama3.1",
  "temperature": 0.7,
  "maxTokens": 4096,
  "maxIterations": 10
}
```

**Response:**
```json
{
  "conversationId": "V1StGXR8_Z5jdHi6B-myT",
  "content": "The current time in Tokyo is 3:42 PM JST.",
  "iterations": 2,
  "toolCalls": [{ "name": "get_current_time", "arguments": {"timezone": "Asia/Tokyo"}, "result": "..." }],
  "tokens": { "prompt": 150, "completion": 45, "total": 195 },
  "elapsedMs": 2340
}
```

#### `POST /chat/stream`
Same as `POST /chat` but streams results via Server-Sent Events.

SSE events emitted:
- `tool_call` — When a tool is invoked (with name and success status)
- `result` — Final agent response
- `done` — Stream complete
- `error` — If the agent loop fails

#### `GET /chat/conversations`
List all active conversations.

#### `GET /chat/conversations/:id`
Get a full conversation with all messages.

#### `DELETE /chat/conversations/:id`
Soft-delete a conversation.

---

### Admin API

#### Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/providers` | List all providers (active + DB-configured) |
| `POST` | `/admin/providers` | Register a new provider |
| `DELETE` | `/admin/providers/:name` | Remove a provider |
| `POST` | `/admin/providers/:name/default` | Set as default |
| `GET` | `/admin/providers/:name/models` | List available models |

**Register a new provider:**
```bash
curl -X POST http://localhost:3100/admin/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpt4",
    "type": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "defaultModel": "gpt-4",
    "temperature": 0.5
  }'
```

**Use Ollama's OpenAI-compatible endpoint:**
```bash
curl -X POST http://localhost:3100/admin/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ollama-openai",
    "type": "openai",
    "baseUrl": "http://localhost:11434/v1",
    "defaultModel": "llama3.1"
  }'
```

#### Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/tools` | List all registered tools |
| `GET` | `/admin/tools/:name` | Get tool details + input schema |
| `PATCH` | `/admin/tools/:name` | Enable/disable a tool |

**Disable a tool:**
```bash
curl -X PATCH http://localhost:3100/admin/tools/echo \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

## Creating Custom Tools

Creating a new MCP tool is straightforward. Define a tool object and register it:

### Minimal Example

```typescript
// tools/my-tool.ts
import type { CallToolResult } from '@/mcp/types';

export const myTool = {
  name: 'my_tool',
  description: 'Does something useful with a query parameter.',
  category: 'custom',

  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
      limit: { type: 'number', description: 'Max results to return' },
    },
    required: ['query'] as string[],
  },

  handler: async (args: Record<string, unknown>): Promise<CallToolResult> => {
    const query = String(args.query);
    const limit = Number(args.limit) || 10;

    // Your tool logic here...
    const results = await someApi.search(query, limit);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  },
};
```

### Register It

Add the registration in `src/index.ts` (inside the `bootstrap()` function):

```typescript
import { myTool } from '../../tools/my-tool';
toolRegistry.register(myTool);
```

### Tool Response Format

Tools must return a `CallToolResult`:

```typescript
interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;  // Set to true if the tool encountered an error
}
```

### Built-in Tools

| Tool | Description |
|------|-------------|
| `echo` | Echoes input back (testing) |
| `get_current_time` | Returns current time in any timezone |
| `calculator` | Safe math expression evaluation |
| `json_query` | Parse and query JSON data |
| `get_weather` | Simulated weather data (example) |
| `word_count` | Text analysis (words, chars, reading time) |
| `text_transform` | Case transformations (camelCase, snake_case, etc.) |

---

## Adding LLM Providers

The server ships with two provider implementations:

### Ollama (Built-in)

Connects to any Ollama instance. Works out of the box with default configuration.

```bash
# Set a different Ollama URL
OLLAMA_BASE_URL=http://my-server:11434 bun run dev
```

### OpenAI-Compatible (Built-in)

Works with any API that implements the OpenAI chat completions format:

- **OpenAI** — `https://api.openai.com/v1`
- **Azure OpenAI** — `https://<resource>.openai.azure.com/openai/deployments/<model>`
- **vLLM** — `http://localhost:8000/v1`
- **LiteLLM** — `http://localhost:4000/v1`
- **Together AI** — `https://api.together.xyz/v1`
- **Anyscale** — `https://api.endpoints.anyscale.com/v1`
- **Ollama (OpenAI mode)** — `http://localhost:11434/v1`

### Creating a Custom Provider

```typescript
// src/llm/my-provider.ts
import type { LLMProvider, LLMProviderConfig, LLMModelInfo, StreamChunk, LLMGenerationParams } from './types';
import type { ChatMessage, LLMCompletionResponse } from '@/mcp/types';

export class MyProvider implements LLMProvider {
  readonly name = 'my-provider';
  config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  async chat(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): Promise<LLMCompletionResponse> {
    // Call your LLM API here
    return { content: '...', model: '...', finish_reason: 'stop' };
  }

  async *streamChat(messages: ChatMessage[], options?: Partial<LLMGenerationParams>): AsyncGenerator<StreamChunk> {
    // Yield streaming chunks
    yield { type: 'content', delta: 'Hello' };
    yield { type: 'done' };
  }

  async listModels(): Promise<LLMModelInfo[]> {
    return [{ id: 'model-1' }];
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
```

Register it in `src/llm/registry.ts` and add the factory case in `createFromConfig()`.

---

## Project Structure

```
mcp-server/
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
├── data/                           # SQLite database (auto-created)
│   └── mcp.db
├── src/
│   ├── index.ts                    # Entry point — bootstrap sequence
│   ├── config/
│   │   └── index.ts                # Zod-validated configuration
│   ├── db/
│   │   └── index.ts                # Sequelize + SQLite models
│   ├── mcp/
│   │   ├── types.ts                # Complete MCP & JSON-RPC 2.0 types
│   │   ├── protocol.ts             # JSON-RPC method dispatch
│   │   ├── tools/
│   │   │   ├── registry.ts         # Tool registration & lookup
│   │   │   └── builtin.ts          # Built-in tools (echo, calc, etc.)
│   │   ├── resources/
│   │   │   └── registry.ts         # Resource registration & reading
│   │   └── prompts/
│   │       └── registry.ts         # Prompt template registry
│   ├── llm/
│   │   ├── types.ts                # LLM provider interface
│   │   ├── ollama.ts               # Ollama provider implementation
│   │   ├── openai.ts               # OpenAI-compatible provider
│   │   ├── registry.ts             # Multi-provider management
│   │   └── agent.ts                # Autonomous LLM ↔ Tool loop
│   ├── server/
│   │   ├── fastify.ts              # Fastify server setup
│   │   └── routes/
│   │       ├── health.ts           # Health & info endpoints
│   │       ├── mcp.ts              # MCP JSON-RPC endpoint
│   │       ├── chat.ts             # Chat API (agent loop)
│   │       └── admin.ts            # Provider & tool management
│   └── utils/
│       └── logger.ts               # Pino structured logger
├── tools/                          # Custom tool examples
│   ├── weather.ts                  # Weather data tool
│   └── text-analysis.ts            # Word count & text transform
└── README.md                       # This file
```

---

## Environment Variables

See the [Configuration](#configuration) section above for the complete list.

### Example `.env` File

```bash
# Server
MCP_PORT=3100
MCP_HOST=0.0.0.0
MCP_LOG_LEVEL=info

# Database
MCP_DB_PATH=./data/mcp.db

# Ollama (default provider)
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=llama3.1

# OpenAI (optional secondary provider)
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-key-here

# Generation defaults
MCP_MAX_TOKENS=4096
MCP_TEMPERATURE=0.7

# CORS
CORS_ORIGIN=*
```

---

## Development

### Available Scripts

```bash
bun run dev      # Start with auto-reload (bun --watch)
bun run start    # Start production server
bun run lint     # TypeScript type checking (tsc --noEmit)
```

### Adding a New MCP Method

```typescript
import { protocolHandler } from '@/mcp/protocol';

protocolHandler.registerMethod('my/custom-method', async (params) => {
  // Validate and process
  return { myResult: 'data' };
});
```

### Adding a New REST Route

Create a new route file in `src/server/routes/` and register it in `src/server/fastify.ts`:

```typescript
// src/server/routes/my-route.ts
import type { FastifyPluginAsync } from 'fastify';

export const myRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/my-endpoint', async (request, reply) => {
    return { hello: 'world' };
  });
};
```

```typescript
// src/server/fastify.ts
import { myRoutes } from './routes/my-route';
await server.register(myRoutes);
```

---

## License

MIT
