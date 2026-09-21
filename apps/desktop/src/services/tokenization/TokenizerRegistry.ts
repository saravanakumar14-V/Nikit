import { ITokenizerProvider } from '@nikit/types';
import { llamaCppTokenizer } from './LlamaCppTokenizer';
import { heuristicAnalyzer } from './HeuristicAnalyzer';

export class TokenizerRegistry {
  private tokenizers: Map<string, ITokenizerProvider> = new Map();
  private modelBindings: Map<string, string> = new Map();

  constructor() {
    this.register(llamaCppTokenizer);
    this.register(heuristicAnalyzer);

    // Bind default local models to llama.cpp tokenizer
    this.bindModelToTokenizer('smollm2', llamaCppTokenizer.id);
    this.bindModelToTokenizer('smollm2-135m-instruct', llamaCppTokenizer.id);
  }

  register(tokenizer: ITokenizerProvider): void {
    this.tokenizers.set(tokenizer.id, tokenizer);
  }

  unregister(id: string): boolean {
    return this.tokenizers.delete(id);
  }

  get(id: string): ITokenizerProvider | null {
    return this.tokenizers.get(id) || null;
  }

  list(): ITokenizerProvider[] {
    return Array.from(this.tokenizers.values());
  }

  bindModelToTokenizer(modelId: string, tokenizerId: string): void {
    this.modelBindings.set(modelId, tokenizerId);
  }

  resolveForModel(modelId: string): ITokenizerProvider {
    const boundId = this.modelBindings.get(modelId);
    if (boundId && this.tokenizers.has(boundId)) {
      return this.tokenizers.get(boundId)!;
    }

    // Default fallback: if model is a local llama.cpp model, use llamaCppTokenizer
    if (modelId.includes('smollm') || modelId.includes('gguf') || modelId.includes('local')) {
      return llamaCppTokenizer;
    }

    // Otherwise return heuristic analyzer with explicit non-authoritative flag
    return heuristicAnalyzer;
  }
}

export const tokenizerRegistry = new TokenizerRegistry();
