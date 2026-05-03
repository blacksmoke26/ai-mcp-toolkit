# Conversational AI Memory System

### 🎯 Objective

Implement a comprehensive memory system for AI conversations:
- Short-term context window management
- Long-term memory with vector embeddings
- Memory retrieval & relevance scoring
- Auto-summarization for long conversations

### 📐 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Memory Manager                       │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐ │
│  │  Short-Term Memory (Context Window)                │ │
│  │  • Recent messages  • Token limits  • Auto-trim   │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Long-Term Memory (Vector Store)                   │ │
│  │  • Embeddings  • Similarity search  • Chunks      │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Memory Operations                                 │ │
│  │  • Store  • Retrieve  • For get  • Summarize      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 📦 New Database Models

```typescript
// File: backend/src/db/models/memory.ts

import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { db } from '../index';
import { createHash } from 'crypto';

interface MemoryInstance extends Model {
  id: string;
  conversationId: string;
  userId?: number | null;
  type: 'fact' | 'preference' | 'summary' | 'custom';
  content: string;
  embedding?: Float32Array | null; // Vector embedding
  tags: string[];
  relevanceScore?: number | null;
  sourceMessageId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  accessedAt?: Date | null;
}

export class Memory extends Model<InferAttributes<Memory>, InferCreationAttributes<Memory>> implements MemoryInstance {
  declare id: string;
  declare conversationId: string;
  declare userId?: number | null;
  declare type: 'fact' | 'preference' | 'summary' | 'custom';
  declare content: string;
  declare embedding?: Float32Array | null;
  declare tags: string[];
  declare relevanceScore?: number | null;
  declare sourceMessageId?: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare accessedAt?: Date | null;
}

Memory.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  conversationId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM('fact', 'preference', 'summary', 'custom'), defaultValue: 'fact' },
  content: { type: DataTypes.TEXT, allowNull: false },
  embedding: { type: DataTypes.ARRAY(DataTypes.FLOAT), allowNull: true },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  relevanceScore: { type: DataTypes.FLOAT, allowNull: true },
  sourceMessageId: { type: DataTypes.INTEGER, allowNull: true },
  accessedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  sequelize: db,
  modelName: 'Memory',
  timestamps: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['userId'] },
    { fields: ['type'] },
  ],
});

// Memory Summaries
export class MemorySummary extends Model {
  declare id: number;
  declare conversationId: string;
  declare summary: string;
  declare version: number;
  declare tokenCount: number;
  declare createdAt: Date;
}
```

### 🧠 Memory Manager Implementation

```typescript
// File: backend/src/memory/memory-manager.ts

import { Memory, MemorySummary } from '@/db/models';
import { OpenAIEmbeddings } from '@/llm/embeddings';
import { cosineSimilarity } from '@/utils/vector-math';

export interface MemoryOptions {
  conversationId: string;
  userId?: number;
  contextWindowTokens?: number;
  maxMemories?: number;
  similarityThreshold?: number;
}

export interface RetrievedMemory {
  memory: Memory;
  relevanceScore: number;
  content: string;
}

export class MemoryManager {
  private embeddingModel: OpenAIEmbeddings;
  private contextWindowTokens: number;
  private maxMemories: number;
  private similarityThreshold: number;

  constructor(options: Partial<MemoryOptions> = {}) {
    this.embeddingModel = new OpenAIEmbeddings();
    this.contextWindowTokens = options.contextWindowTokens || 4000;
    this.maxMemories = options.maxMemories || 100;
    this.similarityThreshold = options.similarityThreshold || 0.7;
  }

  /**
   * Store a new memory from a message
   */
  async storeMemory(
    conversationId: string,
    content: string,
    userId?: number,
    type: MemoryOptions['type'] = 'fact',
    sourceMessageId?: number
  ): Promise<Memory> {
    // Generate embedding
    const embedding = await this.embeddingModel.createEmbedding(content);

    const memory = await Memory.create({
      conversationId,
      userId,
      type,
      content,
      embedding: embedding.buffer,
      tags: this.extractTags(content),
      sourceMessageId,
    });

    return memory;
  }

  /**
   * Retrieve relevant memories based on query
   */
  async retrieveMemories(
    conversationId: string,
    query: string,
    limit: number = 10
  ): Promise<RetrievedMemory[]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddingModel.createEmbedding(query);

    // Get all memories for conversation
    const memories = await Memory.findAll({
      where: { conversationId },
      limit: this.maxMemories,
      order: [['accessedAt', 'DESC']],
    });

    // Calculate relevance scores
    const scoredMemories: Array<{ memory: Memory; relevanceScore: number }> = [];
    for (const memory of memories) {
      if (memory.embedding) {
        const score = cosineSimilarity(queryEmbedding.buffer, memory.embedding);
        if (score >= this.similarityThreshold) {
          scoredMemories.push({ memory, relevanceScore: score });
        }
      }
    }

    // Sort by relevance and limit
    scoredMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topMemories = scoredMemories.slice(0, limit);

    // Update access timestamps
    await Promise.all(
      topMemories.map(({ memory }) => 
        Memory.update({ accessedAt: new Date() }, { where: { id: memory.id } })
      )
    );

    return topMemories.map(({ memory, relevanceScore }) => ({
      memory,
      relevanceScore,
      content: memory.content,
    }));
  }

  /**
   * Get memories for a conversation with context
   */
  async getContextWithMemory(
    conversationId: string,
    messages: ChatMessage[],
    currentMessage: string
  ): Promise<{ messages: ChatMessage[]; memories: RetrievedMemory[] }> {
    const memories = await this.retrieveMemories(conversationId, currentMessage);
    
    const contextMessages = await this.buildContextWindow(
      messages,
      this.contextWindowTokens - this.estimateMemoryTokens(memories)
    );

    return {
      messages: [
        ...memories.map(m => ({
          role: 'system',
          content: `RELEVANT MEMORY: ${m.content}`,
        })),
        ...contextMessages,
        { role: 'user', content: currentMessage },
      ],
      memories,
    };
  }

  /**
   * Auto-summarize long conversations
   */
  async summarizeConversation(
    conversationId: string,
    messages: ChatMessage[]
  ): Promise<string> {
    const summary = await this.generateSummary(messages);
    
    await MemorySummary.create({
      conversationId,
      summary,
      version: await this.getSummaryVersion(conversationId) + 1,
      tokenCount: this.countTokens(summary),
    });

    return summary;
  }

  /**
   * Delete memories older than specified date
   */
  async cleanupOldMemories(
    conversationId: string,
    olderThan: Date
  ): Promise<number> {
    const { count } = await Memory.destroy({
      where: {
        conversationId,
        createdAt: { [Op.lt]: olderThan },
      },
    });
    
    return count;
  }

  // Helper methods
  private async extractTags(content: string): Promise<string[]> {
    // Extract important keywords/phrases using NLP
    // For now, return empty array
    return [];
  }

  private async buildContextWindow(
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<ChatMessage[]> {
    let currentTokens = 0;
    const result: ChatMessage[] = [];

    for (const message of messages.reverse()) {
      const messageTokens = this.countTokens(message.content);
      if (currentTokens + messageTokens > maxTokens) {
        break;
      }
      result.unshift(message);
      currentTokens += messageTokens;
    }

    return result;
  }

  private estimateMemoryTokens(memories: RetrievedMemory[]): number {
    return memories.reduce((sum, m) => sum + this.countTokens(m.content), 0);
  }

  private async generateSummary(messages: ChatMessage[]): Promise<string> {
    // Call LLM to generate summary
    // Implementation would use the provider's chat endpoint
    return 'Summary of conversation...';
  }

  private countTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private async getSummaryVersion(conversationId: string): Promise<number> {
    const summary = await MemorySummary.findOne({
      where: { conversationId },
      order: [['version', 'DESC']],
    });
    return summary?.version || 0;
  }
}

// Singleton export
export const memoryManager = new MemoryManager();
```

