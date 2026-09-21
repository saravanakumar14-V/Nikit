import {
  DocumentChunk,
  EmbeddingRecord,
  EmbeddingRequest,
} from '@nikit/types';
import { IEmbeddingProvider, IEmbeddingStore, IVectorStore } from '../types';
import { localEmbeddingProvider } from './LocalEmbeddingProvider';
import { embeddingStore } from './LocalStorageEmbeddingStore';
import { localVectorStore } from '../vector/LocalVectorStore';

export class EmbeddingService {
  private provider: IEmbeddingProvider;
  private store: IEmbeddingStore;
  private vectorStore: IVectorStore;

  constructor(
    provider: IEmbeddingProvider = localEmbeddingProvider,
    store: IEmbeddingStore = embeddingStore,
    vectorStore: IVectorStore = localVectorStore
  ) {
    this.provider = provider;
    this.store = store;
    this.vectorStore = vectorStore;
  }

  /**
   * Ensures all provided chunks have up-to-date, valid embeddings in store and vector index.
   * Automatically detects and regenerates stale embeddings.
   */
  async ensureChunksEmbedded(chunks: DocumentChunk[]): Promise<EmbeddingRecord[]> {
    const validRecords: EmbeddingRecord[] = [];
    const missingRequests: EmbeddingRequest[] = [];

    for (const chunk of chunks) {
      const existing = await this.store.get(chunk.id);

      if (existing && !this.store.isStale(existing, chunk, this.provider.model)) {
        validRecords.push(existing);
      } else {
        missingRequests.push({
          chunkId: chunk.id,
          text: chunk.text,
          documentId: chunk.documentId,
          fileId: chunk.fileId,
          projectId: chunk.projectId,
        });
      }
    }

    if (missingRequests.length > 0) {
      const newlyEmbedded = await this.provider.embedBatch(missingRequests);
      await this.store.saveBatch(newlyEmbedded);
      await this.vectorStore.upsert(newlyEmbedded);
      validRecords.push(...newlyEmbedded);
    } else if (validRecords.length > 0) {
      await this.vectorStore.upsert(validRecords);
    }

    return validRecords;
  }

  /**
   * Rebuilds the in-process vector index from persistent storage.
   * Derived state reconstruction invariant.
   */
  async rebuildVectorIndex(): Promise<number> {
    const allEmbeddings = await this.store.listAll();
    await this.vectorStore.rebuildIndex(allEmbeddings);
    return this.vectorStore.getRecordCount();
  }

  getProviderModel() {
    return this.provider.model;
  }
}

export const embeddingService = new EmbeddingService();
