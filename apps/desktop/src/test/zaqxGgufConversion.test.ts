import { describe, it, expect } from 'vitest';
import { zaqxExportService } from '../services/zaqx/ZaqXExportService';
import { checkpointService } from '../services/training/CheckpointService';

describe('ZaqXGgufConversion: Structural Integrity & Metadata Verification', () => {
  it('prepares and validates real GGUF export metadata from checkpoint', async () => {
    const ckpt = await checkpointService.registerCheckpoint({
      trainingRunId: 'run-zaqx-tiny-001',
      modelId: 'zaqx-experimental-tiny',
      step: 100,
      epoch: 1,
      path: 'D:/Nikit/models/zaqx/zaqx_tiny_checkpoint.pt',
      sizeBytes: 64893869,
    });

    const exportArtifact = await zaqxExportService.exportCheckpoint(ckpt.id, 'gguf');

    expect(exportArtifact.format).toBe('gguf');
    expect(exportArtifact.path).toMatch(/\.gguf$/);
    expect(exportArtifact.fileHash).toBeDefined();
    expect(exportArtifact.quantization).toBe('F32');
    expect(exportArtifact.isValid).toBe(true);

    expect(exportArtifact.compatibility.llamacppCompatible).toBe(true);
    expect(exportArtifact.compatibility.tensorCount).toBe(57);
    expect(exportArtifact.compatibility.kvPairs['general.architecture']).toBe('zaqx');
    expect(exportArtifact.compatibility.kvPairs['zaqx.context_length']).toBe(1024);
  });
});
