import { ZaqXConfig } from '@nikit/types';
import { validateZaqXConfig } from './config';

export interface TensorShape {
  batch: number;
  seqLen: number;
  dim: number;
}

export class ZaqXModelSpecification {
  readonly config: ZaqXConfig;

  constructor(config: ZaqXConfig) {
    const validation = validateZaqXConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid ZaqX configuration: ${validation.errors.join(', ')}`);
    }
    this.config = { ...config };
  }

  /**
   * Computes RoPE rotary angle frequencies for a sequence length.
   */
  computeRopeFrequencies(seqLen: number, headDim: number): number[][] {
    const freqs: number[][] = [];
    const theta = this.config.ropeTheta || 10000.0;

    for (let pos = 0; pos < seqLen; pos++) {
      const posFreqs: number[] = [];
      for (let i = 0; i < headDim; i += 2) {
        const freq = 1.0 / Math.pow(theta, i / headDim);
        posFreqs.push(pos * freq);
      }
      freqs.push(posFreqs);
    }

    return freqs;
  }

  /**
   * Generates a lower-triangular causal attention mask of size [seqLen, seqLen].
   */
  generateCausalMask(seqLen: number): boolean[][] {
    const mask: boolean[][] = [];
    for (let i = 0; i < seqLen; i++) {
      const row: boolean[] = [];
      for (let j = 0; j < seqLen; j++) {
        // True if position j can attend to position i (j <= i)
        row.push(j <= i);
      }
      mask.push(row);
    }
    return mask;
  }

  /**
   * Computes SwiGLU activation: (x * silu(gate)) * up
   */
  static swiglu(gate: number, up: number): number {
    const silu = gate / (1.0 + Math.exp(-gate));
    return silu * up;
  }

  /**
   * Computes RMSNorm scale factor: 1 / sqrt(mean(x^2) + eps)
   */
  static rmsNormScale(x: number[], eps: number = 1e-5): number {
    const meanSquare = x.reduce((acc, val) => acc + val * val, 0) / x.length;
    return 1.0 / Math.sqrt(meanSquare + eps);
  }

  /**
   * Validates output tensor shape given input batch size and sequence length.
   */
  validateLogitsShape(batchSize: number, seqLen: number): { batch: number; seqLen: number; vocabSize: number } {
    return {
      batch: batchSize,
      seqLen,
      vocabSize: this.config.vocabSize,
    };
  }

  /**
   * Computes causal language modeling target shift indices:
   * Input: tokens[0 : N - 1]
   * Target: tokens[1 : N]
   */
  static getCausalShift(tokenIds: number[]): { inputIds: number[]; targetIds: number[] } {
    if (tokenIds.length < 2) {
      throw new Error('Causal LM shift requires at least 2 tokens.');
    }
    return {
      inputIds: tokenIds.slice(0, -1),
      targetIds: tokenIds.slice(1),
    };
  }
}
