import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataStore } from '../services/data/LocalStorageDataStore';
import { DatasetService } from '../services/data/DatasetService';
import { TokenizerRegistry } from '../services/tokenization/TokenizerRegistry';
import { LocalStorageEvaluationStore } from '../services/evaluation/LocalStorageEvaluationStore';
import { EvaluationRunnerService } from '../services/evaluation/EvaluationRunnerService';
import { LocalStorageTrainingStore } from '../services/training/LocalStorageTrainingStore';
import { TrainingService } from '../services/training/TrainingService';
import { CheckpointService } from '../services/training/CheckpointService';
import { ModelDevelopmentService } from '../services/dev/ModelDevelopmentService';
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

describe('ModelDevelopmentService: Independent Workflow Orchestration', () => {
  let datasetService: DatasetService;
  let tokenizerRegistry: TokenizerRegistry;
  let evalRunner: EvaluationRunnerService;
  let trainingService: TrainingService;
  let checkpointService: CheckpointService;
  let devService: ModelDevelopmentService;

  beforeEach(() => {
    localStorageMock.clear();
    const dataStore = new LocalStorageDataStore();
    datasetService = new DatasetService(dataStore);

    const evalStore = new LocalStorageEvaluationStore();
    const modelRegistry = new ModelRegistry();
    const providerRegistry = new ProviderRegistryService();

    const mockProvider = new MockProvider();
    providerRegistry.register(mockProvider);

    const testModel: AIModel = {
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
    modelRegistry.register(testModel);

    const modelService = new ModelService(modelRegistry, providerRegistry);
    evalRunner = new EvaluationRunnerService(evalStore, modelService);

    const trainingStore = new LocalStorageTrainingStore();
    trainingService = new TrainingService(trainingStore);
    checkpointService = new CheckpointService(trainingStore);
    tokenizerRegistry = new TokenizerRegistry();

    devService = new ModelDevelopmentService(
      datasetService,
      tokenizerRegistry,
      evalRunner,
      trainingService,
      checkpointService
    );
  });

  it('orchestrates independent workflows without strict chain coupling', async () => {
    // 1. Ingest Dataset
    const { version } = await datasetService.ingestDataset({
      name: 'Orchestration Test Dataset',
      format: 'jsonl',
      rawContent: '{"prompt":"Q1","response":"A1"}\n{"prompt":"Q2","response":"A2"}',
    });

    // 2. Workflow: Dataset -> Token Analysis (using offline heuristic analyzer)
    const analysis = await devService.analyzeDataset(version.id, 'heuristic-model');
    expect(analysis.distribution.minTokens).toBeGreaterThan(0);
    expect(analysis.packing.targetContextLength).toBe(2048);

    // 3. Workflow: Training Config & Feasibility
    const trainingPrep = await devService.configureTraining({
      name: 'Candidate Run 001',
      modelId: 'smollm2',
      datasetVersionId: version.id,
      tokenizerId: 'heuristic-analyzer',
    });
    expect(trainingPrep.trainingRun.id).toBeDefined();
    expect(trainingPrep.feasibility.estimatedVramMb).toBeGreaterThan(0);

    // 4. Workflow: Training Run -> Checkpoint Registration
    const ckpt = await devService.recordCheckpoint(
      trainingPrep.trainingRun.id,
      'smollm2',
      100,
      'D:/Nikit/models/candidate-100.bin',
      135000000
    );
    expect(ckpt.id).toBeDefined();

    // 5. Workflow: Checkpoint -> Evaluation
    const suite = await evalRunner.createSuite({
      name: 'Quick Sanity Suite',
      category: 'General QA',
    });
    await evalRunner.createCase({
      suiteId: suite.id,
      prompt: 'Hello',
      expectedOutput: 'Hello',
    });

    const evalRun = await devService.evaluateCheckpoint(ckpt.id, suite.id);
    expect(evalRun.id).toBeDefined();
    expect(evalRun.modelId).toBe('smollm2');
  });
});
