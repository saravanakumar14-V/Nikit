import { EmbeddingModel, RetrievalConfig } from '@nikit/types';

export const LOCAL_BASELINE_EMBEDDING_MODEL: EmbeddingModel = {
  id: 'local-deterministic-v1',
  name: 'Local Vector Baseline',
  provider: 'nikit-local',
  dimensions: 384, // Model-defined dimension
  version: '1.0.0',
  isLocal: true,
  isPrototypeBaseline: true, // Explicitly identified as prototype vector similarity
};

export const DEFAULT_RETRIEVAL_CONFIG: RetrievalConfig = {
  topK: 5,
  vectorTopK: 10,
  lexicalTopK: 10,
  vectorWeight: 0.7,
  lexicalWeight: 0.3,
  minScore: 0.05,
  rankingStrategy: 'rrf', // Primary default: Reciprocal Rank Fusion
  rrfK: 60, // Standard smoothing constant
  deduplicateByDocument: false,
};
