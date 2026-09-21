import {
  ZaqXConfig,
  ZaqXModelScale,
  ZaqXScalingEstimate,
  TrainingConfiguration,
} from '@nikit/types';
import { ZaqXParamsCalculator, ZAQX_SCALING_PRESETS } from '@nikit/zaqx';
import { ResourceFeasibilityChecker } from '../training/ResourceFeasibilityChecker';
import { DEFAULT_TRAINING_CONFIG } from '../training/types';

export class ZaqXScalingPlanner {
  /**
   * Evaluates scaling feasibility and exact parameter counts for a ZaqX configuration.
   */
  static async evaluateConfig(config: ZaqXConfig): Promise<ZaqXScalingEstimate> {
    const parameters = ZaqXParamsCalculator.calculate(config);

    // 1. Model Weights Memory (MB) in FP16 (2 bytes per param)
    const estimatedWeightsMb = Math.round((parameters.totalParams * 2) / (1024 * 1024));

    // 2. Training Memory Feasibility
    const trainingConfig: TrainingConfiguration = {
      ...DEFAULT_TRAINING_CONFIG,
      modelId: config.name,
      contextLength: config.maxContextLength,
      precision: 'fp16',
      microBatchSize: 1,
      batchSize: 4,
      gradientCheckpointing: true,
    };

    const feasibilityReport = await ResourceFeasibilityChecker.evaluate(trainingConfig);

    // 3. Inference Memory (Model weights + KV Cache + Activation buffer)
    const headDim = config.hiddenSize / config.numAttentionHeads;
    const kvCacheBytes =
      2 *
      config.numLayers *
      config.numKeyValueHeads *
      headDim *
      config.maxContextLength *
      2; // 2 bytes for fp16
    const kvCacheMb = Math.round(kvCacheBytes / (1024 * 1024));
    const estimatedInferenceMemoryMb = estimatedWeightsMb + kvCacheMb + 150; // 150MB runtime overhead

    return {
      scale: config.scale,
      config: { ...config },
      parameters,
      estimatedWeightsMb,
      estimatedTrainingMemoryMb: feasibilityReport.estimatedVramMb || estimatedWeightsMb * 6,
      estimatedInferenceMemoryMb,
      feasibility: feasibilityReport.feasibility,
      feasibilityReport,
    };
  }

  /**
   * Plans and evaluates all candidate presets in the ZaqX Model Family.
   */
  static async planAllPresets(): Promise<ZaqXScalingEstimate[]> {
    const presets: ZaqXModelScale[] = [
      'experimental-tiny',
      'experimental-small',
      'experimental-medium',
      'experimental-135m',
      'zaqx-1.0-candidate',
    ];

    const estimates: ZaqXScalingEstimate[] = [];
    for (const scale of presets) {
      const cfg = ZAQX_SCALING_PRESETS[scale];
      const est = await this.evaluateConfig(cfg);
      estimates.push(est);
    }

    return estimates;
  }
}
