import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageLabStore } from '../services/lab/LocalStorageLabStore';
import { RunRecord, Experiment } from '@nikit/types';

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

describe('LocalStorageLabStore & Bounded Storage Isolation', () => {
  let store: LocalStorageLabStore;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageLabStore();
  });

  it('performs CRUD operations on RunRecord instances', async () => {
    const run: RunRecord = {
      id: 'run-1',
      modelId: 'smollm2',
      modelName: 'SmolLM2-135M',
      providerId: 'llamacpp',
      systemPrompt: 'System',
      userPrompt: 'Test prompt',
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
      },
      status: 'completed',
      output: 'Test output',
      metrics: {
        ttftMs: 45,
        durationMs: 250,
        tokensPerSecond: 60.5,
        metricSource: 'runtime',
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await store.saveRun(run);
    const retrieved = await store.getRun('run-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.output).toBe('Test output');
    expect(retrieved?.metrics?.tokensPerSecond).toBe(60.5);

    const deleted = await store.deleteRun('run-1');
    expect(deleted).toBe(true);
    expect(await store.getRun('run-1')).toBeNull();
  });

  it('enforces bounded context storage: strips rawFullContent when fullContentIncluded is false', async () => {
    const largeRun: RunRecord = {
      id: 'run-large',
      modelId: 'smollm2',
      modelName: 'SmolLM2-135M',
      providerId: 'llamacpp',
      systemPrompt: 'Sys',
      userPrompt: 'User',
      generationConfig: { temperature: 0.7, topP: 0.9 },
      contextSummary: {
        contextConfig: {
          includeUserMemory: false,
          includeProjectInstructions: false,
          includeProjectMemory: false,
          includeRetrievedKnowledge: false,
          includeConversationHistory: false,
        },
        includedBlockIds: ['block-sys', 'block-user'],
        omittedBlockIds: [],
        fullContentIncluded: false,
        rawFullContent: 'Enormous 500,000 character prompt context that should be stripped to save disk space',
      },
      status: 'completed',
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await store.saveRun(largeRun);
    const retrieved = await store.getRun('run-large');
    expect(retrieved?.contextSummary?.fullContentIncluded).toBe(false);
    expect(retrieved?.contextSummary?.rawFullContent).toBeNull();
  });

  it('performs CRUD operations on Experiment containers', async () => {
    const exp: Experiment = {
      id: 'exp-1',
      name: 'KV Cache Sampling Experiment',
      description: 'Testing low-temp sampling',
      systemPrompt: 'System',
      userPrompt: 'User prompt',
      generationConfig: { temperature: 0.2, topP: 0.9 },
      contextConfig: {
        includeUserMemory: false,
        includeProjectInstructions: false,
        includeProjectMemory: false,
        includeRetrievedKnowledge: false,
        includeConversationHistory: false,
      },
      runIds: ['run-1', 'run-2'],
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await store.saveExperiment(exp);
    const retrieved = await store.getExperiment('exp-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('KV Cache Sampling Experiment');
    expect(retrieved?.runIds.length).toBe(2);

    const list = await store.listExperiments();
    expect(list.length).toBe(1);

    await store.deleteExperiment('exp-1');
    expect(await store.getExperiment('exp-1')).toBeNull();
  });
});