### 💬 Chat with Memory

```typescript
// File: backend/src/server/routes/chat-memory.ts

import { memoryManager } from '@/memory/memory-manager';

fastify.post('/chat/memory', async (request, reply) => {
  const { message, conversationId } = request.body as { 
    message: string;
    conversationId: string;
  };

  try {
    // Get conversation history
    const history = await getConversationHistory(conversationId);
    
    // Get context with relevant memories
    const { messages, memories } = await memoryManager.getContextWithMemory(
      conversationId,
      history.messages,
      message
    );

    // Run agent with enriched context
    const response = await runAgentLoop({
      provider: llmRegistry.getDefaultProvider()!,
      messages,
      maxIterations: 10,
    });

    // Store new memories from the conversation
    if (memories.length > 0) {
      await memoryManager.storeMemory(
        conversationId,
        `User asked: "${message}"`,
        request.user!.userId,
        'fact',
        response.messages[response.messages.length - 1].id
      );
    }

    return reply.send({
      content: response.content,
      iterations: response.iterations,
      memoriesUsed: memories.length,
      tokens: response.totalTokens,
    });
  } catch (error) {
    logger.error({ error }, 'Error in chat with memory');
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Get Memory Insights
fastify.get('/chat/memory/insights/:conversationId', async (request, reply) => {
  const { conversationId } = request.params as { conversationId: string };

  const memories = await Memory.findAll({
    where: { conversationId },
    order: [['createdAt', 'DESC']],
  });

  const insights = {
    totalMemories: memories.length,
    byType: groupByType(memories),
    recentMemories: memories.slice(0, 10),
    tags: extractAllTags(memories),
  };

  return reply.send(insights);
});
```

### 🖥️ Frontend Memory UI

```typescript jsx
// File: frontend/src/components/MemoryPanel.tsx

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { Brain, Clock, Tag, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Memory {
  id: string;
  content: string;
  type: string;
  tags: string[];
  createdAt: string;
  relevanceScore: number;
}

export function MemoryPanel({ conversationId }: { conversationId: string }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMemories();
  }, [conversationId]);

  async function loadMemories() {
    setLoading(true);
    try {
      const data = await api.get(`/chat/memory/insights/${conversationId}`);
      setMemories(data.recentMemories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
    setLoading(false);
  }

  async function deleteMemory(id: string) {
    await api.delete(`/chat/memory/${id}`);
    setMemories(memories.filter(m => m.id !== id));
  }

  return (
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          Memory Insights
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        {memories.map(memory => (
          <div key={memory.id} className="border rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={memory.type}>{memory.type}</Badge>
                  {memory.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-700">{memory.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(memory.createdAt).toLocaleDateString()}
                  </span>
                  <span>Relevance: {(memory.relevanceScore * 100).toFixed(0)}%</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMemory(memory.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>
    </Card>
  );
}
```

### 📋 Implementation Checklist

- [ ] Add Memory, MemorySummary database models
- [ ] Implement embedding generation
- [ ] Build cosine similarity search
- [ ] Create memory storage & retrieval
- [ ] Implement context window management
- [ ] Add auto-summarization
- [ ] Build memory cleanup utilities
- [ ] Create memory insights UI
- [ ] Add memory editing capabilities
- [ ] Write comprehensive tests
- [ ] Add memory export/import

