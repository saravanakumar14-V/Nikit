import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageLabStore } from '../services/lab/LocalStorageLabStore';
import { LabService } from '../services/lab/LabService';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { ProviderRegistryService } from '../services/providers/ProviderRegistry';
import { ModelService } from '../services/models/ModelService';
import { MockProvider } from '../services/providers/MockProvider';
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

describe('Model Comparison & Sequential Execution Constraint', () => {
  let store: LocalStorageLabStore;
  let modelRegistry: ModelRegistry;
  let providerRegistry: ProviderRegistryService;
  let modelService: ModelService;
  let labService: LabService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageLabStore();
    modelRegistry = new ModelRegistry();
    providerRegistry = new ProviderRegistryService();

    const mockProvider = new MockProvider();
    providerRegistry.register(mockProvider);

    const modelA: AIModel = {
      id: 'model-a',
      name: 'Model Alpha',
      family: 'alpha',
      version: '1.0',
      providerId: 'mock',
      local: true,
      prototype: false,
      capabilities: ['streaming', 'chat'],
    };

    const modelB: AIModel = {
      id: 'model-b',
      name: 'Model Beta',
      family: 'beta',
      version: '1.0',
      providerId: 'mock',
      local: true,
      prototype: false,
      capabilities: ['streaming', 'chat'],
    };

    modelRegistry.register(modelA);
    modelRegistry.register(modelB);

    modelService = new ModelService(modelRegistry, providerRegistry);
    labService = new LabService(store, modelService);
  });

  it('runs sequential comparison on identical prompts without dual runtime residency', async () => {
    const progressEvents: Array<{ modelId: string; status: string }> = [];

    const results = await labService.runSequentialComparison({
      modelIds: ['model-a', 'model-b'],
      systemPrompt: 'System Instruction',
      userPrompt: 'Compare tokenization strategies.',
      generationConfig: { temperature: 0.5, topP: 0.9 },
      onProgress: (modelId, status) => {
        progressEvents.push({ modelId, status });
      },
    });

    expect(results.length).toBe(2);
    expect(results[0].modelId).toBe('model-a');
    expect(results[1].modelId).toBe('model-b');
    expect(results[0].systemPrompt).toBe(results[1].systemPrompt);
    expect(results[0].userPrompt).toBe(results[1].userPrompt);

    // Verify sequential execution progression
    const modelAIndices = progressEvents
      .map((e, idx) => (e.modelId === 'model-a' ? idx : -1))
      .filter((idx) => idx !== -1);
    const modelBIndices = progressEvents
      .map((e, idx) => (e.modelId === 'model-b' ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(Math.max(...modelAIndices)).toBeLessThan(Math.min(...modelBIndices));
  }, 15000);
});
