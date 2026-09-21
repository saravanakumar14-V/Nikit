import { describe, it, expect } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';

describe('ZaqXResearchCycle02Training: 200-Step Training Telemetry & Best Checkpoint', () => {
  it('validates 200-step PyTorch training curve, validation schedule, and checkpoint selection', async () => {
    const report = await zaqxService.getResearchCycle02Report();
    const { trainingTelemetry, checkpointSelection } = report;

    expect(trainingTelemetry.totalSteps).toBe(200);
    expect(trainingTelemetry.tokensSeen).toBeGreaterThan(60000);
    expect(trainingTelemetry.initialLoss).toBeGreaterThan(200.0);
    expect(trainingTelemetry.finalLoss).toBeLessThan(10.0);
    expect(trainingTelemetry.convergenceStatus).toBe('learning');

    // Validation loss schedule across 10 checkpoints
    expect(trainingTelemetry.validationLosses.length).toBe(10);
    expect(trainingTelemetry.validationLosses[0].step).toBe(20);
    expect(trainingTelemetry.validationLosses[9].step).toBe(200);
    expect(trainingTelemetry.validationLosses[9].loss).toBeLessThan(trainingTelemetry.validationLosses[0].loss);

    // Checkpoint selection policy
    expect(checkpointSelection).toBeDefined();
    expect(checkpointSelection?.policy).toBe('best_validation_loss');
    expect(checkpointSelection?.bestStep).toBe(200);
    expect(checkpointSelection?.bestValidationLoss).toBeLessThan(6.0);
    expect(checkpointSelection?.bestCheckpointHash).toBeDefined();

    // Throughput & Hardware
    expect(trainingTelemetry.throughputTokensPerSec).toBeGreaterThan(500);
    expect(trainingTelemetry.peakMemoryMb).toBeGreaterThan(100);
  });
});
