import { NormalizedDocument } from '@nikit/types';
import { INormalizedDocumentStore, CURRENT_FILE_STORAGE_SCHEMA_VERSION } from './types';

const PREFIX = `nikit:doc:${CURRENT_FILE_STORAGE_SCHEMA_VERSION}:`;

export class LocalStorageDocumentStore implements INormalizedDocumentStore {
  async get(id: string): Promise<NormalizedDocument | null> {
    try {
      const raw = localStorage.getItem(`${PREFIX}${id}`);
      if (!raw) return null;
      return JSON.parse(raw) as NormalizedDocument;
    } catch {
      return null;
    }
  }

  async save(doc: NormalizedDocument): Promise<void> {
    try {
      localStorage.setItem(`${PREFIX}${doc.id}`, JSON.stringify(doc));
    } catch {
      // Ignore
    }
  }

  async delete(id: string): Promise<void> {
    try {
      localStorage.removeItem(`${PREFIX}${id}`);
    } catch {
      // Ignore
    }
  }
}

export const documentStore = new LocalStorageDocumentStore();
