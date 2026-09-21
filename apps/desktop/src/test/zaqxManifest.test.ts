import { describe, it, expect } from 'vitest';
import { zaqxExportService } from '../services/zaqx/ZaqXExportService';
import { checkpointService } from '../services/training/CheckpointService';

describe('ZaqXManifest: Machine-Readable Provenance & Identity Record', () => {
  it('generates authoritative zaqx-artifact.json manifest with immutable hashes', async () => {
    const ckpt = await checkpointService.registerCheckpoint({
      trainingRunId: 'run-zaqx-candidate-001',
      modelId: 'zaqx-dev-001',
      step: 500,
      epoch: 2,
      path: 'D:/Nikit/models/zaqx/zaqx_candidate.pt',
      sizeBytes: 64893869,
    });

    const exportArtifact = await zaqxExportService.exportCheckpoint(ckpt.id, 'gguf');
    const manifest = zaqxExportService.generateManifest(
      exportArtifact,
      'candidate',
      'tok-zaqx-v1-validated',
      'ds-zaqx-pretrain-v1'
    );

    expect(manifest.schemaVersion).toBe('v1');
    expect(manifest.modelId).toBe('zaqx-dev-001');
    expect(manifest.architecture).toBe('zaqx');
    expect(manifest.configHash).toMatch(/^[a-f0-9]+$/);
    expect(manifest.tokenizerHash).toBe('tok-zaqx-v1-validated');
    expect(manifest.datasetHash).toBe('ds-zaqx-pretrain-v1');
    expect(manifest.checkpointHash).toBe(exportArtifact.fileHash);
    expect(manifest.ggufHash).toBe(exportArtifact.fileHash);
    expect(manifest.converterVersion).toBe('gguf-0.19.0');
    expect(manifest.llamaCppVersion).toBe('b4700');
    expect(manifest.promotionStatus).toBe('candidate');
    expect(manifest.metadata.totalParams).toBe(5401856);
  });
});
