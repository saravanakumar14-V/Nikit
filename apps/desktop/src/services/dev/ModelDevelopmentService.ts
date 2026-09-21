import {
  DatasetVersion,
  TokenLengthDistribution,
  PackingAnalysisResult,
  EvaluationRun,
  TrainingRun,
  Checkpoint,
  ResourceFeasibilityReport,
  TrainingConfiguration,
  GenerationConfig,
} from '@nikit/types';
import { DatasetService, datasetService } from '../data/DatasetService';
import { TokenizerRegistry, tokenizerRegistry } from '../tokenization/TokenizerRegistry';
import { TokenAnalysisService } from '../tokenization/TokenAnalysisService';
import { EvaluationRunnerService, evaluationRunnerService } from '../evaluation/EvaluationRunnerService';
import { TrainingService, trainingService } from '../training/TrainingService';
import { CheckpointService, checkpointService } from '../training/CheckpointService';

export interface PrepareTrainingParams {
  name: string;
  modelId: string;
  datasetVersionId: string;
  tokenizerId?: string;
  configOverrides?: Partial<TrainingConfiguration>;
}

export class ModelDevelopmentService {
  private datasets: DatasetService;
  private tokenizers: TokenizerRegistry;
  private evaluations: EvaluationRunnerService;
  private trainings: TrainingService;
  private checkpoints: CheckpointService;

  constructor(
    datasets: DatasetService = datasetService,
    tokenizers: TokenizerRegistry = tokenizerRegistry,
    evaluations: EvaluationRunnerService = evaluationRunnerService,
    trainings: TrainingService = trainingService,
    checkpoints: CheckpointService = checkpointService
  ) {
    this.datasets = datasets;
    this.tokenizers = tokenizers;
    this.evaluations = evaluations;
    this.trainings = trainings;
    this.checkpoints = checkpoints;
  }

  // --- Workflow 1: Dataset → Token Analysis ---
  async analyzeDataset(
    datasetVersionId: string,
    modelId: string = 'smollm2',
    contextLimit: number = 2048
  ): Promise<{
    version: DatasetVersion;
    distribution: TokenLengthDistribution;
    packing: PackingAnalysisResult;
  }> {
    const version = await this.datasets.getVersion(datasetVersionId);
    if (!version) {
      throw new Error(`Dataset version "${datasetVersionId}" not found.`);
    }

    const tokenizer = this.tokenizers.resolveForModel(modelId);
    const records = await this.datasets.getRecords({ datasetVersionId });

    const distribution = await TokenAnalysisService.analyzeSequenceLengths(
      records,
      tokenizer,
      contextLimit
    );
    const packing = await TokenAnalysisService.analyzePacking(records, tokenizer, contextLimit);

    return {
      version,
      distribution,
      packing,
    };
  }

  // --- Workflow 2: Model → Evaluation ---
  async evaluateModel(
    modelId: string,
    suiteId: string,
    generationConfig?: Partial<GenerationConfig>
  ): Promise<EvaluationRun> {
    return this.evaluations.runEvaluation({
      modelId,
      suiteId,
      generationConfig,
    });
  }

  // --- Workflow 3: Checkpoint → Evaluation ---
  async evaluateCheckpoint(
    checkpointId: string,
    suiteId: string,
    generationConfig?: Partial<GenerationConfig>
  ): Promise<EvaluationRun> {
    const checkpoint = await this.checkpoints.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint "${checkpointId}" not found.`);
    }

    return this.evaluations.runEvaluation({
      modelId: checkpoint.modelId,
      suiteId,
      generationConfig,
    });
  }

  // --- Workflow 4: Dataset + Tokenizer → Training Configuration & Feasibility ---
  async configureTraining(params: PrepareTrainingParams): Promise<{
    feasibility: ResourceFeasibilityReport;
    trainingRun: TrainingRun;
  }> {
    const version = await this.datasets.getVersion(params.datasetVersionId);
    if (!version) {
      throw new Error(`Dataset version "${params.datasetVersionId}" not found.`);
    }

    const tokenizer = params.tokenizerId
      ? this.tokenizers.get(params.tokenizerId)
      : this.tokenizers.resolveForModel(params.modelId);

    const config: TrainingConfiguration = {
      modelId: params.modelId,
      datasetVersionId: params.datasetVersionId,
      tokenizerId: tokenizer?.id || 'tokenizer-llamacpp',
      contextLength: params.configOverrides?.contextLength || 2048,
      batchSize: params.configOverrides?.batchSize || 4,
      microBatchSize: params.configOverrides?.microBatchSize || 1,
      gradientAccumulation: params.configOverrides?.gradientAccumulation || 4,
      learningRate: params.configOverrides?.learningRate || 0.0002,
      weightDecay: params.configOverrides?.weightDecay || 0.01,
      epochs: params.configOverrides?.epochs || 3,
      maxSteps: params.configOverrides?.maxSteps || 1000,
      warmupSteps: params.configOverrides?.warmupSteps || 50,
      evaluationInterval: params.configOverrides?.evaluationInterval || 100,
      checkpointInterval: params.configOverrides?.checkpointInterval || 250,
      precision: params.configOverrides?.precision || 'fp16',
      gradientCheckpointing: params.configOverrides?.gradientCheckpointing ?? true,
      seed: params.configOverrides?.seed || 42,
    };

    const feasibility = await this.trainings.checkFeasibility(config);
    const trainingRun = await this.trainings.createTrainingRun(params.name, config);

    return {
      feasibility,
      trainingRun,
    };
  }

  // --- Workflow 5: Training Run → Checkpoint Registration ---
  async recordCheckpoint(
    runId: string,
    modelId: string,
    step: number,
    path: string,
    sizeBytes?: number
  ): Promise<Checkpoint> {
    return this.checkpoints.registerCheckpoint({
      trainingRunId: runId,
      modelId,
      step,
      path,
      sizeBytes,
    });
  }

  // --- Workflow 6: Checkpoint A vs Checkpoint B Regression Comparison ---
  async compareEvaluationRuns(runAId: string, runBId: string) {
    return this.evaluations.compareRuns(runAId, runBId);
  }
}

export const modelDevelopmentService = new ModelDevelopmentService();
