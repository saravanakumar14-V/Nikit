import { describe, it, expect } from 'vitest';
import { MemoryGuard } from '../services/runtimes/llamacpp/MemoryGuard';
import { GgufMetadata, HardwareMetrics } from '../services/runtimes/llamacpp/types';

describe('MemoryGuard & Conservative Resource Feasibility', () => {
  const smallModel: GgufMetadata = {
    validGguf: true,
    filePath: 'qwen-0.5b.gguf',
    fileName: 'qwen-0.5b.gguf',
    fileSizeBytes: 400 * 1024 * 1024, // 400 MB
    discoveryStatus: 'available',
  };

  const largeModel: GgufMetadata = {
    validGguf: true,
    filePath: 'llama-70b.gguf',
    fileName: 'llama-70b.gguf',
    fileSizeBytes: 40 * 1024 * 1024 * 1024, // 40 GB
    discoveryStatus: 'available',
  };

  it('reports likely_fit when model comfortably fits within VRAM', () => {
    const gpuHardware: HardwareMetrics = {
      gpuName: 'NVIDIA GeForce RTX 4050 Laptop GPU',
      vramTotalMb: 6144, // 6 GB
      vramFreeMb: 5500,
      cudaAvailable: true,
      totalRamMb: 16384, // 16 GB
      backend: 'cuda',
    };

    const feasibility = MemoryGuard.checkFeasibility(smallModel, gpuHardware);
    expect(feasibility.status).toBe('likely_fit');
    expect(feasibility.recommendedBackend).toBe('cuda');
  });

  it('reports likely_insufficient when model exceeds physical RAM and VRAM', () => {
    const laptopHardware: HardwareMetrics = {
      gpuName: 'NVIDIA GeForce RTX 4050 Laptop GPU',
      vramTotalMb: 6144,
      cudaAvailable: true,
      totalRamMb: 16384,
      freeRamMb: 8000,
      backend: 'cuda',
    };

    const feasibility = MemoryGuard.checkFeasibility(largeModel, laptopHardware);
    expect(feasibility.status).toBe('likely_insufficient');
    expect(feasibility.warning).toContain('exceeds available RAM');
  });

  it('handles unknown hardware metrics gracefully without throwing', () => {
    const unknownHardware: HardwareMetrics = {
      cudaAvailable: false,
      backend: 'unknown',
    };

    const feasibility = MemoryGuard.checkFeasibility(smallModel, unknownHardware);
    expect(feasibility.status).toBe('unknown');
    expect(feasibility.recommendedBackend).toBe('cpu');
  });
});
