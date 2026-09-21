import { TrainingRun, Checkpoint } from '@nikit/types';

export interface TrainingRunQuery {
  modelId?: string;
  status?: string;
  limit?: number;
}

export interface CheckpointQuery {
  trainingRunId?: string;
  modelId?: string;
  status?: string;
  limit?: number;
}

export interface ITrainingStore {
  // Runs
  saveRun(run: TrainingRun): Promise<void>;
  getRun(id: string): Promise<TrainingRun | null>;
  listRuns(query?: TrainingRunQuery): Promise<TrainingRun[]>;
  deleteRun(id: string): Promise<boolean>;

  // Checkpoints
  saveCheckpoint(checkpoint: Checkpoint): Promise<void>;
  getCheckpoint(id: string): Promise<Checkpoint | null>;
  listCheckpoints(query?: CheckpointQuery): Promise<Checkpoint[]>;
  deleteCheckpoint(id: string): Promise<boolean>;

  clearAll(): Promise<void>;
}
