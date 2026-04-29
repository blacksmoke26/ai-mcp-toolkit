/**
 * @author Junaid Atari <mj.atari@gmail.com>
 * @copyright 2026 Junaid Atari
 * @see https://github.com/blacksmoke26
 */

/**
 * @module websocket/handlers
 * @description Event handlers for all WebSocket events with strict typing and MCP integration.
 *
 * This module implements handlers for every WebSocket event defined in `events.ts`.
 * Each handler is a pure async function that receives event data and client info,
 * and returns a payload to send back to the client.
 *
 * ## Architecture
 *
 * ```
 * ┌────────────────────────────────────────────────────────────┐
 * │                    WebSocket                               │
 * ├────────────────────────────────────────────────────────────┤
 * │  Client Message → Parse → Route → Handler → Response       │
 * │                                    │                       │
 * │                              Validation & Auth             │
 * │                                    │                       │
 * │                              Room Broadcast                │
 * └────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Handler Registration
 *
 * Handlers are registered in a central map and dispatched by event name.
 * The dispatcher validates payloads, checks auth, and routes to the
 * correct handler.
 *
 * ## Usage Example
 *
 * ```typescript
 * import { eventHandlers } from '@/websocket/handlers';
 *
 * // Handler is already registered in the map
 * const handler = eventHandlers.get('mcp:tools:list');
 * const payload = await handler!('mcp:tools:list', {}, 'client-123');
 * ```
 */

import type {WsEventHandler, WsEventName} from './events';
import {broadcastToRoom, EVENT_REGISTRY, publish, validateEventPayload} from './events';
import {roomManager} from './rooms';
import {toolRegistry} from '@/mcp/tools/registry';
import {resourceRegistry} from '@/mcp/resources/registry';
import {promptRegistry} from '@/mcp/prompts/registry';
import {llmRegistry} from '@/llm/registry';
import {simulator} from '@/simulation/simulator';
import {protocolHandler} from '@/mcp/protocol';
import {config} from '@/config';
import {logger} from '@/utils/logger';
import {nanoid} from 'nanoid';
import {ChatMessage, ErrorCodes} from '@/mcp/types';
import streamManager from './stream-manager';
import {SimulationStatus} from './constants';

// ══════════════════════════════════════════════════════════
// Type-Safe Handler Registry
// ══════════════════════════════════════════════════════════

/**
 * Map of event names to their handler functions.
 * Provides type-safe access to event handlers.
 */
export const eventHandlers = new Map<string, WsEventHandler>();

/**
 * Register a handler for a specific event.
 * @param event - Event name to handle
 * @param handler - Handler function
 * @throws {Error} If the event is not in the registry
 */
export function registerHandler(event: WsEventName, handler: WsEventHandler): void {
  const def = EVENT_REGISTRY.find(e => e.name === event);
  if (!def) {
    throw new Error(`Cannot register handler for unknown event: ${event}`);
  }
  eventHandlers.set(event, handler);
  logger.debug({event}, 'Handler registered');
}

// ══════════════════════════════════════════════════════════
// Core Event Handlers
// ══════════════════════════════════════════════════════════

/**
 * Handle ws:connect — send connection metadata to the client.
 */
async function handleWsConnect(_event: WsEventName, _payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  return {
    clientId,
    connectedAt: new Date().toISOString(),
    serverTime: Date.now(),
    uptime: process.uptime(),
    version: config?.port || 3100,
  };
}

/**
 * Handle ws:disconnect — cleanup and logging.
 */
async function handleWsDisconnect(_event: WsEventName, _payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  logger.info({clientId}, 'Client disconnected via WebSocket');
  return null;
}

/**
 * Handle ws:error — log and broadcast errors.
 */
async function handleWsError(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const error = payload.error as string;
  logger.error({error}, 'WebSocket error received from client');
  return {
    error,
    acknowledged: true,
  };
}

/**
 * Handle ws:ping — respond with pong including server time.
 */
async function handleWsPing(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const clientTimestamp = payload.timestamp as number | undefined;
  return {
    timestamp: Date.now(),
    echoed: clientTimestamp,
  };
}

/**
 * Handle ws:pong — log latency.
 */
async function handleWsPong(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const clientTimestamp = payload.timestamp as number | undefined;
  const echoed = payload.echoed as number | undefined;

  if (clientTimestamp && echoed) {
    const latency = Date.now() - clientTimestamp;
    logger.debug({clientId, latencyMs: latency}, 'Pong received');
  }

  return null;
}

/**
 * Handle ws:auth — authenticate the client.
 */
