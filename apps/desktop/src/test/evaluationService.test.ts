import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageEvaluationStore } from '../services/evaluation/LocalStorageEvaluationStore';
import { EvaluationMetricsService } from '../services/evaluation/EvaluationMetricsService';
import { EvaluationRunnerService } from '../services/evaluation/EvaluationRunnerService';
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

describe('Evaluation & Benchmark Suite Architecture', () => {
  let store: LocalStorageEvaluationStore;
  let modelRegistry: ModelRegistry;
  let providerRegistry: ProviderRegistryService;
  let modelService: ModelService;
  let runnerService: EvaluationRunnerService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageEvaluationStore();
    modelRegistry = new ModelRegistry();
    providerRegistry = new ProviderRegistryService();

    const mockProvider = new MockProvider();
    providerRegistry.register(mockProvider);

    const testModel: AIModel = {
      id: 'eval-model-test',
      name: 'Eval Test Model',
      family: 'test',
      version: '1.0',
      providerId: 'mock',
      local: true,
      prototype: false,
      capabilities: ['streaming', 'chat'],
    };
    modelRegistry.register(testModel);

    modelService = new ModelService(modelRegistry, providerRegistry);
    runnerService = new EvaluationRunnerService(store, modelService);
  });

  it('evaluates Exact Match, Character Similarity, and Perplexity metrics correctly', () => {
    const exact = EvaluationMetricsService.evaluateExactMatch('Paris', 'Paris');
    expect(exact.score).toBe(1.0);
    expect(exact.isAvailable).toBe(true);

    const mismatch = EvaluationMetricsService.evaluateExactMatch('London', 'Paris');
    expect(mismatch.score).toBe(0.0);

    const charSim = EvaluationMetricsService.evaluateCharSimilarity('Phoenix', 'Phenix');
    expect(charSim.score).toBeGreaterThan(0.5);

    // Perplexity must remain unavailable without valid logprobs
    const perplexityUnavailable = EvaluationMetricsService.evaluatePerplexity(undefined);
    expect(perplexityUnavailable.isAvailable).toBe(false);

    // Perplexity calculation when logprobs are present
    const perplexityValid = EvaluationMetricsService.evaluatePerplexity([-0.2, -0.4, -0.1]);
    expect(perplexityValid.isAvailable).toBe(true);
    expect(perplexityValid.score).toBeGreaterThan(1.0);
  });

  it('runs an EvaluationSuite against a model and produces reproducible EvaluationRun record', async () => {
    const suite = await runnerService.createSuite({
      name: 'Reasoning Test Suite',
      category: 'Reasoning',
    });

    await runnerService.createCase({
      suiteId: suite.id,
      prompt: 'What is 10 + 10?',
      expectedOutput: '20',
    });

    const run = await runnerService.runEvaluation({
      suiteId: suite.id,
      modelId: 'eval-model-test',
    });

    expect(run.id).toBeDefined();
    expect(run.suiteId).toBe(suite.id);
    expect(run.modelId).toBe('eval-model-test');
    expect(run.caseResults.length).toBe(1);
    expect(run.caseResults[0].metrics.length).toBeGreaterThan(0);
  });

  it('generates regression comparison matrix between two evaluation runs', async () => {
    const suites = await store.listSuites();
    const targetSuite = suites[0];

    const runA = await runnerService.runEvaluation({
      suiteId: targetSuite.id,
      modelId: 'eval-model-test',
    });

    const runB = await runnerService.runEvaluation({
      suiteId: targetSuite.id,
      modelId: 'eval-model-test',
    });

    const comparison = await runnerService.compareRuns(runA.id, runB.id);
    expect(comparison.matrix.length).toBe(targetSuite.caseIds.length);
    expect(typeof comparison.accuracyDelta).toBe('number');
  }, 15000);
});
