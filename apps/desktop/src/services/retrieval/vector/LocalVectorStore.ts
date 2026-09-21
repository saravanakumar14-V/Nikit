import {
  EmbeddingRecord,
  EmbeddingVector,
  RetrievalFilters,
} from '@nikit/types';
import { IVectorStore } from '../types';

/**
 * In-process exact vector search store.
 * Performs fast cosine similarity lookups over normalized vector embeddings.
 */
export class LocalVectorStore implements IVectorStore {
  private records: Map<string, EmbeddingRecord> = new Map();

  async upsert(records: EmbeddingRecord[]): Promise<void> {
    for (const rec of records) {
      this.records.set(rec.chunkId, rec);
    }
  }

  async delete(chunkIds: string[]): Promise<void> {
    for (const id of chunkIds) {
      this.records.delete(id);
    }
  }

  async rebuildIndex(records: EmbeddingRecord[]): Promise<void> {
    this.records.clear();
    for (const rec of records) {
      this.records.set(rec.chunkId, rec);
    }
  }

  getRecordCount(): number {
    return this.records.size;
  }

  async search(
    queryVector: EmbeddingVector,
    options?: { topK?: number; filters?: RetrievalFilters }
  ): Promise<Array<{ chunkId: string; score: number }>> {
    const topK = options?.topK ?? 10;
    const filters = options?.filters;
    const candidates: Array<{ chunkId: string; score: number }> = [];

    for (const record of this.records.values()) {
      // 1. Apply filters
      if (filters) {
        if (filters.projectId !== undefined && record.projectId !== filters.projectId) {
          continue;
        }
        if (filters.fileId !== undefined && record.fileId !== filters.fileId) {
          continue;
        }
        if (filters.documentId !== undefined && record.documentId !== filters.documentId) {
          continue;
        }
      }

      // 2. Compute Cosine Similarity (dot product of unit vectors)
      const similarity = this.cosineSimilarity(queryVector, record.vector);
      // Normalized to [0..1] range
      const normalizedScore = Math.max(0, Math.min(1, (similarity + 1) / 2));

      candidates.push({
        chunkId: record.chunkId,
        score: normalizedScore,
      });
    }

    // 3. Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, topK);
  }

  private cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }
}

export const localVectorStore = new LocalVectorStore();
