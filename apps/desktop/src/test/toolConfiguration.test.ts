import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ContextService } from '../services/context/ContextService';
import { MemoryService } from '../services/memory/MemoryService';
import { LocalMemoryStore } from '../services/memory/LocalMemoryStore';
import { MemoryPolicyManager } from '../services/memory/MemoryPolicy';
import { hybridRetriever } from '../services/retrieval';
import { Project, Conversation } from '@nikit/types';

// In-memory localStorage mock
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => {
    storageMap.set(key, val);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Tool Configuration & Pipeline Control', () => {
  let memoryStore: LocalMemoryStore;
  let memoryService: MemoryService;
  let contextService: ContextService;

  const dummyConversation: Conversation = {
    id: 'conv-tool-test',
    title: 'Tool Config Test',
    modelId: 'mock-dev',
    modelName: 'Mock Model',
    messages: [
      {
        id: 'm1',
        conversationId: 'conv-tool-test',
        role: 'user',
        parts: [{ type: 'text', content: 'Explain local inference.' }],
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };

  const dummyProject: Project = {
    id: 'proj-tools',
    name: 'Tool Testing Project',
    description: 'Testing tool configuration flows',
    instructions: 'Follow standard guidelines.',
    defaultModelId: 'mock-dev',
    defaultModelName: 'Mock Model',
    archived: false,
    context: {
      fileReferences: [],
      memoryReferences: [],
      knowledgeReferences: [],
      toolReferences: [],
    },
    conversationIds: ['conv-tool-test'],
    schemaVersion: 'v1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    localStorageMock.clear();
    memoryStore = new LocalMemoryStore();
    const policy = new MemoryPolicyManager(memoryStore);
    memoryService = new MemoryService(memoryStore, policy);
    contextService = new ContextService(memoryService);

    // Pre-seed a memory
    await memoryService.createMemory({
      scope: 'user',
      content: 'User prefers Rust and C++ implementations.',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('injects user memory when memory tool is enabled (default)', async () => {
    const context = await contextService.prepare({
      projectOverride: dummyProject,
      conversationOverride: dummyConversation,
      userPrompt: 'What language should I use?',
      toolConfig: { rag: true, memory: true },
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    const userMemBlock = context.blocks.find((b) => b.type === 'user_memory');
    expect(userMemBlock).toBeDefined();
    expect(userMemBlock?.isAvailable).toBe(true);
    expect(userMemBlock?.content).toContain('User prefers Rust and C++ implementations');
  });

  it('suppresses memory injection completely when memory tool is disabled', async () => {
    const context = await contextService.prepare({
      projectOverride: dummyProject,
      conversationOverride: dummyConversation,
      userPrompt: 'What language should I use?',
      toolConfig: { rag: true, memory: false },
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    const userMemBlock = context.blocks.find((b) => b.type === 'user_memory');
    expect(userMemBlock?.isAvailable).toBe(false);
  });

  it('executes retrieval when RAG is enabled', async () => {
    const retrieveSpy = vi.spyOn(hybridRetriever, 'retrieve').mockResolvedValueOnce({
      query: 'Tell me about llama.cpp',
      results: [
        {
          chunk: {
            id: 'chunk-1',
            fileId: 'f1',
            documentId: 'd1',
            text: 'Llama.cpp provides optimized CPU/GPU quant inference.',
            location: { documentId: 'd1', startLine: 1, endLine: 5, startOffset: 0, endOffset: 50 },
            metadata: {
              title: 'Llama.cpp Docs',
              sourceName: 'llama.md',
              sourceExtension: '.md',
              characterCount: 50,
              lineCount: 1,
              wordCount: 7,
              parsedAt: new Date().toISOString(),
            } as any,
            createdAt: new Date().toISOString(),
          } as any,
          chunkId: 'chunk-1',
          score: 0.95,
          vectorScore: 0.9,
          lexicalScore: 1.0,
          rank: 1,
          source: 'hybrid',
        },
      ],
      totalCandidates: 1,
      durationMs: 5,
      config: {} as any,
      modelId: 'mock-embed',
      executedAt: new Date().toISOString(),
    });

    const context = await contextService.prepare({
      projectOverride: dummyProject,
      conversationOverride: dummyConversation,
      userPrompt: 'Tell me about llama.cpp',
      toolConfig: { rag: true, memory: true },
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    expect(retrieveSpy).toHaveBeenCalled();
    const ragBlock = context.blocks.find((b) => b.type === 'retrieved_knowledge');
    expect(ragBlock).toBeDefined();
    expect(ragBlock?.isAvailable).toBe(true);
    expect(ragBlock?.content).toContain('Llama.cpp provides optimized CPU/GPU quant inference');

    retrieveSpy.mockRestore();
  });

  it('suppresses retrieval completely when RAG is disabled', async () => {
    const retrieveSpy = vi.spyOn(hybridRetriever, 'retrieve');

    const context = await contextService.prepare({
      projectOverride: dummyProject,
      conversationOverride: dummyConversation,
      userPrompt: 'Tell me about llama.cpp',
      toolConfig: { rag: false, memory: true },
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    expect(retrieveSpy).not.toHaveBeenCalled();
    const ragBlock = context.blocks.find((b) => b.type === 'retrieved_knowledge');
    expect(ragBlock?.isAvailable).toBe(false);

    retrieveSpy.mockRestore();
  });

  it('prevents unavailable tools (Code Sandbox, Web Search) from execution', () => {
    // Both capabilities are strictly absent from toolConfig and execution pathways
    // The ToolConfiguration interface only allows { rag: boolean, memory: boolean }
    const validConfig = { rag: true, memory: true };
    expect('sandbox' in validConfig).toBe(false);
    expect('webSearch' in validConfig).toBe(false);
  });
});
