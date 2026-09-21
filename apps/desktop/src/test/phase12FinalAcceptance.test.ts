import { describe, it, expect, beforeEach } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';
import { DatasetService } from '../services/data/DatasetService';
import { LocalStorageDataStore } from '../services/data/LocalStorageDataStore';
import { ZAQX_SCALING_PRESETS } from '@nikit/zaqx';

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

describe('Phase 12 Final Acceptance Protocol: Complete ZaqX Production Lifecycle', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('executes full end-to-end ZaqX production lifecycle: Corpus Validation -> Training -> Checkpoint -> GGUF Export -> Manifest -> Health Check -> Model Registration', async () => {
    // 1. Dataset Ingestion
    const dataStore = new LocalStorageDataStore();
    const dsService = new DatasetService(dataStore);
    const { version } = await dsService.ingestDataset({
      name: 'ZaqX 1.0 Production Corpus',
      description: 'Golden pre-training dataset for ZaqX 1.0',
      format: 'jsonl',
      rawContent: JSON.stringify({
        text: 'Attention is all you need for ZaqX neural language models.',
      }) + '\n' + JSON.stringify({
        text: 'Grouped-query attention reduces memory bandwidth during auto-regressive generation.',
      }) + '\n' + JSON.stringify({
        text: 'Root mean square normalization stabilizes pre-training gradient propagation.',
      }),
    });
    expect(version.versionNumber).toBe(1);

    // 2. Tokenizer Corpus Validation
    const corpusTexts = [
      'Attention is all you need for ZaqX neural language models.',
      'Grouped-query attention reduces memory bandwidth during auto-regressive generation.',
      'Root mean square normalization stabilizes pre-training gradient propagation.',
    ];
    const corpusStats = await zaqxService.validateCorpus(corpusTexts, 1024);
    expect(corpusStats.totalSamples).toBe(3);
    expect(corpusStats.totalTokens).toBeGreaterThan(20);
    expect(corpusStats.vocabCoveragePercent).toBeGreaterThan(0);
    expect(corpusStats.specialTokensValid).toBe(true);
    expect(corpusStats.tokenizerHash).toBeDefined();

    // 3. Create Candidate with Config
    const candidate = await zaqxService.createCandidate({
      name: 'ZaqX 1.0 Candidate',
      scale: 'experimental-tiny',
      config: ZAQX_SCALING_PRESETS['experimental-tiny'],
    });
    expect(candidate.status).toBe('experimental');

    // 4. Hardware Feasibility
    const scaling = await zaqxService.evaluateCustomConfig(candidate.config);
    expect(scaling.parameters.totalParams).toBe(5401856);
    expect(scaling.estimatedWeightsMb).toBeGreaterThan(0);

    // 5. Training Run & Checkpoint
    const run = await zaqxService.launchTraining({
      candidateId: candidate.id,
      datasetVersionId: version.id,
      maxSteps: 5,
      batchSize: 1,
      learningRate: 0.001,
    });
    expect(run.status).toBe('completed');
    expect(run.currentStep).toBeGreaterThan(0);
    expect(run.checkpointIds.length).toBeGreaterThan(0);

    // 6. GGUF Export & Registration
    const activeCheckpointId = run.checkpointIds[run.checkpointIds.length - 1];
    const { artifact, model } = await zaqxService.exportAndRegister(
      activeCheckpointId,
      candidate.name
    );
    expect(artifact.format).toBe('gguf');
    expect(artifact.compatibility.llamacppCompatible).toBe(true);
    expect(artifact.compatibility.tensorCount).toBe(57);
    expect(model.id).toMatch(/^zaqx-/);
    expect(model.runtimeEngine).toBe('llama.cpp');

    // 7. Machine-Readable Manifest
    const manifest = await zaqxService.exportManifest(candidate.id);
    expect(manifest.schemaVersion).toBe('v1');
    expect(manifest.architecture).toBe('zaqx');
    expect(manifest.tokenizerHash).toBeDefined();
    expect(manifest.checkpointHash).toBe(artifact.fileHash);

    // 8. Health Check
    const health = await zaqxService.getHealthReport();
    expect(['healthy', 'degraded']).toContain(health.status);
    expect(health.checks.tokenizerCompatibility).toBe(true);
    expect(health.checks.modelAvailability).toBe(true);

    // 9. Model Promotion
    const promoted = await zaqxService.promoteCandidate(candidate.id, 'candidate');
    expect(promoted.status).toBe('candidate');
  });
});
