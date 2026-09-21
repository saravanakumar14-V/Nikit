import { describe, it, expect } from 'vitest';
import { zaqxTokenizer } from '../services/zaqx/ZaqXTokenizerService';
import { ZaqXTokenizerCorpusValidator } from '@nikit/zaqx';

describe('ZaqXResearchTokenizerAudit: Authoritative Tokenizer Metrics', () => {
  const corpus = [
    'The quick brown fox jumps over the lazy dog.',
    'Transformers use self-attention to model long-range sequence dependencies.',
    'Language models optimize cross-entropy loss over discrete token distributions.',
  ];

  it('audits vocabulary coverage, unknown rate, and sequence percentiles', async () => {
    const stats = await ZaqXTokenizerCorpusValidator.validateAgainstCorpus(zaqxTokenizer, corpus, 1024);

    expect(stats.totalSamples).toBe(3);
    expect(stats.totalTokens).toBeGreaterThan(15);
    expect(stats.unknownTokenCount).toBe(0);
    expect(stats.unknownTokenRatePercent).toBe(0);
    expect(stats.p50SeqLen).toBeGreaterThan(0);
    expect(stats.p95SeqLen).toBeGreaterThanOrEqual(stats.p50SeqLen);
    expect(stats.p99SeqLen).toBeGreaterThanOrEqual(stats.p95SeqLen);
    expect(stats.specialTokensValid).toBe(true);
    expect(stats.tokenizerHash).toMatch(/^tok-zaqx-/);
  });
});