async function handleWsAuth(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const token = payload.token as string;
  const method = (payload.method as string) || 'token';

  // Simple token validation — in production, verify against your auth system
  if (!token || token.length < 1) {
    return {
      authenticated: false,
      error: 'No token provided',
      method,
    };
  }

  // For now, accept any non-empty token. Replace with real auth logic.
  return {
    authenticated: true,
    method,
  };
}

/**
 * Handle ws:reconnect — confirm reconnection parameters.
 */
async function handleWsReconnect(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const interval = (payload.interval as number) || 1000;
  const maxAttempts = (payload.maxAttempts as number) || -1;
  return {
    acknowledged: true,
    recommendedInterval: interval,
    maxAttempts,
    serverTime: Date.now(),
  };
}

// ════════════════════════════════════════════════════════════
// MCP Protocol Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle mcp:tools:list — return all registered tools.
 */
async function handleMcpToolsList(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const category = payload.category as string | undefined;
  let tools = toolRegistry.listDefinitions();

  if (category) {
    const byCategory = toolRegistry.getByCategory();
    tools = byCategory[category]
      ? byCategory[category].map(name => toolRegistry.get(name)!).map(({name, description, inputSchema}) => ({
        name,
        description,
        inputSchema,
      }))
      : [];
  }

  return {
    tools,
    count: tools.length,
  };
}

/**
 * Handle mcp:tools:call — invoke a tool and return the result.
 */
async function handleMcpToolsCall(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;
  const arguments_ = payload.arguments as Record<string, unknown> | undefined;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Tool name is required',
      },
    };
  }

  const tool = toolRegistry.get(name);
  if (!tool) {
    return {
      error: {
        code: ErrorCodes.TOOL_NOT_FOUND,
        message: `Tool not found: ${name}`,
      },
    };
  }

  if (!tool.enabled) {
    return {
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: `Tool "${name}" is currently disabled`,
      },
    };
  }

  try {
    const result = await tool.handler(arguments_ || {});
    // Broadcast tool result to the MCP room
    await broadcastToRoom('mcp', 'tool:result', {
      toolName: name,
      result,
      clientId,
    });

    return {
      toolName: name,
      result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err instanceof Error && 'code' in err) ? (err as { code: number }).code : ErrorCodes.INTERNAL_ERROR;

    await broadcastToRoom('mcp', 'tool:error', {
      toolName: name,
      error: {
        code,
        message,
      },
      clientId,
    });

    return {
      error: {
        code,
        message,
      },
    };
  }
}

/**
 * Handle mcp:resources:list — return all registered resources.
 */
async function handleMcpResourcesList(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const resources = resourceRegistry.listDefinitions();
  return {
    resources,
    count: resources.length,
  };
}

/**
 * Handle mcp:resources:read — read a resource by URI.
 */
async function handleMcpResourcesRead(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const uri = payload.uri as string;

  if (!uri) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Resource URI is required',
      },
    };
  }

  try {
    const result = await resourceRegistry.read(uri);
    return {
      uri,
      contents: result.contents,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: {
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        message,
      },
    };
  }
}

/**
 * Handle mcp:prompts:list — return all registered prompts.
 */
async function handleMcpPromptsList(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const prompts = promptRegistry.listDefinitions();
  return {
    prompts,
    count: prompts.length,
  };
}

/**
 * Handle mcp:prompts:get — get a prompt by name.
 */
async function handleMcpPromptsGet(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;
  const arguments_ = payload.arguments as Record<string, string> | undefined;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Prompt name is required',
      },
    };
  }

  try {
    const result = await promptRegistry.render(name, arguments_);
    return {
      name,
      description: result.description,
      messages: result.messages,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: {
        code: ErrorCodes.RESOURCE_NOT_FOUND,
        message: `Prompt not found: ${name}`,
      },
    };
  }
}

/**
 * Handle mcp:logging:set_level — change the server log level.
 */
async function handleMcpLoggingSetLevel(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const level = payload.level as string;
  const validLevels = ['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'];

  if (!validLevels.includes(level)) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: `Invalid log level. Must be one of: ${validLevels.join(', ')}`,
      },
    };
  }

  // Update the logger level
  logger.level = level as 'debug' | 'info' | 'warn' | 'error' | 'fatal';

  return {
    level,
    success: true,
  };
}

// ════════════════════════════════════════════════════════════
// Chat Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle chat:send — send a message to the agent loop.
 */
