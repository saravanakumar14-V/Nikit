import {
  ITokenizerProvider,
  TokenLengthDistribution,
  PackingAnalysisResult,
  DatasetRecord,
} from '@nikit/types';

export class TokenAnalysisService {
  /**
   * Computes sequence length statistics and percentile distribution across dataset records.
   */
  static async analyzeSequenceLengths(
    records: DatasetRecord[],
    tokenizer: ITokenizerProvider,
    contextLimit: number = 2048
  ): Promise<TokenLengthDistribution> {
    if (records.length === 0) {
      return {
        minTokens: 0,
        maxTokens: 0,
        meanTokens: 0,
        medianTokens: 0,
        p95Tokens: 0,
        p99Tokens: 0,
        contextLimit,
        withinLimitPercentage: 100,
        exceededPercentage: 0,
        isAuthoritative: tokenizer.isAuthoritative,
      };
    }

    const tokenCounts: number[] = [];

    for (const r of records) {
      const count = await tokenizer.countTokens(r.text);
      tokenCounts.push(count);
    }

    tokenCounts.sort((a, b) => a - b);
    const total = tokenCounts.length;
    const totalSum = tokenCounts.reduce((acc, c) => acc + c, 0);

    const minTokens = tokenCounts[0];
    const maxTokens = tokenCounts[total - 1];
    const meanTokens = Math.round(totalSum / total);
    const medianTokens = tokenCounts[Math.floor(total * 0.5)];
    const p95Tokens = tokenCounts[Math.floor(total * 0.95)] || maxTokens;
    const p99Tokens = tokenCounts[Math.floor(total * 0.99)] || maxTokens;

    const exceededCount = tokenCounts.filter((c) => c > contextLimit).length;
    const exceededPercentage = Number(((exceededCount / total) * 100).toFixed(1));
    const withinLimitPercentage = Number((100 - exceededPercentage).toFixed(1));

    return {
      minTokens,
      maxTokens,
      meanTokens,
      medianTokens,
      p95Tokens,
      p99Tokens,
      contextLimit,
      withinLimitPercentage,
      exceededPercentage,
      isAuthoritative: tokenizer.isAuthoritative,
    };
  }

  /**
   * Estimates sequence packing efficiency and truncation waste for a target context length.
   */
  static async analyzePacking(
    records: DatasetRecord[],
    tokenizer: ITokenizerProvider,
    targetContextLength: number = 2048
  ): Promise<PackingAnalysisResult> {
    if (records.length === 0) {
      return {
        targetContextLength,
        totalTokens: 0,
        packingEfficiency: 100,
        truncationRate: 0,
        estimatedWastedTokens: 0,
      };
    }

    let totalTokens = 0;
    let truncatedCount = 0;
    let currentBinFill = 0;
    let totalBinsUsed = 1;

    for (const r of records) {
      const count = await tokenizer.countTokens(r.text);
      totalTokens += count;

      if (count > targetContextLength) {
        truncatedCount++;
      }

      if (currentBinFill + count <= targetContextLength) {
        currentBinFill += count;
      } else {
        totalBinsUsed++;
        currentBinFill = Math.min(count, targetContextLength);
      }
    }

    const totalCapacity = totalBinsUsed * targetContextLength;
    const estimatedWastedTokens = Math.max(0, totalCapacity - totalTokens);
    const packingEfficiency =
      totalCapacity > 0
        ? Number(((Math.min(totalTokens, totalCapacity) / totalCapacity) * 100).toFixed(1))
        : 100;
    const truncationRate = Number(((truncatedCount / records.length) * 100).toFixed(1));

    return {
      targetContextLength,
      totalTokens,
      packingEfficiency,
      truncationRate,
      estimatedWastedTokens,
    };
  }
}
