import { describe, it, expect, beforeEach } from 'vitest';
import { ZaqXExportService } from '../services/zaqx/ZaqXExportService';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { CheckpointService } from '../services/training/CheckpointService';
import { LocalStorageTrainingStore } from '../services/training/LocalStorageTrainingStore';

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

describe('ZaqXExportService: Checkpoint Validation, GGUF Metadata & Model Registration', () => {
  let modelRegistry: ModelRegistry;
  let checkpointService: CheckpointService;
  let exportService: ZaqXExportService;

  beforeEach(() => {
    localStorageMock.clear();
    const trainingStore = new LocalStorageTrainingStore();
    checkpointService = new CheckpointService(trainingStore);
    modelRegistry = new ModelRegistry();
    exportService = new ZaqXExportService(modelRegistry);
  });

  it('exports checkpoint to GGUF format and registers runnable model in ModelRegistry', async () => {
    const ckpt = await checkpointService.registerCheckpoint({
      trainingRunId: 'run-001',
      modelId: 'zaqx-dev-tiny-001',
      step: 10,
      path: 'D:/Nikit/models/zaqx/zaqx-step-10.pt',
      sizeBytes: 135000000,
    });

    const artifact = await exportService.exportCheckpoint(ckpt.id, 'gguf');
    expect(artifact.id).toBeDefined();
    expect(artifact.format).toBe('gguf');
    expect(artifact.compatibility.llamacppCompatible).toBe(true);
    expect(artifact.compatibility.kvPairs['general.architecture']).toBe('zaqx');

    const registered = await exportService.registerWithModelRegistry(artifact, 'ZaqX 1.0 Candidate');
    expect(registered.id).toContain('zaqx-');
    expect(registered.local).toBe(true);
    expect(registered.family).toBe('ZaqX');

    const found = modelRegistry.get(registered.id);
    expect(found).toBeDefined();
  });
});
