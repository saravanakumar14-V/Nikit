import { describe, it, expect } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';

describe('ZaqXResearchBaselineEvaluation: Untrained vs Trained Comparison & Error Taxonomy', () => {
  it('generates research report containing untrained vs trained baseline metrics and error tags', async () => {
    const report = await zaqxService.getResearchCycleReport();

    expect(report.cycleId).toBe('zaqx-r01');
    expect(report.hypothesis).toContain('5.4M');
    expect(report.experimentIdent.experimentId).toBe('exp-zaqx-r01-001');

    // Evaluation Baseline
    expect(report.evaluationBaseline.untrainedLoss).toBeGreaterThan(report.evaluationBaseline.trainedLoss);
    expect(report.evaluationBaseline.lossImprovementPercent).toBeGreaterThan(50);

    // Qualitative Results
    expect(report.qualitativeResults.length).toBe(5);
    for (const q of report.qualitativeResults) {
      expect(q.prompt).toBeDefined();
      expect(q.untrainedOutput).toBeDefined();
      expect(q.trainedOutput).toBeDefined();
      expect(Array.isArray(q.observedErrorsUntrained)).toBe(true);
      expect(Array.isArray(q.observedErrorsTrained)).toBe(true);
    }

    // Error Taxonomy
    expect(typeof report.errorTaxonomySummary).toBe('object');
    expect(report.errorTaxonomySummary.instruction_failure).toBeDefined();

    // Bottleneck & Recommendation
    expect(report.bottleneckAnalysis.dominantLimitation).toBe('training duration');
    expect(report.nextScaleRecommendation.recommendedNextStep).toBe('continue 5.4M');
  });
});
