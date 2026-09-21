import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataStore } from '../services/data/LocalStorageDataStore';
import { DatasetService } from '../services/data/DatasetService';
import { LocalStorageEvaluationStore } from '../services/evaluation/LocalStorageEvaluationStore';
import { EvaluationRunnerService } from '../services/evaluation/EvaluationRunnerService';
import { LocalStorageTrainingStore } from '../services/training/LocalStorageTrainingStore';
import { TrainingService } from '../services/training/TrainingService';
import { CheckpointService } from '../services/training/CheckpointService';
import { TokenizerRegistry } from '../services/tokenization/TokenizerRegistry';
import { TokenAnalysisService } from '../services/tokenization/TokenAnalysisService';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { ProviderRegistryService } from '../services/providers/ProviderRegistry';
import { ModelService } from '../services/models/ModelService';
import { MockProvider } from '../services/providers/MockProvider';
import { DEFAULT_TRAINING_CONFIG } from '../services/training/types';
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

describe('Phase 10 Acceptance Test: Full Model Development Workstation Lifecycle', () => {
  let dataStore: LocalStorageDataStore;
  let datasetService: DatasetService;
  let evalStore: LocalStorageEvaluationStore;
  let evalRunner: EvaluationRunnerService;
  let trainingStore: LocalStorageTrainingStore;
  let trainingService: TrainingService;
  let checkpointService: CheckpointService;
  let tokenizerRegistry: TokenizerRegistry;
  let modelRegistry: ModelRegistry;
  let providerRegistry: ProviderRegistryService;
  let modelService: ModelService;

  beforeEach(() => {
    localStorageMock.clear();
    dataStore = new LocalStorageDataStore();
    datasetService = new DatasetService(dataStore);

    evalStore = new LocalStorageEvaluationStore();
    modelRegistry = new ModelRegistry();
    providerRegistry = new ProviderRegistryService();

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

    modelService = new ModelService(modelRegistry, providerRegistry);
    evalRunner = new EvaluationRunnerService(evalStore, modelService);

    trainingStore = new LocalStorageTrainingStore();
    trainingService = new TrainingService(trainingStore);
    checkpointService = new CheckpointService(trainingStore);
    tokenizerRegistry = new TokenizerRegistry();
  });

  it('executes full development pipeline: Ingest Dataset -> Validate -> Version -> Analyze -> Evaluate -> Feasibility -> Checkpoint -> Persistence', async () => {
    const rawFixture = `{"prompt":"What is KV cache in transformers?","response":"KV cache stores previously computed Key and Value projection states during autoregressive decoding to avoid quadratic recomputation."}
{"prompt":"Explain multi-head latent attention.","response":"Multi-head latent attention compresses Key-Value tensors into a shared low-rank latent representation to reduce memory bandwidth."}
{"prompt":"Write a TypeScript function to check if a number is prime.","response":"export function isPrime(n: number): boolean { return n > 1; }"}
{"prompt":"What is gradient checkpointing?","response":"Gradient checkpointing trades additional forward computation for reduced activation memory during backpropagation."}
{"prompt":"Define temperature in autoregressive sampling.","response":"Temperature scales logits before softmax to modulate randomness; lower values yield deterministic outputs."}`;

    // 1. Ingest and Version Dataset
    const { dataset, version } = await datasetService.ingestDataset({
      name: 'Phase 10 Benchmark Fixture',
      format: 'jsonl',
      rawContent: rawFixture,
      tags: ['benchmark', 'phase10'],
    });

    expect(dataset.id).toBeDefined();
    expect(version.recordCount).toBe(5);
    expect(version.statistics.duplicateCount).toBe(0);
    expect(version.statistics.leakageCount).toBe(0);

    // 2. Token Analysis using TokenizerRegistry (offline heuristic analysis)
    const tokenizer = tokenizerRegistry.get('heuristic-analyzer')!;
    expect(tokenizer.isAuthoritative).toBe(false);
    const records = await datasetService.getRecords({ datasetVersionId: version.id });
    const distribution = await TokenAnalysisService.analyzeSequenceLengths(records, tokenizer, 2048);
    expect(distribution.minTokens).toBeGreaterThan(0);
    expect(distribution.withinLimitPercentage).toBe(100);

    const packing = await TokenAnalysisService.analyzePacking(records, tokenizer, 2048);
    expect(packing.truncationRate).toBe(0);

    // 3. Evaluation Suite Execution
    const suite = await evalRunner.createSuite({
      name: 'LLM Mechanics Evaluation',
      category: 'Reasoning',
    });

    await evalRunner.createCase({
      suiteId: suite.id,
      prompt: 'Define temperature in sampling.',
      expectedOutput: 'modulate randomness',
    });

    const evalRun = await evalRunner.runEvaluation({
      suiteId: suite.id,
      modelId: 'smollm2',
    });

    expect(evalRun.id).toBeDefined();
    expect(evalRun.caseResults.length).toBe(1);
    expect(evalRun.caseResults[0].metrics.length).toBeGreaterThan(0);

    // 4. Training Feasibility & Configuration
    const trainingConfig = {
      ...DEFAULT_TRAINING_CONFIG,
      datasetVersionId: version.id,
      modelId: 'smollm2',
      contextLength: 2048,
    };

    const feasibility = await trainingService.checkFeasibility(trainingConfig);
    expect(feasibility.estimatedVramMb).toBeGreaterThan(0);

    // 5. Training Lifecycle & Checkpoint Registration
    const run = await trainingService.createTrainingRun('SmolLM2 Experiment Run', trainingConfig);
    expect(run.status).toBe('ready');

    const running = await trainingService.startRun(run.id);
    expect(running.status).toBe('running');

    const ckpt = await checkpointService.registerCheckpoint({
      trainingRunId: run.id,
      modelId: 'smollm2',
      step: 500,
      epoch: 2,
      path: 'D:/Nikit/checkpoints/smollm2-step500.bin',
      sizeBytes: 135000000,
    });

    expect(ckpt.id).toBeDefined();

    // 6. Resume Metadata Validation
    const resume = await checkpointService.buildResumeMetadata(run, ckpt.id);
    expect(resume.isVerified).toBe(true);
    expect(resume.step).toBe(500);

    // 7. Verify Persistence
    const reloadedDataStore = new LocalStorageDataStore();
    const persistedDataset = await reloadedDataStore.getDataset(dataset.id);
    expect(persistedDataset).not.toBeNull();
    expect(persistedDataset?.versionIds.length).toBe(1);

    const reloadedTrainingStore = new LocalStorageTrainingStore();
    const persistedCheckpoints = await reloadedTrainingStore.listCheckpoints({ trainingRunId: run.id });
    expect(persistedCheckpoints.length).toBe(1);
  }, 15000);
});
