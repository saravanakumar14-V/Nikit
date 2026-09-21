import {
  ITokenizerProvider,
  TokenizationResult,
  TokenizerType,
} from '@nikit/types';

export const ZAQX_SPECIAL_TOKENS = {
  BOS: '<|zaqx_bos|>',
  EOS: '<|zaqx_eos|>',
  PAD: '<|zaqx_pad|>',
  UNK: '<|zaqx_unk|>',
} as const;

export const ZAQX_SPECIAL_TOKEN_IDS = {
  [ZAQX_SPECIAL_TOKENS.BOS]: 0,
  [ZAQX_SPECIAL_TOKENS.EOS]: 1,
  [ZAQX_SPECIAL_TOKENS.PAD]: 2,
  [ZAQX_SPECIAL_TOKENS.UNK]: 3,
} as const;

export class ZaqXTokenizer implements ITokenizerProvider {
  readonly id = 'tokenizer-zaqx';
  readonly name = 'ZaqX Native Tokenizer';
  readonly type: TokenizerType = 'custom';
  readonly version = '1.0.0';
  readonly isAuthoritative = true;

  private vocab: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();

  constructor(customVocab?: string[]) {
    this.initVocabulary(customVocab);
  }

  private initVocabulary(extraWords?: string[]): void {
    this.vocab.clear();
    this.reverseVocab.clear();

    // 1. Register Special Tokens
    this.addToken(ZAQX_SPECIAL_TOKENS.BOS, 0);
    this.addToken(ZAQX_SPECIAL_TOKENS.EOS, 1);
    this.addToken(ZAQX_SPECIAL_TOKENS.PAD, 2);
    this.addToken(ZAQX_SPECIAL_TOKENS.UNK, 3);

    let nextId = 4;

    // 2. ASCII & Byte Fallback Tokens (IDs 4 - 259)
    for (let i = 0; i < 256; i++) {
      const char = String.fromCharCode(i);
      if (!this.vocab.has(char)) {
        this.addToken(char, nextId++);
      }
    }

    // 3. Common English & Code Subwords
    const baseSubwords = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
      'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
      'function', 'return', 'import', 'export', 'const', 'let', 'var', 'class',
      'def', 'self', 'torch', 'tensor', 'nn', 'Module', 'loss', 'step', 'model',
      'attention', 'transformer', 'zaqx', 'layer', 'hidden', 'head', 'kv',
    ];

    for (const w of baseSubwords) {
      if (!this.vocab.has(w)) {
        this.addToken(w, nextId++);
      }
      if (!this.vocab.has(` ${w}`)) {
        this.addToken(` ${w}`, nextId++);
      }
    }

    if (extraWords) {
      for (const w of extraWords) {
        if (!this.vocab.has(w)) {
          this.addToken(w, nextId++);
        }
      }
    }
  }

  private addToken(token: string, id: number): void {
    this.vocab.set(token, id);
    this.reverseVocab.set(id, token);
  }

  getVocabSize(): number {
    return this.vocab.size;
  }

  encode(text: string): number[] {
    if (!text) return [];

    const tokenIds: number[] = [];
    let i = 0;

    while (i < text.length) {
      // Check for special tokens first
      let matchedSpecial = false;
      for (const [sTok, sId] of Object.entries(ZAQX_SPECIAL_TOKEN_IDS)) {
        if (text.startsWith(sTok, i)) {
          tokenIds.push(sId);
          i += sTok.length;
          matchedSpecial = true;
          break;
        }
      }
      if (matchedSpecial) continue;

      // Greedy longest-match subword lookup
      let longestMatch: { token: string; id: number } | null = null;
      for (let len = Math.min(20, text.length - i); len > 0; len--) {
        const substr = text.substring(i, i + len);
        if (this.vocab.has(substr)) {
          longestMatch = { token: substr, id: this.vocab.get(substr)! };
          break;
        }
      }

      if (longestMatch) {
        tokenIds.push(longestMatch.id);
        i += longestMatch.token.length;
      } else {
        // Byte-level fallback
        const char = text[i];
        const id = this.vocab.get(char) ?? ZAQX_SPECIAL_TOKEN_IDS[ZAQX_SPECIAL_TOKENS.UNK];
        tokenIds.push(id);
        i++;
      }
    }

    return tokenIds;
  }

  async decode(tokenIds: number[]): Promise<string> {
    let result = '';
    for (const id of tokenIds) {
      const piece = this.reverseVocab.get(id);
      if (piece !== undefined) {
        // Omit non-printable special tokens from decoded text string
        if (
          piece === ZAQX_SPECIAL_TOKENS.BOS ||
          piece === ZAQX_SPECIAL_TOKENS.EOS ||
          piece === ZAQX_SPECIAL_TOKENS.PAD
        ) {
          continue;
        }
        result += piece;
      } else {
        result += '\uFFFD'; // Replacement character
      }
    }
    return result;
  }

  async tokenize(text: string): Promise<TokenizationResult> {
    const tokenIds = this.encode(text);
    const tokens = tokenIds.map((id) => this.reverseVocab.get(id) || `[${id}]`);

    return {
      text,
      tokens,
      tokenIds,
      tokenCount: tokenIds.length,
      isAuthoritative: true,
      tokenizerName: this.name,
    };
  }

  async countTokens(text: string): Promise<number> {
    return this.encode(text).length;
  }
}

export const zaqxTokenizer = new ZaqXTokenizer();
