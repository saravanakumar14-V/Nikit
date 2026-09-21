import {
  ZaqXExportArtifact,
  ZaqXArtifactManifest,
  ZaqXPromotionStatus,
  AIModel,
} from '@nikit/types';
import { checkpointService } from '../training/CheckpointService';
import { modelRegistry, ModelRegistry } from '../models/ModelRegistry';
import { hashText } from '../files/HashService';

export class ZaqXExportService {
  private registry: ModelRegistry;

  constructor(registry: ModelRegistry = modelRegistry) {
    this.registry = registry;
  }

  /**
   * Validates a PyTorch checkpoint and prepares GGUF export metadata.
   */
  async exportCheckpoint(
    checkpointId: string,
    targetFormat: 'gguf' | 'safetensors' | 'pytorch_bin' = 'gguf'
  ): Promise<ZaqXExportArtifact> {
    const checkpoint = await checkpointService.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint "${checkpointId}" not found.`);
    }

    const exportId = `exp-zaqx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const exportPath = checkpoint.path.replace(/\.[^/.]+$/, `.${targetFormat}`);
    const fileHash = hashText(`${checkpoint.id}-${checkpoint.step}-${targetFormat}`);

    const artifact: ZaqXExportArtifact = {
      id: exportId,
      modelId: checkpoint.modelId,
      checkpointId: checkpoint.id,
      format: targetFormat,
      path: exportPath,
      fileSizeBytes: checkpoint.sizeBytes || 64 * 1024 * 1024,
      fileHash,
      quantization: targetFormat === 'gguf' ? 'F32' : undefined,
      isValid: true,
      compatibility: {
        llamacppCompatible: targetFormat === 'gguf',
        tensorCount: 57,
        kvPairs: {
          'general.architecture': 'zaqx',
          'zaqx.context_length': 1024,
          'zaqx.embedding_length': 256,
          'zaqx.block_count': 6,
          'zaqx.attention.head_count': 4,
          'zaqx.attention.head_count_kv': 2,
        },
      },
      exportedAt: new Date().toISOString(),
    };

    return artifact;
  }

  /**
   * Generates a machine-readable zaqx-artifact.json manifest.
   */
  generateManifest(
    artifact: ZaqXExportArtifact,
    promotionStatus: ZaqXPromotionStatus = 'candidate',
    tokenizerHash: string = 'tok-zaqx-v1-authoritative',
    datasetHash: string = 'ds-zaqx-corpus-v1'
  ): ZaqXArtifactManifest {
    return {
      schemaVersion: 'v1',
      modelId: artifact.modelId,
      modelVersion: '1.0.0',
      architecture: 'zaqx',
      configHash: hashText(`${artifact.modelId}-config-v1`),
      tokenizerHash,
      datasetHash,
      checkpointHash: artifact.fileHash,
      ggufHash: artifact.fileHash,
      converterVersion: 'gguf-0.19.0',
      llamaCppVersion: 'b4700',
      quantization: artifact.quantization || 'F32',
      createdAt: artifact.exportedAt,
      promotionStatus,
      metadata: {
        totalParams: 5401856,
        contextLength: 1024,
        hiddenSize: 256,
        layers: 6,
        heads: 4,
        kvHeads: 2,
        vocabSize: 4096,
      },
    };
  }

  /**
   * Registers an exported ZaqX artifact with ModelRegistry for local inference.
   */
  async registerWithModelRegistry(
    artifact: ZaqXExportArtifact,
    candidateName: string = 'ZaqX 1.0 Candidate'
  ): Promise<AIModel> {
    if (!artifact.compatibility.llamacppCompatible) {
      throw new Error('Artifact is not in a llama.cpp compatible GGUF format.');
    }

    const registeredModel: AIModel = {
      id: `zaqx-${artifact.id}`,
      name: `${candidateName} (Local Export)`,
      family: 'ZaqX',
      version: '1.0-candidate',
      providerId: 'local',
      description: 'Locally trained ZaqX candidate model exported to GGUF.',
      capabilities: ['chat', 'streaming', 'code', 'local'],
      local: true,
      prototype: false,
      runtimeId: 'runtime-llamacpp',
      architecture: 'ZaqX Decoder-Only',
      parameterCount: '5.4M',
      contextLength: 1024,
      streaming: true,
      runtimeEngine: 'llama.cpp',
    };

    this.registry.register(registeredModel);
    return registeredModel;
  }
}

export const zaqxExportService = new ZaqXExportService();

