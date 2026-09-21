import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageLabStore } from '../services/lab/LocalStorageLabStore';
import { LabService } from '../services/lab/LabService';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { ProviderRegistryService } from '../services/providers/ProviderRegistry';
import { ModelService } from '../services/models/ModelService';
import { MockProvider } from '../services/providers/MockProvider';
import { memoryService } from '../services/memory';
import { projectStore } from '../services/projects';
import { AIModel } from '@nikit/types';

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

describe('Lab Context Controls & Explicit Opt-In Isolation', () => {
  let store: LocalStorageLabStore;
  let modelRegistry: ModelRegistry;
  let providerRegistry: ProviderRegistryService;
  let modelService: ModelService;
  let labService: LabService;

  beforeEach(async () => {
    localStorageMock.clear();
    store = new LocalStorageLabStore();
    modelRegistry = new ModelRegistry();
    providerRegistry = new ProviderRegistryService();

    const mockProvider = new MockProvider();
    providerRegistry.register(mockProvider);

    const testModel: AIModel = {
      id: 'test-lab-model',
      name: 'Test Lab Model',
      family: 'test',
      version: '1.0',
      providerId: 'mock',
      local: true,
      prototype: false,
      capabilities: ['streaming', 'chat'],
      contextLength: 2048,
    };
    modelRegistry.register(testModel);

    modelService = new ModelService(modelRegistry, providerRegistry);
    labService = new LabService(store, modelService);

    // Populate user memory and project in background
    await memoryService.createMemory({
      scope: 'user',
      content: 'Prefers Rust and TypeScript.',
    });

    await projectStore.create({
      name: 'Lab Research Project',
      instructions: 'Always use strict type checking.',
    });
  });

  it('defaults all context sources to OFF to avoid corrupting experiments', async () => {
    const run = await labService.executePlaygroundRun({
      modelId: 'test-lab-model',
      systemPrompt: 'System Instruction',
      userPrompt: 'Tell me your coding preferences.',
      // No explicit contextConfig passed -> defaults to all false
    });

    expect(run.contextSummary?.contextConfig.includeUserMemory).toBe(false);
    expect(run.contextSummary?.contextConfig.includeProjectInstructions).toBe(false);
    expect(run.contextSummary?.contextConfig.includeProjectMemory).toBe(false);
  });

  it('injects user memory only when explicitly enabled', async () => {
    const runWithMemory = await labService.executePlaygroundRun({
      modelId: 'test-lab-model',
      systemPrompt: 'System Instruction',
      userPrompt: 'Tell me your coding preferences.',
      contextConfig: {
        includeUserMemory: true,
      },
    });

    expect(runWithMemory.contextSummary?.contextConfig.includeUserMemory).toBe(true);
    expect(runWithMemory.contextSummary?.includedBlockIds).toContain('block-user-memory');
  });
});
