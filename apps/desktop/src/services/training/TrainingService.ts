import {
  TrainingRun,
  TrainingConfiguration,
  ResourceFeasibilityReport,
} from '@nikit/types';
import { ITrainingStore, TrainingRunQuery } from './TrainingStore';
import { localTrainingStore } from './LocalStorageTrainingStore';
import { ITrainingEngine, developmentTrainingEngine } from './TrainingEngine';
import { ResourceFeasibilityChecker } from './ResourceFeasibilityChecker';

export class TrainingService {
  private store: ITrainingStore;
  private engine: ITrainingEngine;

  constructor(
    store: ITrainingStore = localTrainingStore,
    engine: ITrainingEngine = developmentTrainingEngine
  ) {
    this.store = store;
    this.engine = engine;
  }

  async checkFeasibility(config: TrainingConfiguration): Promise<ResourceFeasibilityReport> {
    return ResourceFeasibilityChecker.evaluate(config);
  }

  async createTrainingRun(name: string, config: TrainingConfiguration): Promise<TrainingRun> {
    const validation = await this.engine.validate(config);
    if (!validation.valid) {
      throw new Error(`Training configuration invalid: ${validation.errors.join(', ')}`);
    }

    const id = `trun-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const run: TrainingRun = {
      id,
      name: name.trim(),
      modelId: config.modelId,
      datasetVersionId: config.datasetVersionId,
      tokenizerId: config.tokenizerId,
      config,
      status: 'ready',
      currentStep: 0,
      totalSteps: config.maxSteps,
      currentEpoch: 0,
      totalEpochs: config.epochs,
      loss: null,
      learningRate: config.learningRate,
      checkpointIds: [],
      isSimulation: this.engine.isSimulation,
      simulationNotice: this.engine.isSimulation
        ? 'Simulation / Development Only (Not a Real Training Run)'
        : undefined,
      startedAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };

    await this.store.saveRun(run);
    return run;
  }

  async startRun(runId: string): Promise<TrainingRun> {
    const run = await this.store.getRun(runId);
    if (!run) throw new Error(`Training run "${runId}" not found.`);

    await this.engine.start(run);
    return run;
  }

  async pauseRun(runId: string): Promise<TrainingRun> {
    const run = await this.store.getRun(runId);
    if (!run) throw new Error(`Training run "${runId}" not found.`);

    await this.engine.pause(runId);
    return (await this.store.getRun(runId)) || run;
  }

  async resumeRun(runId: string): Promise<TrainingRun> {
    const run = await this.store.getRun(runId);
    if (!run) throw new Error(`Training run "${runId}" not found.`);

    await this.engine.resume(runId);
    return (await this.store.getRun(runId)) || run;
  }

  async cancelRun(runId: string): Promise<TrainingRun> {
    const run = await this.store.getRun(runId);
    if (!run) throw new Error(`Training run "${runId}" not found.`);

    await this.engine.cancel(runId);
    return (await this.store.getRun(runId)) || run;
  }

  async listRuns(query?: TrainingRunQuery): Promise<TrainingRun[]> {
    return this.store.listRuns(query);
  }

  async getRun(id: string): Promise<TrainingRun | null> {
    return this.store.getRun(id);
  }

  async deleteRun(id: string): Promise<boolean> {
    return this.store.deleteRun(id);
  }
}

export const trainingService = new TrainingService();
