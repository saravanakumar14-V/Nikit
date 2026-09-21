import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageLabStore } from '../services/lab/LocalStorageLabStore';
import { ExperimentService } from '../services/lab/ExperimentService';
import { RunRecord } from '@nikit/types';

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

describe('ExperimentService Workflows, Duplication & Safe Export/Import', () => {
  let store: LocalStorageLabStore;
  let service: ExperimentService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageLabStore();
    service = new ExperimentService(store);
  });

  it('creates, updates, and duplicates experiments with prompt variants', async () => {
    const exp = await service.createExperiment({
      name: 'Temperature Calibration',
      systemPrompt: 'System',
      userPrompt: 'Write a quicksort implementation in TypeScript.',
      generationConfig: { temperature: 0.1, topP: 0.95 },
      tags: ['benchmark', 'code'],
    });

    expect(exp.id).toBeDefined();
    expect(exp.name).toBe('Temperature Calibration');
    expect(exp.generationConfig.temperature).toBe(0.1);

    // Duplicate experiment for high-temperature comparison variant
    const dup = await service.duplicateExperiment(exp.id, 'Temperature Calibration (Temp=0.8)');
    expect(dup.id).not.toBe(exp.id);
    expect(dup.name).toBe('Temperature Calibration (Temp=0.8)');
    expect(dup.userPrompt).toBe(exp.userPrompt);
    expect(dup.tags).toEqual(['benchmark', 'code']);
  });

  it('exports and imports experiments while preserving schema integrity and privacy', async () => {
    const exp = await service.createExperiment({
      name: 'Reasoning Bench',
      systemPrompt: 'Math Assistant',
      userPrompt: 'Solve 2x + 5 = 15',
    });

    const run: RunRecord = {
      id: 'run-101',
      experimentId: exp.id,
      modelId: 'smollm2',
      modelName: 'SmolLM2-135M',
      providerId: 'llamacpp',
      systemPrompt: 'Math Assistant',
      userPrompt: 'Solve 2x + 5 = 15',
      generationConfig: { temperature: 0.2, topP: 0.9 },
      status: 'completed',
      output: 'x = 5',
      metrics: {
        ttftMs: 25,
        durationMs: 120,
        tokensPerSecond: 45.2,
        metricSource: 'runtime',
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await store.saveRun(run);

    // Export
    const exported = await service.exportExperiment(exp.id);
    expect(exported.exportVersion).toBe('nikit-lab-v1');
    expect(exported.experiment.name).toBe('Reasoning Bench');
    expect(exported.runs.length).toBe(1);

    // Clear store to simulate importing on a fresh workstation
    localStorageMock.clear();
    const freshStore = new LocalStorageLabStore();
    const freshService = new ExperimentService(freshStore);

    const imported = await freshService.importExperiment(exported);
    expect(imported.experiment.name).toContain('Reasoning Bench');
    expect(imported.runs.length).toBe(1);
    expect(imported.runs[0].output).toBe('x = 5');
  });

  it('rejects invalid export payloads on import', async () => {
    await expect(service.importExperiment(null)).rejects.toThrow('Invalid export data format.');
    await expect(
      service.importExperiment({ exportVersion: 'unsupported-v99' })
    ).rejects.toThrow('Unsupported experiment export version');
  });
});