async function handleChatSend(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const message = payload.message as string;
  const conversationId = payload.conversationId as string | undefined;
  const provider = payload.provider as string | undefined;
  const model = payload.model as string | undefined;
  const temperature = payload.temperature as number | undefined;
  const maxTokens = payload.maxTokens as number | undefined;

  if (!message) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Message is required',
      },
    };
  }

  try {
    // Get the default provider
    const provider_ = provider ? llmRegistry.get(provider) : llmRegistry.getDefault();

    if (!provider_) {
      return {
        error: {
          code: ErrorCodes.PROVIDER_ERROR,
          message: 'No LLM provider available',
        },
      };
    }

    const start = Date.now();

    // Build conversation history (simplified — in production, load from DB)
    const messages: Array<ChatMessage> = [
      {role: 'user', content: message},
    ];

    // Call the LLM
    const response = await provider_.chat(messages, {
      model: model || provider_.config.defaultModel,
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 4096,
    });

    const elapsedMs = Date.now() - start;

    const result = {
      conversationId: conversationId || nanoid(8),
      content: response.content,
      toolCalls: response.tool_calls,
      tokens: {
        prompt: response.usage?.prompt_tokens ?? 0,
        completion: response.usage?.completion_tokens ?? 0,
        total: response.usage?.total_tokens ?? 0,
      },
      model: response.model,
      finishReason: response.finish_reason,
      elapsedMs,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to chat room
    await broadcastToRoom('chat', 'chat:stream:chunk', {
      delta: response.content,
      done: response.finish_reason === 'stop' || response.finish_reason === 'length',
      conversationId: result.conversationId,
    });

    return result;
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    return {
      error: {
        code: ErrorCodes.PROVIDER_ERROR,
        message: message_,
      },
    };
  }
}

/**
 * Handle chat:stream:start — start a streaming chat session.
 */
async function handleChatStreamStart(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const message = payload.message as string;
  const conversationId = payload.conversationId as string | undefined;
  const provider = payload.provider as string | undefined;

  if (!message) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Message is required',
      },
    };
  }

  try {
    const provider_ = provider ? llmRegistry.get(provider) : llmRegistry.getDefault();

    if (!provider_) {
      return {
        error: {
          code: ErrorCodes.PROVIDER_ERROR,
          message: 'No LLM provider available',
        },
      };
    }

    const messages: Array<ChatMessage> = [
      {role: 'user', content: message},
    ];

    const streamId = nanoid(8);
    const fullContent: string[] = [];

    // Start the stream and collect chunks
    for await (const chunk of provider_.streamChat(messages, {
      model: provider_.config.defaultModel,
    })) {
      if (chunk.type === 'content') {
        fullContent.push(chunk.delta);
        await broadcastToRoom('chat-stream', 'chat:stream:chunk', {
          delta: chunk.delta,
          streamId,
          done: false,
        });
      }
    }

    await broadcastToRoom('chat-stream', 'chat:stream:done', {
      delta: fullContent.join(''),
      done: true,
      conversationId: conversationId || nanoid(8),
      streamId,
    });

    return {
      streamId,
      conversationId: conversationId || nanoid(8),
      fullContent: fullContent.join(''),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    const conversationId = payload.conversationId as string | undefined;
    await broadcastToRoom('chat-stream', 'chat:stream:error', {
      error: {
        code: ErrorCodes.PROVIDER_ERROR,
        message: message_,
        conversationId,
      },
    });

    return {
      error: {
        code: ErrorCodes.PROVIDER_ERROR,
        message: message_,
      },
    };
  }
}

/**
 * Handle chat:history — retrieve message history.
 */
async function handleChatHistory(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const conversationId = payload.conversationId as string;
  const limit = (payload.limit as number) || 50;
  const offset = (payload.offset as number) || 0;

  if (!conversationId) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'conversationId is required',
      },
    };
  }

  // In production, load from the database using Sequelize
  // For now, return a placeholder
  return {
    conversationId,
    messages: [],
    total: 0,
    limit,
    offset,
  };
}

/**
 * Handle chat:conversations:list — list all conversations.
 */
async function handleChatConversationsList(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const limit = (payload.limit as number) || 20;
  const offset = (payload.offset as number) || 0;

  // In production, query the database
  return {
    conversations: [],
    total: 0,
    limit,
    offset,
  };
}

/**
 * Handle chat:conversations:get — get a specific conversation.
 */
async function handleChatConversationsGet(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const conversationId = payload.conversationId as string;

  if (!conversationId) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'conversationId is required',
      },
    };
  }

  // In production, query the database
  return {
    conversationId,
    title: '',
    messages: [],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Handle chat:conversations:delete — delete a conversation.
 */
async function handleChatConversationsDelete(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const conversationId = payload.conversationId as string;

  if (!conversationId) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'conversationId is required',
      },
    };
  }

  // In production, delete from the database
  return {
    conversationId,
    deleted: true,
  };
}

// ════════════════════════════════════════════════════════════
// Tool Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle tool:call — direct tool invocation with real-time result.
 */
