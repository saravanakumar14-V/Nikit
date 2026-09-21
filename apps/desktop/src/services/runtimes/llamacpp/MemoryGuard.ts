import { GgufMetadata, HardwareMetrics, MemoryFeasibility } from './types';

export class MemoryGuard {
  /**
   * Evaluates memory feasibility conservatively.
   * Never claims to be an exact memory oracle.
   */
  static checkFeasibility(
    model: GgufMetadata,
    hardware: HardwareMetrics,
    contextSize = 2048
  ): MemoryFeasibility {
    const modelMb = model.fileSizeBytes > 0 ? model.fileSizeBytes / (1024 * 1024) : 0;

    // Estimate conservative context KV cache overhead (~1-2MB per 1024 tokens for 7B/3B)
    const contextOverheadMb = (contextSize / 1024) * 250;
    const estimatedTotalMb = Math.round(modelMb + contextOverheadMb);

    // If hardware memory metrics are completely unknown
    if (!hardware.totalRamMb && !hardware.vramTotalMb) {
      return {
        status: 'unknown',
        estimatedMemoryMb: estimatedTotalMb > 0 ? estimatedTotalMb : undefined,
        warning: 'Hardware memory metrics could not be detected. Execution will proceed with standard allocation.',
        recommendedBackend: 'cpu',
      };
    }

    const availableVram = hardware.vramFreeMb || hardware.vramTotalMb || 0;
    const availableRam = hardware.freeRamMb || hardware.totalRamMb || 0;

    // Check GPU feasibility if CUDA is available
    if (hardware.cudaAvailable && availableVram > 0) {
      if (estimatedTotalMb <= availableVram * 0.85) {
        return {
          status: 'likely_fit',
          estimatedMemoryMb: estimatedTotalMb,
          recommendedBackend: 'cuda',
        };
      }

      if (estimatedTotalMb <= availableVram * 1.1) {
        return {
          status: 'possibly_constrained',
          estimatedMemoryMb: estimatedTotalMb,
          warning: 'Model size is close to available VRAM. Some layers may be offloaded to CPU.',
          recommendedBackend: 'cuda',
        };
      }
    }

    // Fall back to System RAM feasibility
    if (availableRam > 0) {
      if (estimatedTotalMb <= availableRam * 0.75) {
        return {
          status: 'likely_fit',
          estimatedMemoryMb: estimatedTotalMb,
          warning: hardware.cudaAvailable
            ? 'VRAM constrained: Model will execute smoothly using system CPU & RAM.'
            : undefined,
          recommendedBackend: 'cpu',
        };
      }

      if (estimatedTotalMb <= availableRam * 0.95) {
        return {
          status: 'possibly_constrained',
          estimatedMemoryMb: estimatedTotalMb,
          warning: 'Model requires substantial system RAM. Background applications may experience memory pressure.',
          recommendedBackend: 'cpu',
        };
      }

      return {
        status: 'likely_insufficient',
        estimatedMemoryMb: estimatedTotalMb,
        warning: 'Estimated memory exceeds available RAM. Loading this model may fail or cause severe paging.',
        recommendedBackend: 'cpu',
      };
    }

    return {
      status: 'unknown',
      estimatedMemoryMb: estimatedTotalMb,
      recommendedBackend: 'cpu',
    };
  }
}
