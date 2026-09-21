import { describe, it, expect, beforeEach } from 'vitest';
import { ContextService } from '../services/context/ContextService';
import { ContextBuilder } from '../services/context/ContextBuilder';
import { MemoryService } from '../services/memory/MemoryService';
import { LocalMemoryStore } from '../services/memory/LocalMemoryStore';
import { MemoryPolicyManager } from '../services/memory/MemoryPolicy';
import { Project } from '@nikit/types';

// In-memory mock for localStorage in Node environment
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

describe('ContextService & Structured Context Assembly', () => {
  let memoryStore: LocalMemoryStore;
  let memoryService: MemoryService;
  let contextService: ContextService;

  beforeEach(() => {
    localStorageMock.clear();
    memoryStore = new LocalMemoryStore();
    const policyManager = new MemoryPolicyManager(memoryStore);
    memoryService = new MemoryService(memoryStore, policyManager);
    contextService = new ContextService(memoryService);
  });

  it('assembles structured context with User Memory, Project Instructions, and Project Memory', async () => {
    // Setup memories
    await memoryService.createMemory({
      scope: 'user',
      content: 'Prefers strict TypeScript and modular architecture.',
    });

    await memoryService.createMemory({
      scope: 'project',
      projectId: 'proj-ml',
      content: 'Using smollm2 GGUF model for local testing.',
    });

    const mockProject: Project = {
      id: 'proj-ml',
      name: 'ML Research',
      description: 'Local LLM experiments',
      instructions: 'Always format code in clean TypeScript.',
      defaultModelId: 'smollm2',
      defaultModelName: 'SmolLM2-135M',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: {
        fileReferences: [],
        memoryReferences: [],
        knowledgeReferences: [],
        toolReferences: [],
      },
      conversationIds: [],
      archived: false,
      schemaVersion: 'v1',
    };

    const structuredContext = await contextService.prepare({
      projectId: 'proj-ml',
      projectOverride: mockProject,
      userPrompt: 'How should I structure my inference module?',
      workspaceModelId: 'smollm2',
      workspaceModelName: 'SmolLM2-135M',
    });

    expect(structuredContext.blocks.length).toBeGreaterThanOrEqual(5);

    const blockTypes = structuredContext.blocks
      .filter((b) => b.isAvailable)
      .map((b) => b.type);

    expect(blockTypes).toContain('system');
    expect(blockTypes).toContain('current_user');
    expect(blockTypes).toContain('project_instructions');
    expect(blockTypes).toContain('project_memory');
    expect(blockTypes).toContain('user_memory');

    // Verify snapshot calculations
    expect(structuredContext.snapshot.systemTokens).toBeGreaterThan(0);
    expect(structuredContext.snapshot.projectTokens).toBeGreaterThan(0);
    expect(structuredContext.snapshot.memoryTokens).toBeGreaterThan(0);

    // Verify provider formatting
    const formattedPrompt = ContextBuilder.formatForProvider(structuredContext);
    expect(formattedPrompt).toContain('Global System Instructions');
    expect(formattedPrompt).toContain('Always format code in clean TypeScript.');
    expect(formattedPrompt).toContain('Using smollm2 GGUF model for local testing.');
    expect(formattedPrompt).toContain('Prefers strict TypeScript and modular architecture.');
    expect(formattedPrompt).toContain('User: How should I structure my inference module?');
  });
});
