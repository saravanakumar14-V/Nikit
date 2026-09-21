import {
  DocumentChunk,
  RetrievedChunk,
  RetrievalConfig,
  RetrievalSource,
} from '@nikit/types';

export interface ScoredCandidate {
  chunkId: string;
  score: number;
}

export class Ranking {
  /**
   * Fuses vector and lexical candidates using Reciprocal Rank Fusion (RRF) or Normalized Weighted Fusion.
   */
  static fuseAndRank(
    vectorCandidates: ScoredCandidate[],
    lexicalCandidates: ScoredCandidate[],
    chunkMap: Map<string, DocumentChunk>,
    config: RetrievalConfig
  ): RetrievedChunk[] {
    const vectorRankMap = new Map<string, number>();
    const vectorScoreMap = new Map<string, number>();
    vectorCandidates.forEach((c, idx) => {
      vectorRankMap.set(c.chunkId, idx + 1);
      vectorScoreMap.set(c.chunkId, c.score);
    });

    const lexicalRankMap = new Map<string, number>();
    const lexicalScoreMap = new Map<string, number>();
    lexicalCandidates.forEach((c, idx) => {
      lexicalRankMap.set(c.chunkId, idx + 1);
      lexicalScoreMap.set(c.chunkId, c.score);
    });

    const allChunkIds = new Set([
      ...vectorCandidates.map((c) => c.chunkId),
      ...lexicalCandidates.map((c) => c.chunkId),
    ]);

    const results: Array<{
      chunkId: string;
      finalScore: number;
      vectorScore?: number;
      lexicalScore?: number;
      source: RetrievalSource;
    }> = [];

    if (config.rankingStrategy === 'rrf') {
      // Reciprocal Rank Fusion (RRF)
      const k = config.rrfK || 60;
      const wVec = config.vectorWeight;
      const wLex = config.lexicalWeight;

      for (const chunkId of allChunkIds) {
        const vRank = vectorRankMap.get(chunkId);
        const lRank = lexicalRankMap.get(chunkId);

        let rrfScore = 0;
        let source: RetrievalSource = 'hybrid';

        if (vRank !== undefined && lRank !== undefined) {
          rrfScore = (wVec / (k + vRank)) + (wLex / (k + lRank));
          source = 'hybrid';
        } else if (vRank !== undefined) {
          rrfScore = wVec / (k + vRank);
          source = 'vector';
        } else if (lRank !== undefined) {
          rrfScore = wLex / (k + lRank);
          source = 'lexical';
        }

        // Scale RRF score to approximately [0..1] range for intuitive UI inspection
        const normalizedRRF = rrfScore * (k + 1);

        results.push({
          chunkId,
          finalScore: normalizedRRF,
          vectorScore: vectorScoreMap.get(chunkId),
          lexicalScore: lexicalScoreMap.get(chunkId),
          source,
        });
      }
    } else {
      // Min-Max Normalized Weighted Fusion
      const normVecScores = this.normalizeScores(vectorCandidates);
      const normLexScores = this.normalizeScores(lexicalCandidates);

      for (const chunkId of allChunkIds) {
        const vScore = normVecScores.get(chunkId);
        const lScore = normLexScores.get(chunkId);

        let finalScore = 0;
        let source: RetrievalSource = 'hybrid';

        if (vScore !== undefined && lScore !== undefined) {
          finalScore = config.vectorWeight * vScore + config.lexicalWeight * lScore;
          source = 'hybrid';
        } else if (vScore !== undefined) {
          finalScore = config.vectorWeight * vScore;
          source = 'vector';
        } else if (lScore !== undefined) {
          finalScore = config.lexicalWeight * lScore;
          source = 'lexical';
        }

        results.push({
          chunkId,
          finalScore,
          vectorScore: vectorScoreMap.get(chunkId),
          lexicalScore: lexicalScoreMap.get(chunkId),
          source,
        });
      }
    }

    // Sort descending by finalScore
    results.sort((a, b) => b.finalScore - a.finalScore);

    // Apply minScore threshold
    const filtered = results.filter((r) => r.finalScore >= config.minScore);

    // Apply deduplication by document if configured
    let candidatePool = filtered;
    if (config.deduplicateByDocument) {
      const seenDocs = new Set<string>();
      candidatePool = filtered.filter((item) => {
        const chunk = chunkMap.get(item.chunkId);
        if (!chunk) return false;
        if (seenDocs.has(chunk.documentId)) {
          return false;
        }
        seenDocs.add(chunk.documentId);
        return true;
      });
    }

    // Format final RetrievedChunk list
    const finalRetrieved: RetrievedChunk[] = [];
    const topLimit = Math.min(candidatePool.length, config.topK);

    for (let i = 0; i < topLimit; i++) {
      const item = candidatePool[i];
      const chunk = chunkMap.get(item.chunkId);
      if (!chunk) continue;

      finalRetrieved.push({
        chunkId: item.chunkId,
        score: Math.round(item.finalScore * 1000) / 1000,
        vectorScore:
          item.vectorScore !== undefined
            ? Math.round(item.vectorScore * 1000) / 1000
            : undefined,
        lexicalScore:
          item.lexicalScore !== undefined
            ? Math.round(item.lexicalScore * 1000) / 1000
            : undefined,
        rank: i + 1,
        chunk,
        source: item.source,
      });
    }

    return finalRetrieved;
  }

  private static normalizeScores(candidates: ScoredCandidate[]): Map<string, number> {
    const map = new Map<string, number>();
    if (candidates.length === 0) return map;

    let min = candidates[0].score;
    let max = candidates[0].score;

    for (const c of candidates) {
      if (c.score < min) min = c.score;
      if (c.score > max) max = c.score;
    }

    const range = max - min;
    for (const c of candidates) {
      const norm = range === 0 ? 1.0 : (c.score - min) / range;
      map.set(c.chunkId, norm);
    }

    return map;
  }
}
