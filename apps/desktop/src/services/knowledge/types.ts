import {
  DocumentChunk,
  ChunkingConfig,
  ChunkingResult,
  NormalizedDocument,
  FileRecord,
} from '@nikit/types';

export const CURRENT_CHUNK_STORAGE_SCHEMA_VERSION = 'v1';

export interface IChunker {
  id: string;
  strategyName: string;
  chunk(
    doc: NormalizedDocument,
    file: FileRecord,
    config: ChunkingConfig
  ): Promise<DocumentChunk[]>;
}

export interface IChunkStore {
  saveChunks(chunks: DocumentChunk[]): Promise<void>;
  get(chunkId: string): Promise<DocumentChunk | null>;
  listByDocument(documentId: string): Promise<DocumentChunk[]>;
  listByProject(projectId: string): Promise<DocumentChunk[]>;
  deleteChunksForDocument(documentId: string): Promise<void>;
  detachChunksFromProject(projectId: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IChunkIndex {
  get(chunkId: string): Promise<DocumentChunk | null>;
  listByDocument(documentId: string): Promise<DocumentChunk[]>;
  listByProject(projectId: string): Promise<DocumentChunk[]>;
  filterByMetadata(predicate: (chunk: DocumentChunk) => boolean): Promise<DocumentChunk[]>;
}

export interface IChunkingService {
  chunkDocument(
    doc: NormalizedDocument,
    file: FileRecord,
    configOverride?: Partial<ChunkingConfig>
  ): Promise<ChunkingResult>;
  getChunksForDocument(docId: string): Promise<DocumentChunk[]>;
}
