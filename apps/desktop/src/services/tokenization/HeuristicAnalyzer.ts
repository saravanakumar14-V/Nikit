import { ITokenizerProvider, TokenizationResult, TokenizerType } from '@nikit/types';

export class HeuristicAnalyzer implements ITokenizerProvider {
  readonly id = 'heuristic-analyzer';
  readonly name = 'Heuristic Analysis (Not Model Tokenization)';
  readonly type: TokenizerType = 'heuristic_analyzer';
  readonly version = '1.0.0';
  readonly isAuthoritative = false;

  async tokenize(text: string): Promise<TokenizationResult> {
    if (!text) {
      return {
        text: '',
        tokens: [],
        tokenIds: [],
        tokenCount: 0,
        isAuthoritative: false,
        tokenizerName: this.name,
      };
    }

    // Heuristic word/punctuation regex splitter for non-authoritative estimation
    const rawMatches = text.match(/\w+|[^\s\w]/g) || [];
    const tokens: string[] = [];
    const tokenIds: number[] = [];

    for (let i = 0; i < rawMatches.length; i++) {
      const piece = rawMatches[i];
      tokens.push(piece);
      // Hash-based pseudo token ID
      let hash = 0;
      for (let j = 0; j < piece.length; j++) {
        hash = (hash << 5) - hash + piece.charCodeAt(j);
        hash |= 0;
      }
      tokenIds.push(Math.abs(hash) % 32000);
    }

    return {
      text,
      tokens,
      tokenIds,
      tokenCount: tokens.length,
      isAuthoritative: false,
      tokenizerName: this.name,
    };
  }

  async countTokens(text: string): Promise<number> {
    const result = await this.tokenize(text);
    return result.tokenCount;
  }

  async decode(tokenIds: number[]): Promise<string> {
    return `[Heuristic Preview: ${tokenIds.length} tokens]`;
  }
}

export const heuristicAnalyzer = new HeuristicAnalyzer();
