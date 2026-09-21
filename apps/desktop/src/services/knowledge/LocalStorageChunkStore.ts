import { DocumentChunk } from '@nikit/types';
import { IChunkStore, CURRENT_CHUNK_STORAGE_SCHEMA_VERSION } from './types';

const KEYS = {
  INDEX: `nikit:chunks:${CURRENT_CHUNK_STORAGE_SCHEMA_VERSION}`,
  CHUNK_PREFIX: `nikit:chunk:${CURRENT_CHUNK_STORAGE_SCHEMA_VERSION}:`,
};

export class LocalStorageChunkStore implements IChunkStore {
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

  async saveChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      const currentIndex = await this.getIndex();
      const newIds = new Set(currentIndex);

      for (const chunk of chunks) {
        localStorage.setItem(
          `${KEYS.CHUNK_PREFIX}${chunk.id}`,
          JSON.stringify(chunk)
        );
        newIds.add(chunk.id);
      }

      await this.setIndex(Array.from(newIds));
    } catch {
      // Ignore
    }
  }

  async get(chunkId: string): Promise<DocumentChunk | null> {
    try {
      const raw = localStorage.getItem(`${KEYS.CHUNK_PREFIX}${chunkId}`);
      if (!raw) return null;
      return JSON.parse(raw) as DocumentChunk;
    } catch {
      return null;
    }
  }

  async listByDocument(documentId: string): Promise<DocumentChunk[]> {
    const ids = await this.getIndex();
    const results: DocumentChunk[] = [];

    for (const id of ids) {
      const chunk = await this.get(id);
      if (chunk && chunk.documentId === documentId) {
        results.push(chunk);
      }
    }

    return results.sort((a, b) => a.sequence - b.sequence);
  }

  async listByProject(projectId: string): Promise<DocumentChunk[]> {
    const ids = await this.getIndex();
    const results: DocumentChunk[] = [];

    for (const id of ids) {
      const chunk = await this.get(id);
      if (chunk && chunk.projectId === projectId) {
        results.push(chunk);
      }
    }

    return results;
  }

  async deleteChunksForDocument(documentId: string): Promise<void> {
    const ids = await this.getIndex();
    const remainingIds: string[] = [];

    for (const id of ids) {
      const chunk = await this.get(id);
      if (chunk && chunk.documentId === documentId) {
        try {
          localStorage.removeItem(`${KEYS.CHUNK_PREFIX}${id}`);
        } catch {
          // Ignore
        }
      } else {
        remainingIds.push(id);
      }
    }

    await this.setIndex(remainingIds);
  }

  async detachChunksFromProject(projectId: string): Promise<void> {
    const ids = await this.getIndex();

    for (const id of ids) {
      const chunk = await this.get(id);
      if (chunk && chunk.projectId === projectId) {
        const updated: DocumentChunk = {
          ...chunk,
          projectId: null,
          updatedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(`${KEYS.CHUNK_PREFIX}${id}`, JSON.stringify(updated));
        } catch {
          // Ignore
        }
      }
    }
  }

  async clear(): Promise<void> {
    const ids = await this.getIndex();
    for (const id of ids) {
      try {
        localStorage.removeItem(`${KEYS.CHUNK_PREFIX}${id}`);
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

export const chunkStore = new LocalStorageChunkStore();
