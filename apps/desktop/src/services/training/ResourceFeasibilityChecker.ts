import {
  TrainingConfiguration,
  ResourceFeasibilityReport,
  ResourceFeasibility,
} from '@nikit/types';
import { hardwareDetectionService } from '../runtimes/llamacpp/HardwareDetectionService';
import { modelService } from '../models';

export class ResourceFeasibilityChecker {
  /**
   * Conservatively evaluates training feasibility accounting for:
   * model weights + gradients + optimizer state + activations + sequence length + microbatch + gradient accumulation + framework overhead.
   */
  static async evaluate(config: TrainingConfiguration): Promise<ResourceFeasibilityReport> {
    const hw = await hardwareDetectionService.detectHardware();
    const model = modelService.getModel(config.modelId);

    const warnings: string[] = [];
    const recommendations: string[] = [];

    const detectedVramMb = hw.vramTotalMb || null;
    const detectedRamMb = hw.totalRamMb || null;

    // Estimate Model Parameter count in millions
    let paramCountM: number | null = null;
    if (model?.parameterCount) {
      if (typeof model.parameterCount === 'number') {
        paramCountM = model.parameterCount;
      } else if (typeof model.parameterCount === 'string') {
        const match = model.parameterCount.match(/(\d+(\.\d+)?)\s*([MBG])/i);
        if (match) {
          const val = parseFloat(match[1]);
          const unit = match[3].toUpperCase();
          paramCountM = unit === 'G' || unit === 'B' ? val * 1000 : val;
        }
      }
    } else if (config.modelId.includes('135m') || config.modelId.includes('smollm2')) {
      paramCountM = 135;
    } else if (config.modelId.includes('1b')) {
      paramCountM = 1000;
    } else if (config.modelId.includes('7b') || config.modelId.includes('8b')) {
      paramCountM = 7000;
    }

    // If model parameters cannot be reliably estimated, return unknown
    if (paramCountM === null || paramCountM <= 0) {
      return {
        feasibility: 'unknown',
        detectedVramMb,
        detectedRamMb,
        warnings: [
          'Model parameter count is unknown. Cannot reliably calculate conservative memory bounds.',
        ],
        recommendations: [
          'Provide explicit model parameter count or select a model with known architectural metadata.',
        ],
      };
    }

    // Bytes per parameter for precision
    let bytesPerParam = 2; // fp16 / bf16
    if (config.precision === 'fp32') bytesPerParam = 4;
    else if (config.precision === 'q4_0') bytesPerParam = 0.5;
    else if (config.precision === 'q8_0') bytesPerParam = 1.0;

    // 1. Model Weights Memory (MB)
    const weightsMb = (paramCountM * 1e6 * bytesPerParam) / (1024 * 1024);

    // 2. Gradients Memory (MB)
    const gradientsMb = (paramCountM * 1e6 * bytesPerParam) / (1024 * 1024);

    // 3. Optimizer State Memory (AdamW requires FP32 master weights (4 bytes) + momentum (4 bytes) + variance (4 bytes) = 12 bytes/param)
    const optimizerMb = (paramCountM * 1e6 * 12) / (1024 * 1024);

    // 4. Activations Memory (Estimated from microBatchSize, contextLength, hidden size, and layers)
    const hiddenDim = paramCountM > 3000 ? 4096 : paramCountM > 800 ? 2048 : 576;
    const numLayers = paramCountM > 3000 ? 32 : paramCountM > 800 ? 24 : 16;
    const activationCheckpointingFactor = config.gradientCheckpointing ? 0.3 : 1.0;

    const activationsMb =
      ((config.microBatchSize * config.contextLength * hiddenDim * numLayers * 2 * activationCheckpointingFactor) /
        (1024 * 1024));

    // 5. Framework & CUDA Runtime Overhead (20% safety margin + 400 MB baseline runtime)
    const subtotalMb = weightsMb + gradientsMb + optimizerMb + activationsMb;
    const frameworkOverheadMb = subtotalMb * 0.2 + 400;

    const totalEstimatedVramMb = Math.round(subtotalMb + frameworkOverheadMb);
    const totalEstimatedRamMb = Math.round(totalEstimatedVramMb * 1.3);

    let feasibility: ResourceFeasibility = 'unknown';

    if (detectedVramMb !== null && detectedVramMb > 0) {
      if (totalEstimatedVramMb <= detectedVramMb * 0.6) {
        feasibility = 'likely_fit';
      } else if (totalEstimatedVramMb <= detectedVramMb * 0.95) {
        feasibility = 'possibly_constrained';
        warnings.push(
          `Estimated VRAM requirement (~${totalEstimatedVramMb} MB) is close to available VRAM (${detectedVramMb} MB).`
        );
        recommendations.push(
          'Reduce microBatchSize to 1 and verify gradient checkpointing is enabled to lower activation memory.'
        );
      } else {
        feasibility = 'likely_insufficient';
        warnings.push(
          `Estimated conservative memory requirement (~${totalEstimatedVramMb} MB) exceeds detected VRAM (${detectedVramMb} MB).`
        );
        recommendations.push(
          'Use CPU offloading, lower context length, or switch to parameter-efficient quantization.'
        );
      }
    } else if (detectedRamMb !== null && detectedRamMb > 0) {
      if (totalEstimatedRamMb <= detectedRamMb * 0.5) {
        feasibility = 'possibly_constrained';
        warnings.push('GPU unavailable. CPU training requires substantial host RAM and operates at lower throughput.');
      } else {
        feasibility = 'likely_insufficient';
        warnings.push(`System RAM (${detectedRamMb} MB) is insufficient for estimated requirements (~${totalEstimatedRamMb} MB).`);
      }
    } else {
      feasibility = 'unknown';
      warnings.push('Host memory boundaries could not be detected.');
    }

    if (config.contextLength > 2048) {
      warnings.push(`Context length (${config.contextLength}) significantly magnifies activation memory during backpropagation.`);
    }

    return {
      feasibility,
      estimatedVramMb: totalEstimatedVramMb,
      estimatedRamMb: totalEstimatedRamMb,
      detectedVramMb,
      detectedRamMb,
      warnings,
      recommendations,
    };
  }
}
