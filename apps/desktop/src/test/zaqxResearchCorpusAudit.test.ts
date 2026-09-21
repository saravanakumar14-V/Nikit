import { describe, it, expect } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';

describe('ZaqXResearchCorpusAudit: Quantitative Dataset Evaluation', () => {
  const corpus = [
    'Attention is all you need for decoder-only neural language models.',
    'Grouped-query attention (GQA) reduces key-value memory bandwidth.',
    'SwiGLU feed-forward networks provide superior non-linear representations.',
    'Rotary positional embedding (RoPE) injects relative position information.',
    'RMSNorm normalizes activation vectors by their root mean square.',
    'Causal language modeling trains a transformer to predict the next token.',
    'The sun rises in the east and sets in the west every day.',
    'Paris is the capital and largest city of France.',
    'Python is a high-level interpreted programming language.',
    'Water boils at 100 degrees Celsius at sea level.',
  ];

  it('performs quantitative corpus audit without fabricating statistics', async () => {
    const audit = await zaqxService.auditCorpus(corpus, 'ds-zaqx-r01-test-v1');

    expect(audit.recordCount).toBe(10);
    expect(audit.charCount).toBeGreaterThan(300);
    expect(audit.wordCount).toBeGreaterThan(40);
    expect(audit.duplicateCount).toBe(0);
    expect(audit.duplicateRatePercent).toBe(0);

    expect(audit.trainCount).toBeGreaterThanOrEqual(1);
    expect(audit.valCount).toBeGreaterThanOrEqual(1);
    expect(audit.testCount).toBeGreaterThanOrEqual(1);
    expect(audit.exactLeakageOverlapCount).toBe(0);

    expect(audit.lengthStats.minChars).toBeGreaterThan(0);
    expect(audit.lengthStats.maxChars).toBeGreaterThanOrEqual(audit.lengthStats.minChars);
    expect(audit.lengthStats.medianChars).toBeGreaterThan(0);
    expect(audit.lengthStats.p95Chars).toBeGreaterThanOrEqual(audit.lengthStats.medianChars);

    expect(audit.qualityClassification.duplication).toContain('0%');
    expect(audit.datasetHash).toBeDefined();
  });

  it('detects duplicate records and computes exact duplicate percentage', async () => {
    const withDuplicates = [
      'Same exact sentence for testing duplicates.',
      'Same exact sentence for testing duplicates.',
      'A different unique sentence for testing.',
    ];

    const audit = await zaqxService.auditCorpus(withDuplicates, 'ds-zaqx-r01-dup-v1');
    expect(audit.recordCount).toBe(3);
    expect(audit.duplicateCount).toBe(1);
    expect(audit.duplicateRatePercent).toBe(33.33);
  });
});
