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

describe('ZaqXResearchCycle02Acceptance: Full Research Cycle Lifecycle & Scaling Gate', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  it('executes full research cycle stages and outputs verified status summary', async () => {
    const report = await zaqxService.getResearchCycle02Report();

    expect(report.cycleId).toBe('zaqx-r02');
    expect(report.statusSummary.researchExperiment).toBe('PASS');
    expect(report.statusSummary.training).toBe('PASS');
    expect(report.statusSummary.evaluation).toBe('PASS');
    expect(report.statusSummary.gguf).toBe('PASS');
    expect(report.statusSummary.llamaCpp).toBe('PASS');
    expect(report.statusSummary.nikitRuntime).toBe('PASS');

    // Multi-cycle comparison
    expect(report.cycleComparison).toBeDefined();
    expect(report.cycleComparison?.corpusRecords.cycle02).toBe(565);
    expect(report.cycleComparison?.trainingTokens.factor).toBeGreaterThan(100);
    expect(report.cycleComparison?.bestValidationLoss.deltaPercent).toBeGreaterThan(50);
    expect(report.cycleComparison?.totalObservedErrors.delta).toBe(6);

    // Saturation Analysis & Answers to 6 Research Questions
    expect(report.saturationAnalysis).toBeDefined();
    expect(report.saturationAnalysis?.saturationClassification).toBe('still_learning');
    expect(report.saturationAnalysis?.researchAnswers.q1_increasedCorpusHelped).toBe(true);
    expect(report.saturationAnalysis?.researchAnswers.q2_increasedTokenExposureHelped).toBe(true);
    expect(report.saturationAnalysis?.researchAnswers.q3_is54MStillLearning).toBe(true);
    expect(report.saturationAnalysis?.researchAnswers.q4_isTokenizerLimiting).toBe(false);
    expect(report.saturationAnalysis?.researchAnswers.q5_isCorpusLimiting).toBe(true);
    expect(report.saturationAnalysis?.researchAnswers.q6_isScalingJustified).toBe(false);

    // Scaling Gate Policy Decision
    expect(report.saturationAnalysis?.scalingGateDecision.decision).toBe('block_scaling');
    expect(report.saturationAnalysis?.scalingGateDecision.nextRecommendedStep).toBe('continue 5.4M');

    // Qualitative benchmark & Error taxonomy
    expect(report.qualitativeResults.length).toBe(5);
    expect(report.errorTaxonomySummary.hallucination).toBe(0);
    expect(report.errorTaxonomySummary.instruction_failure).toBe(0);

    // Parity verification
    expect(report.parityResult.parityStatus).toBe('pass');
    expect(report.parityResult.logitsMaxDiff).toBe(0.0);
  });
});
