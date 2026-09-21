import { ZaqXConfig, ZaqXParameterBreakdown } from '@nikit/types';
import { validateZaqXConfig } from './config';

export class ZaqXParamsCalculator {
  /**
   * Calculates the exact parameter breakdown for a ZaqX architectural configuration.
   * Matches the exact tensor definitions of the PyTorch and TypeScript ZaqX models.
   */
  static calculate(config: ZaqXConfig): ZaqXParameterBreakdown {
    const validation = validateZaqXConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid ZaqX configuration: ${validation.errors.join(', ')}`);
    }

    const {
      hiddenSize: H,
      numLayers: L,
      numAttentionHeads: nHeads,
      numKeyValueHeads: nKVHeads,
      intermediateSize: I,
      vocabSize: V,
      tieWordEmbeddings,
    } = config;

    const headDim = H / nHeads;

    // 1. Embedding Parameters: V * H
    const embeddingParams = V * H;

    // 2. Attention Parameters per layer:
    // W_q: H * H
    // W_k: H * (nKVHeads * headDim)
    // W_v: H * (nKVHeads * headDim)
    // W_o: H * H
    const qParams = H * H;
    const kParams = H * (nKVHeads * headDim);
    const vParams = H * (nKVHeads * headDim);
    const oParams = H * H;
    const attnPerLayer = qParams + kParams + vParams + oParams;
    const attentionParams = L * attnPerLayer;

    // 3. SwiGLU MLP Parameters per layer:
    // Gate: H * I
    // Up: H * I
    // Down: I * H
    const mlpPerLayer = 3 * H * I;
    const mlpParams = L * mlpPerLayer;

    // 4. RMSNorm Parameters:
    // (InputNorm + PostAttnNorm) * L + FinalNorm
    const normParams = (2 * L + 1) * H;

    // 5. LM Head Parameters:
    // If tied, uses embedding weights (0 extra params). If untied: H * V
    const lmHeadParams = tieWordEmbeddings ? 0 : H * V;

    const totalParams = embeddingParams + attentionParams + mlpParams + normParams + lmHeadParams;
    const trainableParams = totalParams;

    // Formatted representation
    let formatted = `${(totalParams / 1e6).toFixed(2)}M`;
    if (totalParams >= 1e9) {
      formatted = `${(totalParams / 1e9).toFixed(2)}B`;
    } else if (totalParams < 1e6) {
      formatted = `${(totalParams / 1e3).toFixed(1)}K`;
    }

    return {
      totalParams,
      trainableParams,
      embeddingParams,
      attentionParams,
      mlpParams,
      lmHeadParams,
      normParams,
      totalParamsFormatted: formatted,
    };
  }
}
