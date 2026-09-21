import { ITokenizerProvider, TokenizationResult, TokenizerType } from '@nikit/types';
import { llamaCppRuntime, LlamaCppRuntime } from '../runtimes/llamacpp/LlamaCppRuntime';

export class LlamaCppTokenizer implements ITokenizerProvider {
  readonly id = 'tokenizer-llamacpp';
  readonly name = 'llama.cpp GGUF Tokenizer';
  readonly type: TokenizerType = 'llamacpp';
  readonly version = '1.0.0';
  readonly isAuthoritative = true;

  private runtime: LlamaCppRuntime;

  constructor(runtime: LlamaCppRuntime = llamaCppRuntime) {
    this.runtime = runtime;
  }

  async tokenize(text: string): Promise<TokenizationResult> {
    const baseUrl = this.runtime.getBaseUrl();
    if (!baseUrl || this.runtime.getStatus() !== 'ready') {
      throw new Error(
        'llama.cpp runtime is not ready. Load an active GGUF model to perform authoritative tokenization.'
      );
    }

    try {
      const res = await fetch(`${baseUrl}/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          with_pieces: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`llama-server /tokenize error (${res.status}): ${await res.text()}`);
      }

      const data = await res.json();
      // data: { tokens: [ { id: 123, piece: "Hello" } | number ] }
      const rawTokens = data.tokens || [];
      const tokenIds: number[] = [];
      const tokens: string[] = [];

      for (const item of rawTokens) {
        if (typeof item === 'number') {
          tokenIds.push(item);
          tokens.push(`[${item}]`);
        } else if (item && typeof item === 'object') {
          tokenIds.push(item.id ?? 0);
          tokens.push(item.piece ?? `[${item.id}]`);
        }
      }

      return {
        text,
        tokens,
        tokenIds,
        tokenCount: tokenIds.length,
        isAuthoritative: true,
        tokenizerName: this.name,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Authoritative tokenization failed: ${msg}`);
    }
  }

  async countTokens(text: string): Promise<number> {
    const result = await this.tokenize(text);
    return result.tokenCount;
  }

  async decode(tokenIds: number[]): Promise<string> {
    const baseUrl = this.runtime.getBaseUrl();
    if (!baseUrl || this.runtime.getStatus() !== 'ready') {
      throw new Error(
        'llama.cpp runtime is not ready. Load an active GGUF model to perform authoritative detokenization.'
      );
    }

    try {
      const res = await fetch(`${baseUrl}/detokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: tokenIds,
        }),
      });

      if (!res.ok) {
        throw new Error(`llama-server /detokenize error (${res.status}): ${await res.text()}`);
      }

      const data = await res.json();
      return data.content ?? '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Authoritative detokenization failed: ${msg}`);
    }
  }
}

export const llamaCppTokenizer = new LlamaCppTokenizer();
