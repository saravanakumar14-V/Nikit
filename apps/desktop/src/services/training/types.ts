import { TrainingConfiguration, TrainingPrecision } from '@nikit/types';

export const CURRENT_TRAINING_STORAGE_SCHEMA_VERSION = 'v1';

export const DEFAULT_TRAINING_CONFIG: TrainingConfiguration = {
  modelId: 'smollm2',
  datasetVersionId: '',
  tokenizerId: 'tokenizer-llamacpp',
  contextLength: 2048,
  batchSize: 4,
  microBatchSize: 1,
  gradientAccumulation: 4,
  learningRate: 0.0002,
  weightDecay: 0.01,
  epochs: 3,
  maxSteps: 1000,
  warmupSteps: 50,
  evaluationInterval: 100,
  checkpointInterval: 250,
  precision: 'fp16',
  gradientCheckpointing: true,
  seed: 42,
};

export const TRAINING_PRECISION_OPTIONS: TrainingPrecision[] = [
  'fp16',
  'bf16',
  'fp32',
  'q4_0',
  'q8_0',
];
