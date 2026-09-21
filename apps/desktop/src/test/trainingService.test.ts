import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageTrainingStore } from '../services/training/LocalStorageTrainingStore';
import { TrainingService } from '../services/training/TrainingService';
import { CheckpointService } from '../services/training/CheckpointService';
import { ResourceFeasibilityChecker } from '../services/training/ResourceFeasibilityChecker';
import { DEFAULT_TRAINING_CONFIG } from '../services/training/types';
import { TrainingConfiguration } from '@nikit/types';

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

describe('Training Infrastructure, Resource Feasibility & Checkpoint Lifecycle', () => {
  let store: LocalStorageTrainingStore;
  let service: TrainingService;
  let checkpointService: CheckpointService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageTrainingStore();
    service = new TrainingService(store);
    checkpointService = new CheckpointService(store);
  });

  it('evaluates hardware resource feasibility without fabricating peak memory', async () => {
    const config: TrainingConfiguration = {
      ...DEFAULT_TRAINING_CONFIG,
      modelId: 'smollm2',
      datasetVersionId: 'dsv-1',
      contextLength: 2048,
      microBatchSize: 1,
    };

    const report = await ResourceFeasibilityChecker.evaluate(config);
    expect(['likely_fit', 'possibly_constrained', 'likely_insufficient', 'unknown']).toContain(
      report.feasibility
    );
    expect(report.estimatedVramMb).toBeGreaterThan(0);
  });

  it('creates and manages training run lifecycle state transitions', async () => {
    const config: TrainingConfiguration = {
      ...DEFAULT_TRAINING_CONFIG,
      datasetVersionId: 'dsv-101',
    };

    const run = await service.createTrainingRun('SmolLM2 Fine-Tuning Run', config);
    expect(run.id).toBeDefined();
    expect(run.status).toBe('ready');
    expect(run.isSimulation).toBe(true);
    expect(run.simulationNotice).toContain('Simulation / Development Only');

    // Start
    const started = await service.startRun(run.id);
    expect(started.status).toBe('running');

    // Pause
    const paused = await service.pauseRun(run.id);
    expect(paused.status).toBe('paused');

    // Resume
    const resumed = await service.resumeRun(run.id);
    expect(resumed.status).toBe('running');

    // Cancel
    const cancelled = await service.cancelRun(run.id);
    expect(cancelled.status).toBe('cancelled');
  });

  it('registers checkpoints and generates validated resume metadata', async () => {
    const config: TrainingConfiguration = {
      ...DEFAULT_TRAINING_CONFIG,
      datasetVersionId: 'dsv-202',
    };
    const run = await service.createTrainingRun('Checkpoint Test Run', config);

    const ckpt = await checkpointService.registerCheckpoint({
      trainingRunId: run.id,
      modelId: run.modelId,
      step: 250,
      epoch: 1,
      path: 'D:/Nikit/checkpoints/ckpt-250.bin',
      sizeBytes: 135000000,
    });

    expect(ckpt.id).toBeDefined();
    expect(ckpt.step).toBe(250);

    const resumeMeta = await checkpointService.buildResumeMetadata(run, ckpt.id);
    expect(resumeMeta.isVerified).toBe(true);
    expect(resumeMeta.step).toBe(250);
    expect(resumeMeta.datasetVersionId).toBe('dsv-202');
  });
});
