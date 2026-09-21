import {
  EmbeddingModel,
  EmbeddingRecord,
  EmbeddingRequest,
  EmbeddingVector,
} from '@nikit/types';
import { IEmbeddingProvider } from '../types';
import { LOCAL_BASELINE_EMBEDDING_MODEL } from '../config';
import { HashService } from '../../files/HashService';

/**
 * Local deterministic character & subword hashing projector.
 * Provides a fast, local-first in-process vector similarity baseline.
 * NOTE: This is explicitly a prototype vector baseline, NOT a trained neural semantic model.
 */
export class LocalEmbeddingProvider implements IEmbeddingProvider {
  readonly model: EmbeddingModel = LOCAL_BASELINE_EMBEDDING_MODEL;

  async embed(request: EmbeddingRequest): Promise<EmbeddingRecord> {
    const vector = await this.embedQuery(request.text);
    const inputHash = await HashService.calculateHash(request.text);

    return {
      id: `emb-${request.chunkId}`,
      chunkId: request.chunkId,
      documentId: request.documentId,
      fileId: request.fileId,
      projectId: request.projectId || null,
      modelId: this.model.id,
      modelVersion: this.model.version,
      dimensions: this.model.dimensions,
      vector,
      inputHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };
  }

  async embedBatch(requests: EmbeddingRequest[]): Promise<EmbeddingRecord[]> {
    const results: EmbeddingRecord[] = [];
    for (const req of requests) {
      results.push(await this.embed(req));
    }
    return results;
  }

  async embedQuery(query: string): Promise<EmbeddingVector> {
    const dim = this.model.dimensions;
    const vector = new Array<number>(dim).fill(0);

    const clean = query.toLowerCase().trim();
    if (!clean) {
      vector[0] = 1.0;
      return vector;
    }

    // 1. Subword / n-gram tokenization (lengths 3, 4, 5) + word boundaries
    const words = clean.split(/\s+/).filter(Boolean);
    const features: string[] = [...words];

    for (let n = 3; n <= 5; n++) {
      for (let i = 0; i <= clean.length - n; i++) {
        features.push(clean.slice(i, i + n));
      }
    }

    // 2. Deterministic hash projection into unit hypersphere
    for (const feature of features) {
      let h1 = 0x811c9dc5;
      let h2 = 0x5bd1e995;

      for (let i = 0; i < feature.length; i++) {
        const c = feature.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193);
        h2 = Math.imul(h2 ^ c, 0x5bd1e995);
      }

      const index = Math.abs(h1) % dim;
      const sign = (h2 & 1) === 0 ? 1 : -1;
      vector[index] += sign;
    }

    // 3. Unit L2 Normalization (||v||_2 = 1.0)
    let sumSq = 0;
    for (let i = 0; i < dim; i++) {
      sumSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] = vector[i] / norm;
      }
    } else {
      vector[0] = 1.0;
    }

    return vector;
  }
}

export const localEmbeddingProvider = new LocalEmbeddingProvider();
