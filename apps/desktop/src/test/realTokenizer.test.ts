import { describe, it, expect, vi } from 'vitest';
import { LlamaCppTokenizer } from '../services/tokenization/LlamaCppTokenizer';
import { LlamaCppRuntime } from '../services/runtimes/llamacpp/LlamaCppRuntime';

describe('LlamaCppTokenizer: Live /tokenize & /detokenize Acceptance Protocol', () => {
  it('executes authoritative tokenization and detokenization round-trip', async () => {
    // Mock runtime in ready state with base URL
    const mockRuntime = {
      getBaseUrl: () => 'http://127.0.0.1:8080',
      getStatus: () => 'ready' as const,
    } as unknown as LlamaCppRuntime;

    const tokenizer = new LlamaCppTokenizer(mockRuntime);
    expect(tokenizer.isAuthoritative).toBe(true);

    // Mock fetch for /tokenize and /detokenize endpoints exposed by llama-server
    const sampleText = 'Attention is all you need.';
    const sampleTokens = [
      { id: 1234, piece: 'Attention' },
      { id: 318, piece: ' is' },
      { id: 477, piece: ' all' },
      { id: 345, piece: ' you' },
      { id: 761, piece: ' need' },
      { id: 13, piece: '.' },
    ];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/tokenize')) {
        const body = JSON.parse(init?.body as string);
        expect(body.content).toBe(sampleText);
        expect(body.with_pieces).toBe(true);
        return {
          ok: true,
          status: 200,
          json: async () => ({ tokens: sampleTokens }),
        } as unknown as Response;
      }

      if (url.includes('/detokenize')) {
        const body = JSON.parse(init?.body as string);
        expect(body.tokens).toEqual([1234, 318, 477, 345, 761, 13]);
        return {
          ok: true,
          status: 200,
          json: async () => ({ content: sampleText }),
        } as unknown as Response;
      }

      throw new Error(`Unexpected endpoint: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    // 1. Authoritative Tokenize
    const tokenResult = await tokenizer.tokenize(sampleText);
    expect(tokenResult.isAuthoritative).toBe(true);
    expect(tokenResult.tokenCount).toBe(6);
    expect(tokenResult.tokenIds).toEqual([1234, 318, 477, 345, 761, 13]);
    expect(tokenResult.tokens).toEqual(['Attention', ' is', ' all', ' you', ' need', '.']);

    // 2. Count Tokens
    const count = await tokenizer.countTokens(sampleText);
    expect(count).toBe(6);

    // 3. Authoritative Detokenize (Round-Trip)
    const decoded = await tokenizer.decode(tokenResult.tokenIds);
    expect(decoded).toBe(sampleText);

    vi.unstubAllGlobals();
  });
});
