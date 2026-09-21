import { ZaqXCorpusValidationStats } from '@nikit/types';
import { ZaqXTokenizer, ZAQX_SPECIAL_TOKEN_IDS, ZAQX_SPECIAL_TOKENS } from './tokenizer';

export class ZaqXTokenizerCorpusValidator {
  /**
   * Evaluates the ZaqX tokenizer against a corpus of text samples.
   * Produces actual factual corpus statistics and deterministic tokenizerHash.
   */
  static async validateAgainstCorpus(
    tokenizer: ZaqXTokenizer,
    corpusTexts: string[],
    contextLength: number = 1024
  ): Promise<ZaqXCorpusValidationStats> {
    if (!corpusTexts || corpusTexts.length === 0) {
      throw new Error('Corpus cannot be empty for tokenizer validation.');
    }

    const uniqueTokens = new Set<number>();
    let totalTokens = 0;
    let unknownCount = 0;
    let truncatedCount = 0;
    const seqLengths: number[] = [];

    for (const text of corpusTexts) {
      const tokens = tokenizer.encode(text);
      const len = tokens.length;
      seqLengths.push(len);
      totalTokens += len;

      if (len > contextLength) {
        truncatedCount++;
      }

      for (const tid of tokens) {
        uniqueTokens.add(tid);
        if (tid === ZAQX_SPECIAL_TOKEN_IDS[ZAQX_SPECIAL_TOKENS.UNK]) {
          unknownCount++;
        }
      }
    }

    seqLengths.sort((a, b) => a - b);
    const n = seqLengths.length;

    const minSeqLen = seqLengths[0];
    const maxSeqLen = seqLengths[n - 1];
    const meanSeqLen = Math.round(totalTokens / n);
    const p50SeqLen = seqLengths[Math.floor(n * 0.5)];
    const p95SeqLen = seqLengths[Math.floor(n * 0.95)] || maxSeqLen;
    const p99SeqLen = seqLengths[Math.floor(n * 0.99)] || maxSeqLen;

    const vocabSize = tokenizer.getVocabSize();
    const vocabCoveragePercent = Number(((uniqueTokens.size / vocabSize) * 100).toFixed(2));
    const unknownTokenRatePercent = Number(((unknownCount / Math.max(1, totalTokens)) * 100).toFixed(4));
    const truncationRatePercent = Number(((truncatedCount / n) * 100).toFixed(2));

    // Packing efficiency: totalTokens / (bins * contextLength)
    const binsRequired = Math.ceil(totalTokens / contextLength);
    const packingEfficiencyPercent = Number(
      ((totalTokens / (binsRequired * contextLength)) * 100).toFixed(2)
    );

    // Verify special tokens
    const testSpecial = tokenizer.encode('<|zaqx_bos|>test<|zaqx_eos|>');
    const specialTokensValid = testSpecial[0] === 0 && testSpecial[testSpecial.length - 1] === 1;

    // Compute deterministic tokenizer hash
    const tokenizerHash = `tok-zaqx-v${tokenizer.version}-vsize${vocabSize}-${uniqueTokens.size}`;

    return {
      totalSamples: n,
      totalTokens,
      uniqueTokensUsed: uniqueTokens.size,
      vocabCoveragePercent,
      unknownTokenCount: unknownCount,
      unknownTokenRatePercent,
      minSeqLen,
      maxSeqLen,
      p50SeqLen,
      p95SeqLen,
      p99SeqLen,
      meanSeqLen,
      truncationRatePercent,
      packingEfficiencyPercent,
      specialTokensValid,
      tokenizerHash,
      validatedAt: new Date().toISOString(),
    };
  }
}
