import {
  EmbeddingModel,
  EmbeddingVector,
  EmbeddingRecord,
  EmbeddingRequest,
  DocumentChunk,
  RetrievalFilters,
  RetrievalConfig,
  RetrievalResult,
  EvaluationItem,
  EvaluationMetrics,
} from '@nikit/types';

export const CURRENT_EMBEDDING_STORAGE_SCHEMA_VERSION = 'v1';

export interface IEmbeddingProvider {
  readonly model: EmbeddingModel;
  embed(request: EmbeddingRequest): Promise<EmbeddingRecord>;
  embedBatch(requests: EmbeddingRequest[]): Promise<EmbeddingRecord[]>;
  embedQuery(query: string): Promise<EmbeddingVector>;
}

export interface IEmbeddingStore {
  save(record: EmbeddingRecord): Promise<void>;
  saveBatch(records: EmbeddingRecord[]): Promise<void>;
  get(chunkId: string): Promise<EmbeddingRecord | null>;
  listByDocument(documentId: string): Promise<EmbeddingRecord[]>;
  listByProject(projectId: string): Promise<EmbeddingRecord[]>;
  listAll(): Promise<EmbeddingRecord[]>;
  delete(chunkId: string): Promise<void>;
  deleteByDocument(documentId: string): Promise<void>;
  detachFromProject(projectId: string): Promise<void>;
  isStale(record: EmbeddingRecord, chunk: DocumentChunk, model: EmbeddingModel): boolean;
  clear(): Promise<void>;
}

export interface IVectorStore {
  upsert(records: EmbeddingRecord[]): Promise<void>;
  delete(chunkIds: string[]): Promise<void>;
  search(
    queryVector: EmbeddingVector,
    options?: { topK?: number; filters?: RetrievalFilters }
  ): Promise<Array<{ chunkId: string; score: number }>>;
  rebuildIndex(records: EmbeddingRecord[]): Promise<void>;
  getRecordCount(): number;
}

export interface ILexicalStore {
  search(
    query: string,
    chunks: DocumentChunk[],
    options?: { topK?: number; filters?: RetrievalFilters }
  ): Promise<Array<{ chunkId: string; score: number }>>;
}

export interface IHybridRetriever {
  retrieve(
    query: string,
    options?: {
      config?: Partial<RetrievalConfig>;
      filters?: RetrievalFilters;
    }
  ): Promise<RetrievalResult>;
}

export interface IRetrievalEvaluator {
  evaluate(
    dataset: EvaluationItem[],
    config?: Partial<RetrievalConfig>
  ): Promise<EvaluationMetrics>;
}
