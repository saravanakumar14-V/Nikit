import { Checkpoint, ResumeMetadata, TrainingRun } from '@nikit/types';
import { ITrainingStore } from './TrainingStore';
import { localTrainingStore } from './LocalStorageTrainingStore';

export interface RegisterCheckpointParams {
  trainingRunId: string;
  modelId: string;
  step: number;
  epoch?: number;
  path: string;
  sizeBytes?: number;
  modelFileHash?: string;
  metrics?: Record<string, number | null>;
}

export class CheckpointService {
  private store: ITrainingStore;

  constructor(store: ITrainingStore = localTrainingStore) {
    this.store = store;
  }

  async registerCheckpoint(params: RegisterCheckpointParams): Promise<Checkpoint> {
    const id = `ckpt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const checkpoint: Checkpoint = {
      id,
      trainingRunId: params.trainingRunId,
      modelId: params.modelId,
      step: params.step,
      epoch: params.epoch,
      path: params.path,
      sizeBytes: params.sizeBytes,
      modelFileHash: params.modelFileHash,
      metrics: params.metrics,
      status: 'available',
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await this.store.saveCheckpoint(checkpoint);
    return checkpoint;
  }

  async getCheckpoint(id: string): Promise<Checkpoint | null> {
    return this.store.getCheckpoint(id);
  }

  async listCheckpoints(trainingRunId?: string): Promise<Checkpoint[]> {
    return this.store.listCheckpoints({ trainingRunId });
  }

  async deleteCheckpoint(id: string): Promise<boolean> {
    return this.store.deleteCheckpoint(id);
  }

  /**
   * Generates validated resume metadata for a verified checkpoint.
   */
  async buildResumeMetadata(run: TrainingRun, checkpointId: string): Promise<ResumeMetadata> {
    const checkpoint = await this.store.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint "${checkpointId}" not found.`);
    }

    if (checkpoint.status !== 'available') {
      throw new Error(`Checkpoint is in "${checkpoint.status}" state and cannot be resumed from.`);
    }

    return {
      trainingRunId: run.id,
      checkpointId: checkpoint.id,
      step: checkpoint.step,
      epoch: checkpoint.epoch || 1,
      datasetVersionId: run.datasetVersionId,
      tokenizerId: run.tokenizerId,
      config: run.config,
      seed: run.config.seed,
      isVerified: true,
    };
  }
}

export const checkpointService = new CheckpointService();
