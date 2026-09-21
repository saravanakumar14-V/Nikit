import { describe, it, expect } from 'vitest';
import { zaqxTokenizer } from '../services/zaqx/ZaqXTokenizerService';
import { ZaqXTokenizerCorpusValidator } from '@nikit/zaqx';

describe('ZaqXTokenizerCorpusValidator: Authoritative Corpus Analysis', () => {
  const sampleCorpus = [
    'Attention is all you need for decoder-only language models.',
    'Grouped-query attention (GQA) reduces key-value memory bandwidth during auto-regressive decoding.',
    'SwiGLU feed-forward networks provide superior non-linear representations compared to standard GELU.',
    'Rotary positional embedding (RoPE) injects relative position information directly into query and key projections.',
    'RMSNorm normalizes activation vectors by their root mean square to stabilize transformer gradient backpropagation.',
    'Nikit provides quiet intelligence for local developers and privacy-first workflows.'
  ];

  it('computes factual corpus metrics without fabricating values', async () => {
    const stats = await ZaqXTokenizerCorpusValidator.validateAgainstCorpus(
      zaqxTokenizer,
      sampleCorpus,
      1024
    );

    expect(stats.totalSamples).toBe(6);
    expect(stats.totalTokens).toBeGreaterThan(50);
    expect(stats.uniqueTokensUsed).toBeGreaterThan(20);
    expect(stats.vocabCoveragePercent).toBeGreaterThan(0);
    expect(stats.vocabCoveragePercent).toBeLessThanOrEqual(100);

    expect(stats.minSeqLen).toBeGreaterThan(0);
    expect(stats.maxSeqLen).toBeGreaterThanOrEqual(stats.minSeqLen);
    expect(stats.p50SeqLen).toBeGreaterThan(0);
    expect(stats.p95SeqLen).toBeGreaterThanOrEqual(stats.p50SeqLen);
    expect(stats.p99SeqLen).toBeGreaterThanOrEqual(stats.p95SeqLen);

    expect(stats.truncationRatePercent).toBe(0); // None exceeds 1024 context
    expect(stats.packingEfficiencyPercent).toBeGreaterThan(0);
    expect(stats.specialTokensValid).toBe(true);
    expect(stats.tokenizerHash).toMatch(/^tok-zaqx-/);
  });

  it('rejects empty corpus gracefully', async () => {
    await expect(
      ZaqXTokenizerCorpusValidator.validateAgainstCorpus(zaqxTokenizer, [], 1024)
    ).rejects.toThrow('Corpus cannot be empty');
  });
});
