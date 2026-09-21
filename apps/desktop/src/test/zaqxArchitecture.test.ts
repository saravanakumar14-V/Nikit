import { describe, it, expect } from 'vitest';
import { ZaqXModelSpecification, ZAQX_SCALING_PRESETS } from '@nikit/zaqx';

describe('ZaqXModelSpecification: Architecture & Modular Layer Correctness', () => {
  const modelSpec = new ZaqXModelSpecification(ZAQX_SCALING_PRESETS['experimental-tiny']);

  it('computes RoPE frequencies with expected head dimensions and sequence length', () => {
    const headDim = 64; // 256 / 4
    const seqLen = 32;
    const freqs = modelSpec.computeRopeFrequencies(seqLen, headDim);

    expect(freqs.length).toBe(seqLen);
    expect(freqs[0].length).toBe(headDim / 2);
    expect(freqs[0][0]).toBe(0); // Pos 0 frequency is 0
  });

  it('generates lower-triangular causal attention mask', () => {
    const seqLen = 4;
    const mask = modelSpec.generateCausalMask(seqLen);

    expect(mask.length).toBe(4);
    // Row 0 can only attend to col 0
    expect(mask[0]).toEqual([true, false, false, false]);
    // Row 2 can attend to cols 0, 1, 2
    expect(mask[2]).toEqual([true, true, true, false]);
    // Row 3 can attend to all cols
    expect(mask[3]).toEqual([true, true, true, true]);
  });

  it('computes SwiGLU activation and RMSNorm scaling', () => {
    const swigluOut = ZaqXModelSpecification.swiglu(1.5, 2.0);
    expect(swigluOut).toBeGreaterThan(0);

    const testVector = [1.0, 2.0, 3.0, 4.0];
    const scale = ZaqXModelSpecification.rmsNormScale(testVector, 1e-5);
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1.0);
  });

  it('computes causal language modeling target shift', () => {
    const sampleTokenIds = [0, 105, 342, 89, 1];
    const shift = ZaqXModelSpecification.getCausalShift(sampleTokenIds);

    expect(shift.inputIds).toEqual([0, 105, 342, 89]);
    expect(shift.targetIds).toEqual([105, 342, 89, 1]);
  });
});
