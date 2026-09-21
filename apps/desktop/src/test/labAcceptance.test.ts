import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageLabStore } from '../services/lab/LocalStorageLabStore';
import { LabService } from '../services/lab/LabService';
import { ExperimentService } from '../services/lab/ExperimentService';
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

describe('Phase 9 Acceptance Test: Full LLM Lab & Model Playground Lifecycle', () => {
  let store: LocalStorageLabStore;
  let modelRegistry: ModelRegistry;
  let providerRegistry: ProviderRegistryService;
  let modelService: ModelService;
  let labService: LabService;
  let experimentService: ExperimentService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageLabStore();
    modelRegistry = new ModelRegistry();
    providerRegistry = new ProviderRegistryService();

    const mockProvider = new MockProvider();
    providerRegistry.register(mockProvider);

    const smollm2Model: AIModel = {
      id: 'smollm2',
      name: 'SmolLM2-135M',
      family: 'smollm',
      version: '1.0',
      providerId: 'mock',
      local: true,
      prototype: false,
      capabilities: ['streaming', 'chat'],
      contextLength: 2048,
    };
    modelRegistry.register(smollm2Model);

    modelService = new ModelService(modelRegistry, providerRegistry);
    labService = new LabService(store, modelService);
    experimentService = new ExperimentService(store);
  });

  it('executes full research workflow: Playground Run -> Save Run -> Create Experiment -> Export/Import -> Persistence', async () => {
    // 1. Create Experiment
    const exp = await experimentService.createExperiment({
      name: 'KV Cache Sampling Experiment',
      description: 'Testing prompt variation behavior on local model',
      systemPrompt: 'You are a systems engineer.',
      userPrompt: 'Hello Nikit Lab',
      generationConfig: { temperature: 0.3, topP: 0.9 },
    });
    expect(exp.id).toBeDefined();

    // 2. Execute Playground Run attached to Experiment
    const run1 = await labService.executePlaygroundRun({
      modelId: 'smollm2',
      systemPrompt: exp.systemPrompt,
      userPrompt: exp.userPrompt,
      generationConfig: exp.generationConfig,
      experimentId: exp.id,
    });
    expect(run1.status).toBe('completed');
    expect(run1.output).toBeDefined();
    expect(run1.experimentId).toBe(exp.id);

    // 3. Create a parameter variant (higher temperature)
    const run2 = await labService.executePlaygroundRun({
      modelId: 'smollm2',
      systemPrompt: exp.systemPrompt,
      userPrompt: exp.userPrompt,
      generationConfig: { temperature: 0.9, topP: 0.95 },
      experimentId: exp.id,
      runName: 'Variant Temp 0.9',
    });
    expect(run2.status).toBe('completed');

    // 4. Verify runs attached to experiment
    const updatedExp = await experimentService.getExperiment(exp.id);
    expect(updatedExp?.runIds.length).toBe(2);

    // 5. Export Experiment
    const exported = await experimentService.exportExperiment(exp.id);
    expect(exported.exportVersion).toBe('nikit-lab-v1');
    expect(exported.runs.length).toBe(2);

    // 6. Import Experiment on separate store
    const freshStore = new LocalStorageLabStore();
    const freshExperimentService = new ExperimentService(freshStore);
    const imported = await freshExperimentService.importExperiment(exported);

    expect(imported.experiment.name).toContain('KV Cache Sampling Experiment');
    expect(imported.runs.length).toBe(2);

    // 7. Verify persistence across store re-instantiations
    const reloadedStore = new LocalStorageLabStore();
    const persistedRuns = await reloadedStore.listRuns({ experimentId: imported.experiment.id });
    expect(persistedRuns.length).toBe(2);
  }, 15000);
});
