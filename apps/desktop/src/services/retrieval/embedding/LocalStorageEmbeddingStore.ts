import {
  EmbeddingRecord,
  EmbeddingModel,
  DocumentChunk,
} from '@nikit/types';
import { IEmbeddingStore, CURRENT_EMBEDDING_STORAGE_SCHEMA_VERSION } from '../types';

const KEYS = {
  INDEX: `nikit:embeddings:${CURRENT_EMBEDDING_STORAGE_SCHEMA_VERSION}`,
  RECORD_PREFIX: `nikit:embedding:${CURRENT_EMBEDDING_STORAGE_SCHEMA_VERSION}:`,
};

export class LocalStorageEmbeddingStore implements IEmbeddingStore {
  private async getIndex(): Promise<string[]> {
    try {
      const raw = localStorage.getItem(KEYS.INDEX);
      if (!raw) return [];
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  private async setIndex(ids: string[]): Promise<void> {
    try {
      localStorage.setItem(KEYS.INDEX, JSON.stringify(ids));
    } catch {
      // Ignore
    }
  }

  async save(record: EmbeddingRecord): Promise<void> {
    try {
      localStorage.setItem(
        `${KEYS.RECORD_PREFIX}${record.chunkId}`,
        JSON.stringify(record)
      );

      const currentIndex = await this.getIndex();
      if (!currentIndex.includes(record.chunkId)) {
        await this.setIndex([...currentIndex, record.chunkId]);
      }
    } catch {
      // Ignore
    }
  }

  async saveBatch(records: EmbeddingRecord[]): Promise<void> {
    try {
      const currentIndex = await this.getIndex();
      const newIds = new Set(currentIndex);

      for (const record of records) {
        localStorage.setItem(
          `${KEYS.RECORD_PREFIX}${record.chunkId}`,
          JSON.stringify(record)
        );
        newIds.add(record.chunkId);
      }

      await this.setIndex(Array.from(newIds));
    } catch {
      // Ignore
    }
  }

  async get(chunkId: string): Promise<EmbeddingRecord | null> {
    try {
      const raw = localStorage.getItem(`${KEYS.RECORD_PREFIX}${chunkId}`);
      if (!raw) return null;
      return JSON.parse(raw) as EmbeddingRecord;
    } catch {
      return null;
    }
  }

  async listByDocument(documentId: string): Promise<EmbeddingRecord[]> {
    const ids = await this.getIndex();
    const results: EmbeddingRecord[] = [];

    for (const chunkId of ids) {
      const record = await this.get(chunkId);
      if (record && record.documentId === documentId) {
        results.push(record);
      }
    }

    return results;
  }

  async listByProject(projectId: string): Promise<EmbeddingRecord[]> {
    const ids = await this.getIndex();
    const results: EmbeddingRecord[] = [];

    for (const chunkId of ids) {
      const record = await this.get(chunkId);
      if (record && record.projectId === projectId) {
        results.push(record);
      }
    }

    return results;
  }

  async listAll(): Promise<EmbeddingRecord[]> {
    const ids = await this.getIndex();
    const results: EmbeddingRecord[] = [];

    for (const chunkId of ids) {
      const record = await this.get(chunkId);
      if (record) {
        results.push(record);
      }
    }

    return results;
  }

  async delete(chunkId: string): Promise<void> {
    try {
      localStorage.removeItem(`${KEYS.RECORD_PREFIX}${chunkId}`);
      const currentIndex = await this.getIndex();
      await this.setIndex(currentIndex.filter((id) => id !== chunkId));
    } catch {
      // Ignore
    }
  }

  async deleteByDocument(documentId: string): Promise<void> {
    const records = await this.listByDocument(documentId);
    for (const rec of records) {
      await this.delete(rec.chunkId);
    }
  }

  async detachFromProject(projectId: string): Promise<void> {
    const records = await this.listByProject(projectId);
    for (const rec of records) {
      const updated: EmbeddingRecord = {
        ...rec,
        projectId: null,
        updatedAt: new Date().toISOString(),
      };
      await this.save(updated);
    }
  }

  isStale(
    record: EmbeddingRecord,
    chunk: DocumentChunk,
    model: EmbeddingModel
  ): boolean {
    if (record.inputHash !== chunk.contentHash) return true;
    if (record.modelId !== model.id) return true;
    if (record.modelVersion !== model.version) return true;
    if (record.dimensions !== model.dimensions) return true;
    return false;
  }

  async clear(): Promise<void> {
    const ids = await this.getIndex();
    for (const id of ids) {
      try {
        localStorage.removeItem(`${KEYS.RECORD_PREFIX}${id}`);
      } catch {
        // Ignore
      }
    }
    try {
      localStorage.removeItem(KEYS.INDEX);
    } catch {
      // Ignore
    }
  }
}

export const embeddingStore = new LocalStorageEmbeddingStore();
