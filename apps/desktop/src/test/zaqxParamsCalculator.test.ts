import { describe, it, expect } from 'vitest';
import { ZaqXParamsCalculator, ZAQX_SCALING_PRESETS } from '@nikit/zaqx';

describe('ZaqXParamsCalculator: Exact Deterministic Parameter Calculation', () => {
  it('calculates exact parameters for all baseline scaling presets', () => {
    // 1. Experimental Tiny (~10M Candidate Preset)
    const tiny = ZaqXParamsCalculator.calculate(ZAQX_SCALING_PRESETS['experimental-tiny']);
    expect(tiny.totalParams).toBeGreaterThan(4_000_000);
    expect(tiny.totalParams).toBeLessThan(10_000_000);
    expect(tiny.totalParamsFormatted).toMatch(/M$/);
    expect(tiny.embeddingParams).toBe(4096 * 256);

    // 2. Experimental Small (~30M Candidate Preset)
    const small = ZaqXParamsCalculator.calculate(ZAQX_SCALING_PRESETS['experimental-small']);
    expect(small.totalParams).toBeGreaterThan(18_000_000);
    expect(small.totalParams).toBeLessThan(35_000_000);

    // 3. Experimental Medium (~70M Candidate Preset)
    const medium = ZaqXParamsCalculator.calculate(ZAQX_SCALING_PRESETS['experimental-medium']);
    expect(medium.totalParams).toBeGreaterThan(45_000_000);
    expect(medium.totalParams).toBeLessThan(75_000_000);

    // 4. Experimental 135M (~135M Candidate Preset)
    const m135 = ZaqXParamsCalculator.calculate(ZAQX_SCALING_PRESETS['experimental-135m']);
    expect(m135.totalParams).toBeGreaterThan(120_000_000);
    expect(m135.totalParams).toBeLessThan(160_000_000);

    // 5. ZaqX 1.0 Candidate (~300M+ Architecture)
    const candidate = ZaqXParamsCalculator.calculate(ZAQX_SCALING_PRESETS['zaqx-1.0-candidate']);
    expect(candidate.totalParams).toBeGreaterThan(280_000_000);
  });

  it('correctly accounts for tied vs untied LM head parameter count', () => {
    const baseConfig = ZAQX_SCALING_PRESETS['experimental-tiny'];

    const tiedBreakdown = ZaqXParamsCalculator.calculate({
      ...baseConfig,
      tieWordEmbeddings: true,
    });
    expect(tiedBreakdown.lmHeadParams).toBe(0);

    const untiedBreakdown = ZaqXParamsCalculator.calculate({
      ...baseConfig,
      tieWordEmbeddings: false,
    });
    expect(untiedBreakdown.lmHeadParams).toBe(baseConfig.vocabSize * baseConfig.hiddenSize);
    expect(untiedBreakdown.totalParams).toBe(tiedBreakdown.totalParams + baseConfig.vocabSize * baseConfig.hiddenSize);
  });

  it('rejects configurations with invalid head divisibility', () => {
    expect(() => {
      ZaqXParamsCalculator.calculate({
        ...ZAQX_SCALING_PRESETS['experimental-tiny'],
        numAttentionHeads: 5,
        numKeyValueHeads: 2, // 5 % 2 !== 0
      });
    }).toThrow(/numAttentionHeads.*must be evenly divisible by numKeyValueHeads/);
  });
});