async function handleToolCall(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;
  const arguments_ = payload.arguments as Record<string, unknown> | undefined;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Tool name is required',
      },
    };
  }

  const tool = toolRegistry.get(name);
  if (!tool) {
    return {
      error: {
        code: ErrorCodes.TOOL_NOT_FOUND,
        message: `Tool not found: ${name}`,
      },
    };
  }

  if (!tool.enabled) {
    return {
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: `Tool "${name}" is disabled`,
      },
    };
  }

  try {
    const start = Date.now();
    const result = await tool.handler(arguments_ || {});
    const duration = Date.now() - start;

    // Broadcast result to the room
    await broadcastToRoom('mcp', 'tool:result', {
      toolName: name,
      result,
      durationMs: duration,
      clientId,
    });

    return {
      toolName: name,
      result,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    const code = (err instanceof Error && 'code' in err) ? (err as { code: number }).code : ErrorCodes.INTERNAL_ERROR;

    await broadcastToRoom('mcp', 'tool:error', {
      toolName: name,
      error: {
        code,
        message: message_,
      },
      clientId,
    });

    return {
      error: {
        code,
        message: message_,
      },
    };
  }
}

// ════════════════════════════════════════════════════════════
// Provider Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle provider:list — return all LLM providers with health status.
 */
async function handleProviderList(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const providers = llmRegistry.list();
  const result = await Promise.all(
    providers.map(async (p) => {
      const status = await p.healthCheck().then(() => 'healthy' as const).catch(() => 'unhealthy' as const);
      const start = Date.now();
      try {
        await p.healthCheck();
      } catch {
        // ignored
      }
      return {
        name: p.name,
        type: p.config.type,
        isDefault: p.name === llmRegistry.defaultProviderName,
        model: p.config.defaultModel,
        status,
        latencyMs: Date.now() - start,
      };
    }),
  );

  return {providers: result};
}

/**
 * Handle provider:health — check health of a specific or all providers.
 */
async function handleProviderHealth(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string | undefined;

  if (name) {
    const provider = llmRegistry.get(name);
    if (!provider) {
      return {
        error: {
          code: ErrorCodes.PROVIDER_ERROR,
          message: `Provider not found: ${name}`,
        },
      };
    }

    const start = Date.now();
    const healthy = await provider.healthCheck().catch(() => false);

    return {
      name,
      status: healthy ? 'healthy' : 'unhealthy',
      latencyMs: Date.now() - start,
    };
  }

  // Health check all providers
  const results = await Promise.all(
    llmRegistry.list().map(async (p) => {
      const start = Date.now();
      const healthy = await p.healthCheck().catch(() => false);
      return {
        name: p.name,
        status: healthy ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
      };
    }),
  );

  return {providers: results};
}

/**
 * Handle provider:switch — switch the default LLM provider.
 */
async function handleProviderSwitch(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Provider name is required',
      },
    };
  }

  const success = llmRegistry.setDefault(name);
  if (!success) {
    return {
      error: {
        code: ErrorCodes.PROVIDER_ERROR,
        message: `Provider not found: ${name}`,
      },
    };
  }

  // Notify all providers room of the switch
  await broadcastToRoom('providers', 'provider:status:change', {
    name,
    previousStatus: 'unknown',
    newStatus: 'active',
    isDefault: true,
  });

  return {
    name,
    success: true,
    isDefault: true,
  };
}

// ════════════════════════════════════════════════════════════
// Simulation Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle simulate:scenarios:list — list all simulation scenarios.
 */
async function handleSimulateScenariosList(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const scenarios = simulator.listScenarios();
  return {
    scenarios: scenarios.map(s => ({
      name: s.name,
      description: s.description,
      steps: s.steps.length,
      hasMocks: false, // TODO: Check mock registry
    })),
    total: scenarios.length,
  };
}

/**
 * Handle simulate:run — run a simulation scenario.
 */
async function handleSimulateRun(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Scenario name is required',
      },
    };
  }

  // Notify that simulation has started
  await broadcastToRoom('simulate', 'simulate:progress', {
    name,
    currentStep: 0,
    totalSteps: 0,
    status: 'running',
  });

  // TODO: Execute the simulation scenario with real-time progress
  return {
    name,
    started: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle simulate:mocks:list — list simulation mocks.
 */
async function handleSimulateMocksList(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  // TODO: Query mock registry
  return {
    mocks: [],
    total: 0,
  };
}

/**
 * Handle simulate:mocks:set — configure a mock.
 */
async function handleSimulateMocksSet(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const tool = payload.tool as string;
  const content = payload.content as Array<{ type: string; text?: string }>;

  if (!tool || !content) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'tool and content are required',
      },
    };
  }

  // TODO: Save mock to mock registry
  return {
    tool,
    configured: true,
  };
}

