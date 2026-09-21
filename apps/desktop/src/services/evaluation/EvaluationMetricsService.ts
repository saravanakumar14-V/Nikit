import { EvaluationMetricResult } from '@nikit/types';

export class EvaluationMetricsService {
  /**
   * Evaluates Exact Match metric (1.0 for match, 0.0 for mismatch).
   */
  static evaluateExactMatch(actual: string, expected?: string): EvaluationMetricResult {
    if (!expected) {
      return { metric: 'exact_match', score: 0, isAvailable: false, details: 'No expected output defined.' };
    }

    const normActual = actual.trim().toLowerCase();
    const normExpected = expected.trim().toLowerCase();
    const isMatch = normActual === normExpected || normActual.includes(normExpected);

    return {
      metric: 'exact_match',
      score: isMatch ? 1.0 : 0.0,
      details: isMatch ? 'Exact match satisfied' : 'Content differed from ground truth',
      isAvailable: true,
    };
  }

  /**
   * Evaluates Character Similarity (Dice coefficient / character n-gram overlap between 0.0 and 1.0).
   */
  static evaluateCharSimilarity(actual: string, expected?: string): EvaluationMetricResult {
    if (!expected) {
      return { metric: 'char_similarity', score: 0, isAvailable: false, details: 'No expected output defined.' };
    }

    const a = actual.trim().toLowerCase();
    const b = expected.trim().toLowerCase();

    if (a === b) {
      return { metric: 'char_similarity', score: 1.0, isAvailable: true };
    }
    if (!a || !b) {
      return { metric: 'char_similarity', score: 0.0, isAvailable: true };
    }

    const bigramsA = new Set<string>();
    for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));

    const bigramsB = new Set<string>();
    for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

    let intersection = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) intersection++;
    }

    const total = bigramsA.size + bigramsB.size;
    const score = total > 0 ? Number(((2 * intersection) / total).toFixed(3)) : 0;

    return {
      metric: 'char_similarity',
      score,
      details: `Similarity score: ${score}`,
      isAvailable: true,
    };
  }

  /**
   * Evaluates Length and Non-Empty compliance.
   */
  static evaluateLengthCheck(actual: string, minLength: number = 1, maxLength: number = 10000): EvaluationMetricResult {
    const len = actual.trim().length;
    const valid = len >= minLength && len <= maxLength;

    return {
      metric: 'length_check',
      score: valid ? 1.0 : 0.0,
      details: `Output length: ${len} chars (bound: [${minLength}, ${maxLength}])`,
      isAvailable: true,
    };
  }

  /**
   * Evaluates Perplexity.
   * Invariant: Never approximate perplexity from latency or character counts.
   * Only calculates when runtime provides token log-probabilities.
   */
  static evaluatePerplexity(tokenLogprobs?: number[]): EvaluationMetricResult {
    if (!tokenLogprobs || tokenLogprobs.length === 0) {
      return {
        metric: 'perplexity',
        score: 0,
        isAvailable: false,
        details: 'Perplexity unavailable: runtime does not expose token log-probabilities.',
      };
    }

    const avgNll = -tokenLogprobs.reduce((acc, lp) => acc + lp, 0) / tokenLogprobs.length;
    const perplexity = Math.exp(avgNll);

    return {
      metric: 'perplexity',
      score: Number(perplexity.toFixed(2)),
      details: `Perplexity: ${perplexity.toFixed(2)} (NLL: ${avgNll.toFixed(3)})`,
      isAvailable: true,
    };
  }
}
