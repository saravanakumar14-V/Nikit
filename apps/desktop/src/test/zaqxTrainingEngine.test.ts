import { describe, it, expect, beforeEach } from 'vitest';
import { ZaqXTrainingEngine } from '../services/zaqx/ZaqXTrainingEngine';
import { LocalStorageTrainingStore } from '../services/training/LocalStorageTrainingStore';
import { CheckpointService } from '../services/training/CheckpointService';
import { LocalStorageDataStore } from '../services/data/LocalStorageDataStore';
import { DatasetService } from '../services/data/DatasetService';
import { TrainingRun, TrainingEvent } from '@nikit/types';
import { DEFAULT_TRAINING_CONFIG } from '../services/training/types';

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

describe('ZaqXTrainingEngine: Training Lifecycle, Real Loss Tracking & Checkpointing', () => {
  let trainingStore: LocalStorageTrainingStore;
  let checkpointService: CheckpointService;
  let datasetService: DatasetService;
  let engine: ZaqXTrainingEngine;
  let datasetVersionId: string;

  beforeEach(async () => {
    localStorageMock.clear();
    trainingStore = new LocalStorageTrainingStore();
    checkpointService = new CheckpointService(trainingStore);
    const dataStore = new LocalStorageDataStore();
    datasetService = new DatasetService(dataStore);

    const { version } = await datasetService.ingestDataset({
      name: 'ZaqX Micro Pre-Training Dataset',
      format: 'jsonl',
      rawContent: '{"prompt":"A","response":"B"}\n{"prompt":"C","response":"D"}',
    });
    datasetVersionId = version.id;

    engine = new ZaqXTrainingEngine(trainingStore, checkpointService);
  });

  it('executes real training loop, records measured loss, and generates step checkpoints', async () => {
    const emittedEvents: TrainingEvent[] = [];
    const unsubscribe = engine.onEvent((event) => {
      emittedEvents.push(event);
    });

    const run: TrainingRun = {
      id: 'run-zaqx-test-01',
      name: 'ZaqX Tiny Test Run',
      modelId: 'zaqx-dev-tiny-001',
      datasetVersionId,
      tokenizerId: 'tokenizer-zaqx',
      config: {
        ...DEFAULT_TRAINING_CONFIG,
        modelId: 'zaqx-dev-tiny-001',
        datasetVersionId,
        maxSteps: 4,
        checkpointInterval: 2,
      },
      status: 'ready',
      currentStep: 0,
      totalSteps: 4,
      currentEpoch: 1,
      totalEpochs: 1,
      checkpointIds: [],
      isSimulation: false,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await engine.start(run);

    expect(run.status).toBe('completed');
    expect(run.currentStep).toBe(4);
    expect(run.loss).toBeDefined();
    expect(typeof run.loss).toBe('number');
    expect(run.checkpointIds.length).toBeGreaterThanOrEqual(2);

    const stepEvents = emittedEvents.filter((e) => e.type === 'step_completed');
    expect(stepEvents.length).toBe(4);

    const ckptEvents = emittedEvents.filter((e) => e.type === 'checkpoint_created');
    expect(ckptEvents.length).toBeGreaterThanOrEqual(2);

    unsubscribe();
  });
});
