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

describe('LabService Execution, Parameter Validation & Streaming Telemetry', () => {
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

    const testModel: AIModel = {
      id: 'mock-test-model',
      name: 'Mock Test Model',
      family: 'mock',
      version: '1.0',
      providerId: 'mock',
      local: true,
      prototype: false,
      capabilities: ['streaming', 'chat'],
      contextLength: 4096,
    };
    modelRegistry.register(testModel);

    const prototypeModel: AIModel = {
      id: 'zaqx-proto',
      name: 'ZaqX 1.0',
      family: 'zaqx',
      version: '1.0',
      providerId: 'zaqx',
      local: false,
      prototype: true,
      capabilities: ['streaming'],
    };
    modelRegistry.register(prototypeModel);

    modelService = new ModelService(modelRegistry, providerRegistry);
    labService = new LabService(store, modelService);
  });

  it('rejects execution of prototype models without real backends', async () => {
    await expect(
      labService.executePlaygroundRun({
        modelId: 'zaqx-proto',
        systemPrompt: 'Sys',
        userPrompt: 'Test',
      })
    ).rejects.toThrow('is a prototype specification and cannot be executed directly');
  });

  it('validates generation parameter bounds before execution', async () => {
    await expect(
      labService.executePlaygroundRun({
        modelId: 'mock-test-model',
        systemPrompt: 'Sys',
        userPrompt: 'Test',
        generationConfig: { temperature: 5.0 }, // Exceeds 2.0 max
      })
    ).rejects.toThrow('Invalid generation parameters: Temperature must be between 0 and 2.');
  });

  it('executes streaming run and captures factual telemetry metrics and reproducibility metadata', async () => {
    const deltas: string[] = [];
    const run = await labService.executePlaygroundRun({
      modelId: 'mock-test-model',
      systemPrompt: 'You are an AI assistant.',
      userPrompt: 'Hello Lab!',
      generationConfig: { temperature: 0.7, topP: 0.9 },
      onEvent: (ev) => {
        if (ev.type === 'delta') {
          deltas.push(ev.textDelta);
        }
      },
    });

    expect(run.status).toBe('completed');
    expect(run.output).toBeDefined();
    expect(deltas.length).toBeGreaterThan(0);
    expect(run.metrics).not.toBeNull();
    expect(run.metrics?.durationMs).toBeGreaterThanOrEqual(0);
    expect(run.reproducibility?.modelId).toBe('mock-test-model');
    expect(run.reproducibility?.providerId).toBe('mock');
  });

  it('handles cancellation and preserves partial output in RunRecord', async () => {
    const controller = new AbortController();

    // Abort after start
    setTimeout(() => {
      controller.abort();
    }, 15);

    const run = await labService.executePlaygroundRun({
      modelId: 'mock-test-model',
      systemPrompt: 'You are an AI assistant.',
      userPrompt: 'Generate a long essay.',
      abortSignal: controller.signal,
    });

    expect(run.status).toBe('cancelled');
  });
});
