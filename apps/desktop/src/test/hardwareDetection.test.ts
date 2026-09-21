import { describe, it, expect } from 'vitest';
import { HardwareDetectionService } from '../services/runtimes/llamacpp/HardwareDetectionService';

describe('HardwareDetectionService & Native GPU Metrics', () => {
  it('provides honest cached metrics with fallback for unmeasured values', () => {
    const service = new HardwareDetectionService();
    const metrics = service.getCachedMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.backend).toBe('unknown');
    expect(metrics.cudaAvailable).toBe(false);
    expect(typeof metrics.cpuCores).toBe('number');
  });
});