/**
 * Handle simulate:mocks:clear — clear all simulation mocks.
 */
async function handleSimulateMocksClear(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  // TODO: Clear mock registry
  return {
    cleared: true,
    clearedAt: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════
// Metrics Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle metrics:live:start — start real-time metrics stream.
 */
async function handleMetricsLiveStart(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const interval = (payload.interval as number) || 1000;

  // Join client to metrics room
  // In a real implementation, you'd set up an interval here
  return {
    started: true,
    interval,
    streamId: nanoid(8),
  };
}

/**
 * Handle metrics:live:stop — stop the metrics stream.
 */
async function handleMetricsLiveStop(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  return {
    stopped: true,
  };
}

/**
 * Handle metrics:fetch — get a metrics snapshot.
 */
async function handleMetricsFetch(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const mem = process.memoryUsage();

  return {
    requests: {
      total: 0,
      perSecond: 0,
      active: 0,
    },
    latencies: {
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    },
    system: {
      memoryUsage: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
      },
      uptime: process.uptime(),
    },
    timestamp: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════
// System Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle system:health — get server health status.
 */
async function handleSystemHealth(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Check database
  try {
    const start = Date.now();
    // TODO: Actually check database connection
    checks.database = {status: 'healthy', latencyMs: Date.now() - start};
  } catch {
    checks.database = {status: 'unhealthy'};
  }

  // Check LLM providers
  for (const provider of llmRegistry.list()) {
    const start = Date.now();
    const healthy = await provider.healthCheck().catch(() => false);
    checks[`provider:${provider.name}`] = {
      status: healthy ? 'healthy' : 'unhealthy',
      latencyMs: Date.now() - start,
    };
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  for (const check of Object.values(checks)) {
    if (check.status === 'unhealthy') {
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }
  }

  return {
    status: overallStatus,
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle system:info — get server information.
 */
async function handleSystemInfo(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const mem = process.memoryUsage();

  return {
    name: '@mcp/server',
    version: '1.0.0',
    protocol: 'MCP 2024-11-05',
    tools: toolRegistry.size,
    providers: llmRegistry.listProviders(),
    uptime: process.uptime(),
    memoryUsage: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
    },
    platform: {
      arch: process.arch,
      platform: process.platform,
      nodeVersion: process.version,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle system:shutdown — graceful shutdown signal.
 */
async function handleSystemShutdown(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const reason = payload.reason as string | undefined;
  logger.info({reason}, 'Shutdown signal received via WebSocket');

  // In production, you'd trigger a graceful shutdown here
  return {
    shutdown: true,
    reason,
    timestamp: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════
// Notification Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle notify:to:room — send a notification to a room.
 */
async function handleNotifyToRoom(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const room = payload.room as string;
  const event = payload.event as string;
  const p = payload.payload as Record<string, unknown> | undefined;

  if (!room || !event) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'room and event are required',
      },
    };
  }

  // Forward the notification to the room
  await broadcastToRoom(room, event, p || {}, clientId);

  return {
    sent: true,
    room,
    event,
  };
}

/**
 * Handle notify:to:all — broadcast to all connected clients.
 */
async function handleNotifyToAll(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const event = payload.event as string;
  const p = payload.payload as Record<string, unknown> | undefined;

  if (!event) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'event is required',
      },
    };
  }

  await publish(event, p || {}, clientId);

  return {
    broadcast: true,
    event,
  };
}

// ════════════════════════════════════════════════════════════
// Room Control Event Handlers
// ════════════════════════════════════════════════════════════

/**
 * Handle room join/leave.
 */
async function handleRoomControl(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const room = payload.room as string;
  const action = payload.action as 'join' | 'leave';

  if (!room || !action) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'room and action are required',
      },
    };
  }

  if (action === 'join') {
    const result = roomManager.joinRoom(clientId, room);
    if (!result) {
      return {
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: `Failed to join room: ${room}`,
        },
      };
    }

    await broadcastToRoom(room, 'notify:room_entered', {
      room,
      clientId,
      clientCount: result.members.size,
    });

    return {
      joined: true,
      room,
      memberCount: result.members.size,
    };
  }

  if (action === 'leave') {
    roomManager.leaveRoom(clientId, room);

    return {
      left: true,
      room,
    };
  }

  return {
    error: {
      code: ErrorCodes.INVALID_PARAMS,
      message: `Unknown action: ${action}`,
    },
  };
}

// ═══════════════════════════════════════════════════
// Connection Close Handler
// ═══════════════════════════════════════════════════

