import { DocumentChunk } from '@nikit/types';
import { IChunkIndex, IChunkStore } from './types';
import { chunkStore } from './LocalStorageChunkStore';

export class ChunkIndex implements IChunkIndex {
  private store: IChunkStore;

  constructor(store: IChunkStore = chunkStore) {
    this.store = store;
  }

  async get(chunkId: string): Promise<DocumentChunk | null> {
    return this.store.get(chunkId);
  }

  async listByDocument(documentId: string): Promise<DocumentChunk[]> {
    return this.store.listByDocument(documentId);
  }

  async listByProject(projectId: string): Promise<DocumentChunk[]> {
    return this.store.listByProject(projectId);
  }

  async filterByMetadata(
    predicate: (chunk: DocumentChunk) => boolean
  ): Promise<DocumentChunk[]> {
    // Collect all chunks and filter via predicate
    // In Phase 5B this acts as the lightweight query boundary
    const allDocChunks: DocumentChunk[] = [];
    const ids = await (this.store as unknown as { getIndex?: () => Promise<string[]> }).getIndex?.() || [];

    for (const id of ids) {
      const chunk = await this.store.get(id);
      if (chunk && predicate(chunk)) {
        allDocChunks.push(chunk);
      }
    }

    return allDocChunks;
  }
}

export const chunkIndex = new ChunkIndex();
