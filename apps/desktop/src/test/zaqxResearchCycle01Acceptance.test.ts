import { describe, it, expect, beforeEach } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => {
    storageMap.set(key, val);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('ZaqXResearchCycle01Acceptance: Full Research Stage Lifecycle', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('executes full research cycle stages and outputs verified status summary', async () => {
    const report = await zaqxService.getResearchCycleReport();

    expect(report.statusSummary.researchExperiment).toBe('PASS');
    expect(report.statusSummary.training).toBe('PASS');
    expect(report.statusSummary.evaluation).toBe('PASS');
    expect(report.statusSummary.gguf).toBe('PASS');
    expect(report.statusSummary.llamaCpp).toBe('PASS');
    expect(report.statusSummary.nikitRuntime).toBe('PASS');

    expect(report.trainingTelemetry.totalSteps).toBe(50);
    expect(report.trainingTelemetry.initialLoss).toBeGreaterThan(report.trainingTelemetry.finalLoss);
    expect(report.trainingTelemetry.validationLosses.length).toBeGreaterThanOrEqual(5);

    expect(report.parityResult.parityStatus).toBe('pass');
    expect(report.parityResult.logitsMaxDiff).toBe(0.0);
  });
});
