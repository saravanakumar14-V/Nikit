import { describe, it, expect } from 'vitest';
import { zaqxService } from '../services/zaqx/ZaqXService';

describe('ZaqXResearchCycle02Tokenizer: Tokenizer Audit & Token Exposure', () => {
  it('audits tokenizer token budgets, unknown token rate, and sequence percentiles', async () => {
    const report = await zaqxService.getResearchCycle02Report();
    const { tokenizerAudit } = report;

    expect(tokenizerAudit.tokenizerVersion).toBe('v1.0.0');
    expect(tokenizerAudit.vocabSize).toBe(386);
    expect(tokenizerAudit.unknownTokenCount).toBe(0);
    expect(tokenizerAudit.unknownTokenRatePercent).toBe(0.0);

    // Token accounting
    expect(tokenizerAudit.totalTokensAudited).toBeGreaterThan(60000);
    expect(tokenizerAudit.trainTokens).toBeGreaterThan(50000);
    expect(tokenizerAudit.valTokens).toBeGreaterThan(5000);
    expect(tokenizerAudit.testTokens).toBeGreaterThan(5000);

    // Compression and sequence stats
    expect(tokenizerAudit.compressionRatio).toBeGreaterThan(1.0);
    expect(tokenizerAudit.tokensPerChar).toBeGreaterThan(0.5);
    expect(tokenizerAudit.p50SeqLen).toBeGreaterThan(50);
    expect(tokenizerAudit.p95SeqLen).toBeGreaterThanOrEqual(tokenizerAudit.p50SeqLen);
    expect(tokenizerAudit.contextOverflowRatePercent).toBe(0.0);

    expect(tokenizerAudit.qualityDecision).toBe('SUITABLE FOR TRAINING');
  });
});
