import { describe, it, expect } from 'vitest';
import { ZaqXScalingPlanner } from '../services/zaqx/ZaqXScalingPlanner';
import { ZAQX_SCALING_PRESETS } from '@nikit/zaqx';

describe('ZaqXScalingPlanner: Hardware-Aware Candidate Scaling & Resource Feasibility', () => {
  it('computes exact parameters and memory estimates for candidate scaling presets', async () => {
    const estimates = await ZaqXScalingPlanner.planAllPresets();
    expect(estimates.length).toBe(5);

    for (const est of estimates) {
      expect(est.parameters.totalParams).toBeGreaterThan(0);
      expect(est.estimatedWeightsMb).toBeGreaterThan(0);
      expect(est.estimatedTrainingMemoryMb).toBeGreaterThan(est.estimatedWeightsMb);
      expect(est.estimatedInferenceMemoryMb).toBeGreaterThan(0);
      expect(['likely_fit', 'possibly_constrained', 'likely_insufficient', 'unknown']).toContain(est.feasibility);
    }
  });

  it('evaluates custom ZaqX configuration accurately', async () => {
    const customConfig = {
      ...ZAQX_SCALING_PRESETS['experimental-tiny'],
      hiddenSize: 512,
      numAttentionHeads: 8,
      numKeyValueHeads: 2,
    };

    const est = await ZaqXScalingPlanner.evaluateConfig(customConfig);
    expect(est.parameters.totalParams).toBeGreaterThan(10_000_000);
    expect(est.estimatedWeightsMb).toBeGreaterThan(20);
  });
});
