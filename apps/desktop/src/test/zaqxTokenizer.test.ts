import { describe, it, expect } from 'vitest';
import { zaqxTokenizer, ZAQX_SPECIAL_TOKENS, ZAQX_SPECIAL_TOKEN_IDS } from '@nikit/zaqx';

describe('ZaqXTokenizer: Native Vocabulary & Round-Trip Acceptance', () => {
  it('has explicit special tokens defined with expected IDs', () => {
    expect(ZAQX_SPECIAL_TOKENS.BOS).toBe('<|zaqx_bos|>');
    expect(ZAQX_SPECIAL_TOKENS.EOS).toBe('<|zaqx_eos|>');
    expect(ZAQX_SPECIAL_TOKENS.PAD).toBe('<|zaqx_pad|>');
    expect(ZAQX_SPECIAL_TOKENS.UNK).toBe('<|zaqx_unk|>');

    expect(ZAQX_SPECIAL_TOKEN_IDS['<|zaqx_bos|>']).toBe(0);
    expect(ZAQX_SPECIAL_TOKEN_IDS['<|zaqx_eos|>']).toBe(1);
    expect(ZAQX_SPECIAL_TOKEN_IDS['<|zaqx_pad|>']).toBe(2);
    expect(ZAQX_SPECIAL_TOKEN_IDS['<|zaqx_unk|>']).toBe(3);
  });

  it('encodes and decodes text deterministically in round-trip tests', async () => {
    const text = 'Attention is all you need for transformer models.';
    const encoded = zaqxTokenizer.encode(text);

    expect(encoded.length).toBeGreaterThan(0);
    expect(Array.isArray(encoded)).toBe(true);

    const decoded = await zaqxTokenizer.decode(encoded);
    expect(decoded).toBe(text);
  });

  it('handles special tokens seamlessly', async () => {
    const text = '<|zaqx_bos|>Hello world<|zaqx_eos|>';
    const encoded = zaqxTokenizer.encode(text);

    expect(encoded[0]).toBe(0); // BOS
    expect(encoded[encoded.length - 1]).toBe(1); // EOS

    const count = await zaqxTokenizer.countTokens(text);
    expect(count).toBe(encoded.length);
  });

  it('reports authoritative status and vocabulary size', () => {
    expect(zaqxTokenizer.isAuthoritative).toBe(true);
    expect(zaqxTokenizer.getVocabSize()).toBeGreaterThan(256);
  });
});
