import { TrainingConfiguration, TrainingRun } from '@nikit/types';
import { ITrainingStore } from './TrainingStore';
import { localTrainingStore } from './LocalStorageTrainingStore';

export interface ITrainingEngine {
  readonly id: string;
  readonly name: string;
  readonly isSimulation: boolean;
  validate(config: TrainingConfiguration): Promise<{ valid: boolean; errors: string[] }>;
  start(run: TrainingRun): Promise<void>;
  pause(runId: string): Promise<void>;
  resume(runId: string): Promise<void>;
  cancel(runId: string): Promise<void>;
}

export class DevelopmentTrainingEngine implements ITrainingEngine {
  readonly id = 'engine-dev-stub';
  readonly name = 'Development Training Engine (Lifecycle & Config Validator)';
  readonly isSimulation = true;

  private store: ITrainingStore;

  constructor(store: ITrainingStore = localTrainingStore) {
    this.store = store;
  }

  async validate(config: TrainingConfiguration): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.modelId) errors.push('Target model ID is required.');
    if (!config.datasetVersionId) errors.push('Dataset version ID is required.');
    if (!config.tokenizerId) errors.push('Tokenizer ID is required.');
    if (config.batchSize < 1) errors.push('Batch size must be at least 1.');
    if (config.microBatchSize < 1) errors.push('Micro batch size must be at least 1.');
    if (config.learningRate <= 0) errors.push('Learning rate must be greater than 0.');
    if (config.epochs < 1) errors.push('Epoch count must be at least 1.');
    if (config.maxSteps < 1) errors.push('Max steps must be at least 1.');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async start(run: TrainingRun): Promise<void> {
    const validation = await this.validate(run.config);
    if (!validation.valid) {
      throw new Error(`Training configuration invalid: ${validation.errors.join(', ')}`);
    }

    run.status = 'running';
    run.updatedAt = new Date().toISOString();
    await this.store.saveRun(run);
  }

  async pause(runId: string): Promise<void> {
    const run = await this.store.getRun(runId);
    if (run) {
      run.status = 'paused';
      run.updatedAt = new Date().toISOString();
      await this.store.saveRun(run);
    }
  }

  async resume(runId: string): Promise<void> {
    const run = await this.store.getRun(runId);
    if (run) {
      run.status = 'running';
      run.updatedAt = new Date().toISOString();
      await this.store.saveRun(run);
    }
  }

  async cancel(runId: string): Promise<void> {
    const run = await this.store.getRun(runId);
    if (run) {
      run.status = 'cancelled';
      run.updatedAt = new Date().toISOString();
      await this.store.saveRun(run);
    }
  }
}

export const developmentTrainingEngine = new DevelopmentTrainingEngine();
