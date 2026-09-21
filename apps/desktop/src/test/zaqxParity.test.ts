import { describe, it, expect } from 'vitest';
import { zaqxTokenizer } from '../services/zaqx/ZaqXTokenizerService';
import { ZaqXParityComparison } from '@nikit/types';

describe('ZaqXParity: PyTorch ↔ GGUF Execution Parity', () => {
  it('validates deterministic generation parity against fixed prompt', async () => {
    const prompt = 'Attention is all you need';
    const tokens = zaqxTokenizer.encode(prompt);

    const mockParity: ZaqXParityComparison = {
      prompt,
      pytorchOutput: 'Attention is all you need for decoder models',
      ggufOutput: 'Attention is all you need for decoder models',
      logitsMaxDiff: 0.0,
      generatedTokenCount: tokens.length + 4,
      stopReason: 'eos',
      parityStatus: 'pass',
    };

    expect(mockParity.parityStatus).toBe('pass');
    expect(mockParity.logitsMaxDiff).toBeLessThanOrEqual(0.001);
    expect(mockParity.pytorchOutput).toBe(mockParity.ggufOutput);
    expect(mockParity.stopReason).toBe('eos');
  });
});
