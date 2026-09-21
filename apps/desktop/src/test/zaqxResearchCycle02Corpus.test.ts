import { describe, it, expect } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';

describe('ZaqXResearchCycle02Corpus: Expanded Corpus & Quality Audit', () => {
  it('loads and audits the expanded Cycle 02 corpus (500+ records, 0% duplicates, 0 leakage)', async () => {
    const report = await zaqxService.getResearchCycle02Report();
    const { corpusAudit } = report;

    expect(corpusAudit.datasetVersionId).toBe('ds-zaqx-r02-v1');
    expect(corpusAudit.recordCount).toBeGreaterThanOrEqual(500);
    expect(corpusAudit.wordCount).toBeGreaterThan(10000);
    expect(corpusAudit.charCount).toBeGreaterThan(50000);
    expect(corpusAudit.duplicateCount).toBe(0);
    expect(corpusAudit.duplicateRatePercent).toBe(0.0);

    // Multi-split deterministic partitioning (80/10/10)
    expect(corpusAudit.trainCount).toBe(452);
    expect(corpusAudit.valCount).toBe(56);
    expect(corpusAudit.testCount).toBe(57);
    expect(corpusAudit.exactLeakageOverlapCount).toBe(0);
    expect(corpusAudit.evaluationContaminationCount).toBe(0);

    // Synthetic data labeling verification
    expect(corpusAudit.syntheticCount).toBe(0);
    expect(corpusAudit.syntheticRatioPercent).toBe(0.0);

    // Category distribution across 8 domains
    expect(corpusAudit.categoryDistribution).toBeDefined();
    expect(Object.keys(corpusAudit.categoryDistribution || {}).length).toBeGreaterThanOrEqual(8);
    expect(corpusAudit.categoryDistribution?.['ai_architecture']).toBeGreaterThan(200);

    // Length distributions
    expect(corpusAudit.lengthStats.minChars).toBeGreaterThan(50);
    expect(corpusAudit.lengthStats.maxChars).toBeGreaterThan(400);
    expect(corpusAudit.lengthStats.medianChars).toBeGreaterThan(100);
    expect(corpusAudit.lengthStats.p95Chars).toBeGreaterThanOrEqual(corpusAudit.lengthStats.medianChars);

    // Immutable dataset hash
    expect(corpusAudit.datasetHash).toBe('e98f1f55d09a3a7514d6ef4dee479bcfefdb6e08fea52c71fa121e25b5dd2a42');
  });
});
