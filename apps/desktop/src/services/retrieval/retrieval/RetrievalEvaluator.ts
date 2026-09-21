import {
  EvaluationItem,
  EvaluationMetrics,
  RetrievalConfig,
} from '@nikit/types';
import { IRetrievalEvaluator, IHybridRetriever } from '../types';
import { hybridRetriever } from './HybridRetriever';
import { DEFAULT_RETRIEVAL_CONFIG } from '../config';

export class RetrievalEvaluator implements IRetrievalEvaluator {
  private retriever: IHybridRetriever;

  constructor(retriever: IHybridRetriever = hybridRetriever) {
    this.retriever = retriever;
  }

  async evaluate(
    dataset: EvaluationItem[],
    configOverride?: Partial<RetrievalConfig>
  ): Promise<EvaluationMetrics> {
    const config: RetrievalConfig = {
      ...DEFAULT_RETRIEVAL_CONFIG,
      ...(configOverride || {}),
    };

    let totalRecall = 0;
    let totalPrecision = 0;
    let totalHits = 0;
    let totalReciprocalRank = 0;

    const evaluations: EvaluationMetrics['evaluations'] = [];

    for (const item of dataset) {
      const result = await this.retriever.retrieve(item.query, {
        config,
        filters: item.filters,
      });

      const retrievedIds = result.results.map((r) => r.chunkId);
      const expectedSet = new Set(item.expectedChunkIds);

      let matchedCount = 0;
      let firstRank: number | null = null;

      retrievedIds.forEach((id, idx) => {
        if (expectedSet.has(id)) {
          matchedCount++;
          if (firstRank === null) {
            firstRank = idx + 1;
          }
        }
      });

      const recall =
        item.expectedChunkIds.length > 0
          ? matchedCount / item.expectedChunkIds.length
          : 0;
      const precision =
        retrievedIds.length > 0 ? matchedCount / retrievedIds.length : 0;
      const isHit = matchedCount > 0;
      const reciprocalRank = firstRank !== null ? 1 / firstRank : 0;

      totalRecall += recall;
      totalPrecision += precision;
      if (isHit) totalHits++;
      totalReciprocalRank += reciprocalRank;

      evaluations.push({
        query: item.query,
        recallAtK: Math.round(recall * 1000) / 1000,
        precisionAtK: Math.round(precision * 1000) / 1000,
        hitAtK: isHit,
        reciprocalRank: Math.round(reciprocalRank * 1000) / 1000,
        retrievedChunkIds: retrievedIds,
        expectedChunkIds: item.expectedChunkIds,
      });
    }

    const totalQueries = dataset.length;

    return {
      totalQueries,
      meanRecallAtK:
        totalQueries > 0 ? Math.round((totalRecall / totalQueries) * 1000) / 1000 : 0,
      meanPrecisionAtK:
        totalQueries > 0 ? Math.round((totalPrecision / totalQueries) * 1000) / 1000 : 0,
      hitRateAtK:
        totalQueries > 0 ? Math.round((totalHits / totalQueries) * 1000) / 1000 : 0,
      meanReciprocalRank:
        totalQueries > 0
          ? Math.round((totalReciprocalRank / totalQueries) * 1000) / 1000
          : 0,
      topK: config.topK,
      evaluations,
    };
  }
}

export const retrievalEvaluator = new RetrievalEvaluator();
