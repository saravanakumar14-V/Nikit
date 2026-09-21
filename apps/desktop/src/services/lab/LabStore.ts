import { RunRecord, Experiment } from '@nikit/types';

export interface RunQuery {
  experimentId?: string | null;
  modelId?: string;
  status?: string;
  search?: string;
  limit?: number;
}

export interface ExperimentQuery {
  search?: string;
  tag?: string;
  archived?: boolean;
  limit?: number;
}

export interface ILabStore {
  // Runs
  saveRun(run: RunRecord): Promise<void>;
  getRun(id: string): Promise<RunRecord | null>;
  listRuns(query?: RunQuery): Promise<RunRecord[]>;
  deleteRun(id: string): Promise<boolean>;
  clearRuns(experimentId?: string | null): Promise<number>;

  // Experiments
  saveExperiment(experiment: Experiment): Promise<void>;
  getExperiment(id: string): Promise<Experiment | null>;
  listExperiments(query?: ExperimentQuery): Promise<Experiment[]>;
  deleteExperiment(id: string): Promise<boolean>;
  clearAll(): Promise<void>;
}