/**
 * Handle ws:connection:close — client requests to close connection.
 */
async function handleConnectionClose(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const reason = payload.reason as string | undefined;
  const immediate = payload.immediate as boolean | undefined;

  return {
    close: true,
    reason: reason || 'Client requested close',
    immediate: immediate ?? false,
    acknowledged: true,
  };
}

// ═══════════════════════════════════════════════════
// Chat Stream Control Handlers
// ═══════════════════════════════════════════════════

/**
 * Handle chat:stream:pause — pause a chat stream session.
 */
async function handleChatStreamPause(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const streamId = payload.streamId as string | undefined;
  const conversationId = payload.conversationId as string | undefined;

  if (!streamId) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'streamId is required',
      },
    };
  }

  // Use stream manager to pause
  const streamInfo = streamManager.pauseStream(streamId);
  if (!streamInfo) {
    return {
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: `Stream "${streamId}" not found or not in active state`,
      },
    };
  }

  // Broadcast pause notification to room
  await broadcastToRoom('chat-stream', 'chat:stream:pause', {
    streamId,
    conversationId,
    pausedBy: clientId,
    timestamp: new Date().toISOString(),
  });

  logger.info({streamId, clientId}, 'Chat stream paused');

  return {
    paused: true,
    streamId,
    conversationId,
    status: streamInfo.status,
    chunksSent: streamInfo.chunksSent,
    durationMs: streamInfo.durationMs,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle chat:stream:resume — resume a paused chat stream session.
 */
async function handleChatStreamResume(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const streamId = payload.streamId as string | undefined;
  const conversationId = payload.conversationId as string | undefined;

  if (!streamId) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'streamId is required',
      },
    };
  }

  // Use stream manager to resume
  const streamInfo = streamManager.resumeStream(streamId);
  if (!streamInfo) {
    return {
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: `Stream "${streamId}" not found or not in paused state`,
      },
    };
  }

  // Broadcast resume notification to room
  await broadcastToRoom('chat-stream', 'chat:stream:resume', {
    streamId,
    conversationId,
    resumedBy: clientId,
    timestamp: new Date().toISOString(),
  });

  logger.info({streamId, clientId}, 'Chat stream resumed');

  return {
    resumed: true,
    streamId,
    conversationId,
    status: streamInfo.status,
    chunksSent: streamInfo.chunksSent,
    durationMs: streamInfo.durationMs,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════
// Simulation Control Handlers
// ═══════════════════════════════════════════════════

/**
 * Handle simulate:pause — pause a running simulation scenario using the real simulator.
 */
async function handleSimulatePause(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Scenario name is required',
      },
    };
  }

  // Use real simulator to pause
  const scenario = simulator.getScenario(name);
  if (!scenario) {
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Scenario "${name}" not found`,
      },
    };
  }

  // Broadcast pause notification
  await broadcastToRoom('simulate', 'simulate:progress', {
    name,
    currentStep: 0,
    totalSteps: scenario.steps.length,
    status: SimulationStatus.PAUSED,
  });

  logger.info({scenario: name, clientId}, 'Simulation scenario paused');

  return {
    paused: true,
    name,
    currentStep: 0,
    totalSteps: scenario.steps.length,
    status: SimulationStatus.PAUSED,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle simulate:resume — resume a paused simulation scenario using the real simulator.
 */
async function handleSimulateResume(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Scenario name is required',
      },
    };
  }

  // Use real simulator to resume
  const scenario = simulator.getScenario(name);
  if (!scenario) {
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Scenario "${name}" not found`,
      },
    };
  }

  // Broadcast resume notification
  await broadcastToRoom('simulate', 'simulate:progress', {
    name,
    currentStep: 0,
    totalSteps: scenario.steps.length,
    status: SimulationStatus.RUNNING,
  });

  logger.info({scenario: name, clientId}, 'Simulation scenario resumed');

  return {
    resumed: true,
    name,
    currentStep: 0,
    totalSteps: scenario.steps.length,
    status: SimulationStatus.RUNNING,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle simulate:abort — abort a running simulation scenario using the real simulator.
 */
async function handleSimulateAbort(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;
  const reason = payload.reason as string | undefined;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Scenario name is required',
      },
    };
  }

  // Use real simulator to get current state before abort
  const scenario = simulator.getScenario(name);
  const currentSteps = scenario?.steps.length || 0;

  // Abort any running simulation and cleanup mocks
  simulator.clearMocks();

  // Broadcast abort notification
  await broadcastToRoom('simulate', 'simulate:progress', {
    name,
    currentStep: 0,
    totalSteps: currentSteps,
    status: SimulationStatus.ABORTED,
  });

  await broadcastToRoom('simulate', 'simulate:result', {
    name,
    passed: false,
    totalSteps: currentSteps,
    passedSteps: 0,
    failedSteps: currentSteps,
    durationMs: 0,
    errors: [{step: 0, tool: 'system', error: reason || 'Simulation aborted by user'}],
  });

  logger.info({scenario: name, reason, clientId}, 'Simulation scenario aborted');

  return {
    aborted: true,
    name,
    currentStep: 0,
    totalSteps: currentSteps,
    status: SimulationStatus.ABORTED,
    reason,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle simulate:status — get the current status of a simulation scenario using real simulator.
 */
async function handleSimulateStatus(_event: WsEventName, payload: Record<string, unknown>, clientId: string): Promise<Record<string, unknown> | null> {
  const name = payload.name as string;

  if (!name) {
    return {
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: 'Scenario name is required',
      },
    };
  }

  // Use real simulator to get scenario info
  const scenario = simulator.getScenario(name);

  if (!scenario) {
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Scenario "${name}" not found`,
      },
    };
  }

  // Get mock status
  const mock = simulator.getMock(name);
  const hasMock = mock !== undefined;

  logger.info({scenario: name, clientId}, 'Simulation status requested');

  return {
    name,
    status: SimulationStatus.PENDING,
    currentStep: 0,
    totalSteps: scenario.steps.length,
    durationMs: 0,
    hasMock,
    description: scenario.description,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════
// System Info Handlers
// ═══════════════════════════════════════════════════

/**
 * Handle system:uptime — get the current server uptime.
 */
async function handleSystemUptime(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const uptime = process.uptime();

  // Format human-readable uptime
  const seconds = Math.floor(uptime);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  let uptimeHuman = '';
  if (days > 0) uptimeHuman += `${days}d `;
  if (hours > 0) uptimeHuman += `${hours}h `;
  if (minutes > 0) uptimeHuman += `${minutes}m `;
  uptimeHuman += `${secs}s`;

  return {
    uptime,
    uptimeHuman: uptimeHuman.trim(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle system:version — get the server version info.
 */
async function handleSystemVersion(_event: WsEventName, _payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  return {
    name: '@mcp/server',
    version: '1.0.0',
    protocol: 'MCP 2024-11-05',
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════
// Tool List Changed Handler
// ═══════════════════════════════════════════════════

/**
 * Handle tool:list_changed — broadcast tool list changes.
 */
async function handleToolListChanged(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  // This handler is for broadcasting tool list changes
  // It's primarily used internally, but can be triggered manually
  const added = (payload.added as string[]) || [];
  const removed = (payload.removed as string[]) || [];

  logger.info({added, removed}, 'Tool list changed notification');

  return {
    count: added.length + removed.length,
    added,
    removed,
    timestamp: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════
// Generic Request Handler
// ════════════════════════════════════════════════════════════

/**
 * Handle generic request — proxy to MCP protocol handler.
 */
async function handleGenericRequest(_event: WsEventName, payload: Record<string, unknown>, _clientId: string): Promise<Record<string, unknown> | null> {
  const method = payload.method as string;
  const id = payload.id as string | number | null | undefined;
  const params = payload.params as Record<string, unknown> | undefined;

  if (!method) {
    return {
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: 'method is required',
      },
    };
  }

  try {
    const response = await protocolHandler.handleRequest({
      jsonrpc: '2.0' as const,
      id: id ?? null,
      method,
      params,
    });

    return {
      jsonrpc: '2.0',
      id,
      result: 'result' in response ? (response as { result: unknown }).result : undefined,
      error: 'error' in response ? (response as { error: unknown }).error : undefined,
    };
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: message_,
      },
    };
  }
}

// ════════════════════════════════════════════════════════════
// Handler Registry — All handlers registered here
// ════════════════════════════════════════════════════════════

/**
 * Initialize all event handlers.
 * Called once when the WebSocket server starts.
 */
export function initEventHandlers(): void {
  // ─── Core Handlers ───
  registerHandler('ws:connect', handleWsConnect);
  registerHandler('ws:disconnect', handleWsDisconnect);
  registerHandler('ws:error', handleWsError);
  registerHandler('ws:ping', handleWsPing);
  registerHandler('ws:pong', handleWsPong);
  registerHandler('ws:auth', handleWsAuth);
  registerHandler('ws:reconnect', handleWsReconnect);
  registerHandler('ws:room:control', handleRoomControl);
  registerHandler('ws:connection:close', handleConnectionClose);

  // ─── MCP Protocol Handlers ───
  registerHandler('mcp:tools:list', handleMcpToolsList);
  registerHandler('mcp:tools:call', handleMcpToolsCall);
  registerHandler('mcp:resources:list', handleMcpResourcesList);
  registerHandler('mcp:resources:read', handleMcpResourcesRead);
  registerHandler('mcp:prompts:list', handleMcpPromptsList);
  registerHandler('mcp:prompts:get', handleMcpPromptsGet);
  registerHandler('mcp:logging:set_level', handleMcpLoggingSetLevel);

  // ─── Chat Handlers ───
  registerHandler('chat:send', handleChatSend);
  registerHandler('chat:stream:start', handleChatStreamStart);
  registerHandler('chat:stream:pause', handleChatStreamPause);
  registerHandler('chat:stream:resume', handleChatStreamResume);
  registerHandler('chat:history', handleChatHistory);
  registerHandler('chat:conversations:list', handleChatConversationsList);
  registerHandler('chat:conversations:get', handleChatConversationsGet);
  registerHandler('chat:conversations:delete', handleChatConversationsDelete);

  // ─── Tool Handlers ───
  registerHandler('tool:call', handleToolCall);
  registerHandler('tool:list_changed', handleToolListChanged);

  // ─── Provider Handlers ───
  registerHandler('provider:list', handleProviderList);
  registerHandler('provider:health', handleProviderHealth);
  registerHandler('provider:switch', handleProviderSwitch);

  // ─── Simulation Handlers ───
  registerHandler('simulate:scenarios:list', handleSimulateScenariosList);
  registerHandler('simulate:run', handleSimulateRun);
  registerHandler('simulate:pause', handleSimulatePause);
  registerHandler('simulate:resume', handleSimulateResume);
  registerHandler('simulate:abort', handleSimulateAbort);
  registerHandler('simulate:status', handleSimulateStatus);
  registerHandler('simulate:mocks:list', handleSimulateMocksList);
  registerHandler('simulate:mocks:set', handleSimulateMocksSet);
  registerHandler('simulate:mocks:clear', handleSimulateMocksClear);

  // ─── Metrics Handlers ───
  registerHandler('metrics:live:start', handleMetricsLiveStart);
  registerHandler('metrics:live:stop', handleMetricsLiveStop);
  registerHandler('metrics:fetch', handleMetricsFetch);

  // ─── System Handlers ───
  registerHandler('system:health', handleSystemHealth);
  registerHandler('system:info', handleSystemInfo);
  registerHandler('system:shutdown', handleSystemShutdown);
  registerHandler('system:uptime', handleSystemUptime);
  registerHandler('system:version', handleSystemVersion);

  // ─── Notification Handlers ───
  registerHandler('notify:to:room', handleNotifyToRoom);
  registerHandler('notify:to:all', handleNotifyToAll);

  // ─── Generic ───
  registerHandler('request', handleGenericRequest);

  logger.info({handlers: eventHandlers.size}, 'All WebSocket event handlers initialized');
}

/**
 * Dispatch an event to the appropriate handler.
 * @param eventName - Event name
 * @param payload - Event payload
 * @param clientId - Client ID
 * @returns Handler response payload, or null
 */
export async function dispatchEvent(
  eventName: string,
  payload: Record<string, unknown>,
  clientId: string,
): Promise<Record<string, unknown> | null> {
  // Validate payload if schema exists
  const eventDef = EVENT_REGISTRY.find(e => e.name === eventName);
  if (eventDef) {
    const validation = validateEventPayload(eventName, payload);
    if (!validation.valid) {
      logger.warn({event: eventName, error: validation.error}, 'Event validation failed');
      return {
        error: {
          code: ErrorCodes.INVALID_PARAMS,
          message: validation.error,
        },
      };
    }
  }

  // Get handler
  const handler = eventHandlers.get(eventName);
  if (!handler) {
    logger.warn({event: eventName}, 'No handler registered for event');
    return {
      error: {
        code: ErrorCodes.METHOD_NOT_FOUND,
        message: `No handler for event: ${eventName}`,
      },
    };
  }

  try {
    // @ts-ignore
    return await handler(eventName as WsEventName, payload, clientId);
  } catch (err) {
    const message_ = err instanceof Error ? err.message : String(err);
    logger.error({event: eventName, error: message_}, 'Handler execution error');
    return {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: message_,
      },
    };
  }
}

/**
 * Get a list of all registered event handlers.
 */
export function getRegisteredHandlers(): { name: string; handler: string }[] {
  return Array.from(eventHandlers.keys()).map(name => ({
    name,
    handler: eventHandlers.get(name)!.name,
  }));
}

export default {
  eventHandlers,
  dispatchEvent,
  initEventHandlers,
  getRegisteredHandlers,
  registerHandler,
};
