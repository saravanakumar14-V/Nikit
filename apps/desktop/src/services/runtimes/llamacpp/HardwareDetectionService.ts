import { HardwareMetrics } from './types';

export class HardwareDetectionService {
  private cachedMetrics: HardwareMetrics | null = null;

  async detectHardware(forceRefresh = false): Promise<HardwareMetrics> {
    if (this.cachedMetrics && !forceRefresh) {
      return this.cachedMetrics;
    }

    let metrics: HardwareMetrics = {
      gpuName: undefined,
      vramTotalMb: undefined,
      vramFreeMb: undefined,
      driverVersion: undefined,
      cudaAvailable: false,
      cudaVersion: undefined,
      totalRamMb: undefined,
      freeRamMb: undefined,
      cpuName: undefined,
      cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4,
      backend: 'unknown',
    };

    if (
      typeof window !== 'undefined' &&
      (window as unknown as { __TAURI__?: unknown }).__TAURI__
    ) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const nativeInfo = await invoke<{
          gpuName?: string;
          vramTotalMb?: number;
          vramFreeMb?: number;
          driverVersion?: string;
          cudaAvailable: boolean;
          cudaVersion?: string;
          totalRamMb?: number;
          freeRamMb?: number;
          cpuName?: string;
          cpuCores?: number;
        }>('detect_hardware');

        if (nativeInfo) {
          metrics = {
            ...nativeInfo,
            backend: nativeInfo.cudaAvailable ? 'cuda' : nativeInfo.gpuName ? 'cpu' : 'unknown',
          };
        }
      } catch {
        // Fall back to defaults
      }
    }

    this.cachedMetrics = metrics;
    return metrics;
  }

  getCachedMetrics(): HardwareMetrics {
    return (
      this.cachedMetrics || {
        cudaAvailable: false,
        backend: 'unknown',
        cpuCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4,
      }
    );
  }
}

export const hardwareDetectionService = new HardwareDetectionService();
