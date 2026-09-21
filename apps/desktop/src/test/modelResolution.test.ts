import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { ProviderRegistryService } from '../services/providers/ProviderRegistry';
import { ModelResolutionService } from '../services/models/ModelResolutionService';
import { ModelResolutionError } from '../services/models/types';
import { LocalStorageConversationStore } from '../services/storage/LocalStorageConversationStore';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { AIModel } from '@nikit/types';

// In-memory mock for localStorage
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

describe('ModelResolutionService & 3-Tier Precedence', () => {
  let modelRegistry: ModelRegistry;
  let providerRegistry: ProviderRegistryService;
  let resolutionService: ModelResolutionService;
  let conversationStore: LocalStorageConversationStore;
  let projectStore: LocalStorageProjectStore;

  const modelA: AIModel = {
    id: 'model-a',
    name: 'Workspace Model A',
    family: 'FamilyA',
    version: '1.0',
    providerId: 'mock',
    capabilities: ['chat', 'streaming'],
    local: true,
    prototype: false,
  };

  const modelB: AIModel = {
    id: 'model-b',
    name: 'Project Model B',
    family: 'FamilyB',
    version: '1.0',
    providerId: 'mock',
    capabilities: ['chat', 'streaming'],
    local: true,
    prototype: false,
  };

  const modelC: AIModel = {
    id: 'model-c',
    name: 'Conversation Model C',
    family: 'FamilyC',
    version: '1.0',
    providerId: 'mock',
    capabilities: ['chat', 'streaming'],
    local: true,
    prototype: false,
  };

  beforeEach(() => {
    localStorageMock.clear();
    modelRegistry = new ModelRegistry();
    providerRegistry = new ProviderRegistryService();
    resolutionService = new ModelResolutionService(modelRegistry, providerRegistry);
    conversationStore = new LocalStorageConversationStore();
    projectStore = new LocalStorageProjectStore();

    modelRegistry.register(modelA, 'ready');
    modelRegistry.register(modelB, 'ready');
    modelRegistry.register(modelC, 'ready');
  });

  it('CRITICAL TEST: Resolves 3-tier hierarchy: Workspace -> Project -> Conversation', async () => {
    // 1. Create Project with defaultModelId = Model B
    const project = await projectStore.create({
      id: 'proj-test-1',
      name: 'Test Project',
      defaultModelId: 'model-b',
      defaultModelName: 'Project Model B',
    });

    // 2. Create Conversation with modelId = Model C
    const conv = await conversationStore.create({
      id: 'conv-test-1',
      title: 'Test Conversation',
      projectId: project.id,
      modelId: 'model-c',
      modelName: 'Conversation Model C',
    });

    // Scenario 1: All three exist (Workspace=A, Project=B, Conversation=C) -> Resolved = C
    const res1 = await resolutionService.resolve({
      conversationId: conv.id,
      projectId: project.id,
      workspaceDefaultModelId: 'model-a',
    });
    expect(res1.model.id).toBe('model-c');
    expect(res1.resolvedSource).toBe('conversation_override');

    // Scenario 2: Remove Conversation override (modelId = undefined) -> Resolved = B
    await conversationStore.update(conv.id, { modelId: undefined });
    const res2 = await resolutionService.resolve({
      conversationId: conv.id,
      projectId: project.id,
      workspaceDefaultModelId: 'model-a',
    });
    expect(res2.model.id).toBe('model-b');
    expect(res2.resolvedSource).toBe('project_default');

    // Scenario 3: Remove Project override (defaultModelId = '') -> Resolved = A
    await projectStore.update(project.id, { defaultModelId: '' });
    const res3 = await resolutionService.resolve({
      conversationId: conv.id,
      projectId: project.id,
      workspaceDefaultModelId: 'model-a',
    });
    expect(res3.model.id).toBe('model-a');
    expect(res3.resolvedSource).toBe('workspace_default');
  });

  it('INVARIANT: NO SILENT FALLBACK when selected model is unavailable', async () => {
    // ZaqX 1.0 is pre-registered with status unavailable
    await expect(
      resolutionService.resolve({
        explicitModelId: 'zaqx-1.0',
      })
    ).rejects.toThrow(ModelResolutionError);

    try {
      await resolutionService.resolve({ explicitModelId: 'zaqx-1.0' });
    } catch (err: unknown) {
      const modelError = err as ModelResolutionError;
      expect(modelError.code).toBe('MODEL_UNAVAILABLE');
      expect(modelError.modelId).toBe('zaqx-1.0');
    }
  });

  it('INVARIANT: Throws MODEL_NOT_FOUND error for non-existent models', async () => {
    await expect(
      resolutionService.resolve({
        explicitModelId: 'non-existent-gpt-99',
      })
    ).rejects.toThrow(ModelResolutionError);

    try {
      await resolutionService.resolve({ explicitModelId: 'non-existent-gpt-99' });
    } catch (err: unknown) {
      const modelError = err as ModelResolutionError;
      expect(modelError.code).toBe('MODEL_NOT_FOUND');
    }
  });

  it('INVARIANT: Throws CAPABILITY_UNSUPPORTED when model lacks requested capability', async () => {
    // modelA only supports chat and streaming, lacks vision
    await expect(
      resolutionService.resolve({
        explicitModelId: 'model-a',
        requiredCapability: 'vision',
      })
    ).rejects.toThrow(ModelResolutionError);

    try {
      await resolutionService.resolve({
        explicitModelId: 'model-a',
        requiredCapability: 'vision',
      });
    } catch (err: unknown) {
      const modelError = err as ModelResolutionError;
      expect(modelError.code).toBe('CAPABILITY_UNSUPPORTED');
    }
  });
});
