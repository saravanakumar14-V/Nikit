import { describe, it, expect, beforeEach } from 'vitest';
import { LocalMemoryStore } from '../services/memory/LocalMemoryStore';
import { MemoryService } from '../services/memory/MemoryService';
import { MemoryPolicyManager } from '../services/memory/MemoryPolicy';
import { ContextService } from '../services/context/ContextService';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { LocalStorageConversationStore } from '../services/storage/LocalStorageConversationStore';
import { ContextBuilder } from '../services/context/ContextBuilder';
import { Conversation } from '@nikit/types';

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

describe('Phase 8 — Memory & Context Intelligence Integration Test', () => {
  let memoryStore: LocalMemoryStore;
  let memoryService: MemoryService;
  let contextService: ContextService;
  let projectStore: LocalStorageProjectStore;
  let conversationStore: LocalStorageConversationStore;

  beforeEach(() => {
    localStorageMock.clear();
    memoryStore = new LocalMemoryStore();
    const policyManager = new MemoryPolicyManager(memoryStore);
    memoryService = new MemoryService(memoryStore, policyManager);
    contextService = new ContextService(memoryService);
    projectStore = new LocalStorageProjectStore();
    conversationStore = new LocalStorageConversationStore();
  });

  it('performs full realistic end-to-end context assembly workflow (Section 34)', async () => {
    // 1. User memory
    const userMem = await memoryService.createMemory({
      scope: 'user',
      content: 'Prefers concise technical explanations.',
      title: 'Explanation Style',
      confidence: 'explicit',
      source: 'user_saved',
    });

    // 2. Project creation with project instructions
    const project = await projectStore.create({
      name: 'LLM Research',
      description: 'Local LLM experiments workspace',
      instructions: 'Focus on PyTorch and local inference.',
    });

    // 3. Project memory scoped strictly to this project
    const projMem = await memoryService.createMemory({
      scope: 'project',
      projectId: project.id,
      content: 'Current runtime uses llama.cpp.',
      confidence: 'explicit',
      source: 'user_saved',
    });

    // 4. Active conversation
    const conversation: Conversation = {
      id: 'conv-test-1',
      title: 'Inference Architecture',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modelId: 'smollm2',
      modelName: 'SmolLM2-135M',
      projectId: project.id,
      schemaVersion: 'v1',
      messages: [
        {
          id: 'msg-1',
          conversationId: 'conv-test-1',
          role: 'user',
          parts: [{ type: 'text', content: 'What is the current local backend?' }],
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          conversationId: 'conv-test-1',
          role: 'assistant',
          parts: [{ type: 'text', content: 'The local backend is llama.cpp running on 127.0.0.1.' }],
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      contextSnapshot: {
        modelTokens: null,
        systemTokens: null,
        projectTokens: null,
        memoryTokens: null,
        conversationTokens: null,
        fileTokens: null,
        toolTokens: null,
        userTokens: null,
        totalTokens: null,
        contextLimit: null,
        remainingTokens: null,
        isCalculated: false,
      },
    };

    await conversationStore.create(conversation);

    // 5. Assemble Context
    const userPrompt = 'How should I structure ZaqX inference?';
    const structuredContext = await contextService.prepare({
      conversationId: conversation.id,
      projectId: project.id,
      userPrompt,
      workspaceModelId: 'smollm2',
      workspaceModelName: 'SmolLM2-135M',
      conversationOverride: conversation,
      projectOverride: project,
    });

    // 6. Verify distinct blocks and priorities
    const availableBlocks = structuredContext.blocks.filter((b) => b.isAvailable);
    expect(availableBlocks.length).toBe(6);

    const blockTypeOrder = availableBlocks.map((b) => b.type);
    expect(blockTypeOrder).toEqual([
      'system',
      'current_user',
      'project_instructions',
      'project_memory',
      'user_memory',
      'conversation_history',
    ]);

    // 7. Verify serialized prompt contains all required sections
    const formattedPrompt = ContextBuilder.formatForProvider(structuredContext);
    expect(formattedPrompt).toContain('Global System Instructions');
    expect(formattedPrompt).toContain('Focus on PyTorch and local inference.');
    expect(formattedPrompt).toContain('Current runtime uses llama.cpp.');
    expect(formattedPrompt).toContain('Prefers concise technical explanations.');
    expect(formattedPrompt).toContain('User: How should I structure ZaqX inference?');

    // 8. Verify memory usage tracking was updated
    const updatedUserMem = await memoryService.getMemory(userMem.id);
    expect(updatedUserMem?.usageCount).toBe(1);
    expect(updatedUserMem?.lastUsedAt).not.toBeNull();

    const updatedProjMem = await memoryService.getMemory(projMem.id);
    expect(updatedProjMem?.usageCount).toBe(1);
    expect(updatedProjMem?.lastUsedAt).not.toBeNull();
  });

  it('verifies project deletion lifecycle: deleting project cleans up project memories', async () => {
    // 1. User memory
    const userMem = await memoryService.createMemory({
      scope: 'user',
      content: 'Persistent global preference.',
    });

    // 2. Project
    const project = await projectStore.create({
      name: 'Temp Project',
      instructions: 'Temporary project instructions',
    });

    // 3. Project memory
    const projMem = await memoryService.createMemory({
      scope: 'project',
      projectId: project.id,
      content: 'Temporary project fact',
    });

    // Verify both exist
    expect(await memoryService.getMemory(userMem.id)).not.toBeNull();
    expect(await memoryService.getMemory(projMem.id)).not.toBeNull();

    // 4. Delete project
    await projectStore.delete(project.id);

    // Invariant: Project memories are deleted with project, User memories are kept intact
    expect(await memoryService.getMemory(projMem.id)).toBeNull();
    expect(await memoryService.getMemory(userMem.id)).not.toBeNull();
  });

  it('immediately reflects memory edits and deletions in future context preparation', async () => {
    const mem = await memoryService.createMemory({
      scope: 'user',
      content: 'Original user memory.',
    });

    let context = await contextService.prepare({
      userPrompt: 'Test',
      workspaceModelId: 'smollm2',
      workspaceModelName: 'SmolLM2-135M',
    });
    expect(ContextBuilder.formatForProvider(context)).toContain('Original user memory.');

    // Edit memory
    await memoryService.updateMemory(mem.id, {
      content: 'Updated user memory statement.',
    });

    context = await contextService.prepare({
      userPrompt: 'Test',
      workspaceModelId: 'smollm2',
      workspaceModelName: 'SmolLM2-135M',
    });
    expect(ContextBuilder.formatForProvider(context)).toContain('Updated user memory statement.');
    expect(ContextBuilder.formatForProvider(context)).not.toContain('Original user memory.');

    // Delete memory
    await memoryService.deleteMemory(mem.id);

    context = await contextService.prepare({
      userPrompt: 'Test',
      workspaceModelId: 'smollm2',
      workspaceModelName: 'SmolLM2-135M',
    });
    expect(ContextBuilder.formatForProvider(context)).not.toContain('Updated user memory statement.');
  });
});
