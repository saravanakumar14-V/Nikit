import { describe, it, expect, beforeEach } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';
import { DatasetService } from '../services/data/DatasetService';
import { LocalStorageDataStore } from '../services/data/LocalStorageDataStore';
import { zaqxTokenizer } from '../services/zaqx/ZaqXTokenizerService';
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

describe('Phase 11 Acceptance Protocol: Full ZaqX 1.0 Model Development Loop', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('executes full end-to-end ZaqX model development lifecycle', async () => {
    // 1. Ingest Dataset
    const dataStore = new LocalStorageDataStore();
    const dsService = new DatasetService(dataStore);
    const { version } = await dsService.ingestDataset({
      name: 'ZaqX 1.0 Pre-Training Corpus',
      format: 'jsonl',
      rawContent:
        '{"prompt":"What is ZaqX?","response":"ZaqX is a modern decoder-only language model."}\n' +
        '{"prompt":"Define GQA","response":"Grouped Query Attention shares key-value heads."}',
    });
    expect(version.id).toBeDefined();

    // 2. Tokenize with ZaqX Native Tokenizer
    const sampleText = 'ZaqX language model pre-training run.';
    const tokenResult = await zaqxTokenizer.tokenize(sampleText);
    expect(tokenResult.isAuthoritative).toBe(true);
    expect(tokenResult.tokenCount).toBeGreaterThan(0);
    const decoded = await zaqxTokenizer.decode(tokenResult.tokenIds);
    expect(decoded).toBe(sampleText);

    // 3. Create ZaqX Candidate
    const candidate = await zaqxService.createCandidate({
      name: 'ZaqX 1.0 Experimental Tiny Candidate',
      scale: 'experimental-tiny',
      config: ZAQX_SCALING_PRESETS['experimental-tiny'],
    });
    expect(candidate.id).toBeDefined();
    expect(candidate.status).toBe('experimental');

    // 4. Feasibility Check
    const scaling = await zaqxService.evaluateCustomConfig(candidate.config);
    expect(scaling.parameters.totalParams).toBeGreaterThan(4_000_000);
    expect(scaling.estimatedWeightsMb).toBeGreaterThan(0);

    // 5. Execute Training Loop
    const run = await zaqxService.launchTraining({
      candidateId: candidate.id,
      datasetVersionId: version.id,
      maxSteps: 4,
      learningRate: 0.001,
    });
    expect(run.status).toBe('completed');
    expect(run.currentStep).toBe(4);
    expect(run.loss).toBeDefined();
    expect(run.checkpointIds.length).toBeGreaterThan(0);

    // 6. Promote Candidate
    const promoted = await zaqxService.promoteCandidate(candidate.id, 'candidate');
    expect(promoted.status).toBe('candidate');

    // 7. Generate Verified Model Card
    const modelCard = await zaqxService.generateModelCard(candidate.id);
    expect(modelCard.modelId).toBe(candidate.id);
    expect(modelCard.promotionStatus).toBe('candidate');
    expect(modelCard.parameters.totalParams).toBe(scaling.parameters.totalParams);
    expect(modelCard.contextLength).toBe(1024);

    // 8. Export to GGUF and Register with ModelRegistry
    const ckptId = run.checkpointIds[0];
    const { artifact, model } = await zaqxService.exportAndRegister(ckptId, candidate.name);
    expect(artifact.format).toBe('gguf');
    expect(artifact.compatibility.llamacppCompatible).toBe(true);
    expect(model.id).toBeDefined();
    expect(model.local).toBe(true);
  });
});
