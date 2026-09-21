import {
  FileRecord,
  FileSummary,
} from '@nikit/types';
import {
  IFileStore,
  CURRENT_FILE_STORAGE_SCHEMA_VERSION,
} from './types';
import { documentStore } from './LocalStorageDocumentStore';

const KEYS = {
  INDEX: `nikit:files:${CURRENT_FILE_STORAGE_SCHEMA_VERSION}`,
  FILE_PREFIX: `nikit:file:${CURRENT_FILE_STORAGE_SCHEMA_VERSION}:`,
};

export class LocalStorageFileStore implements IFileStore {
  async list(projectId?: string | null): Promise<FileSummary[]> {
    try {
      const raw = localStorage.getItem(KEYS.INDEX);
      if (!raw) return [];
      const summaries = JSON.parse(raw) as FileSummary[];
      if (projectId === undefined) return summaries;
      return summaries.filter((f) => f.projectId === projectId);
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<FileRecord | null> {
    try {
      const raw = localStorage.getItem(`${KEYS.FILE_PREFIX}${id}`);
      if (!raw) return null;
      return JSON.parse(raw) as FileRecord;
    } catch {
      return null;
    }
  }

  async create(initial?: Partial<FileRecord>): Promise<FileRecord> {
    const id = initial?.id || `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newRecord: FileRecord = {
      id,
      projectId: initial?.projectId || null,
      name: initial?.name || 'untitled',
      extension: initial?.extension || '',
      mimeType: initial?.mimeType,
      fileType: initial?.fileType || 'text',
      sizeBytes: initial?.sizeBytes || 0,
      createdAt: initial?.createdAt || now,
      updatedAt: initial?.updatedAt || now,
      status: initial?.status || 'registered',
      ingestion: initial?.ingestion || {
        status: initial?.status || 'registered',
        stage: 'detecting',
        startedAt: now,
      },
      metadata: initial?.metadata || {},
      sourcePath: initial?.sourcePath,
      contentHash: initial?.contentHash,
      normalizedDocumentId: initial?.normalizedDocumentId,
      schemaVersion: CURRENT_FILE_STORAGE_SCHEMA_VERSION,
    };

    try {
      localStorage.setItem(`${KEYS.FILE_PREFIX}${id}`, JSON.stringify(newRecord));

      const summaries = await this.list();
      const newSummary: FileSummary = {
        id,
        projectId: newRecord.projectId,
        name: newRecord.name,
        extension: newRecord.extension,
        fileType: newRecord.fileType,
        sizeBytes: newRecord.sizeBytes,
        updatedAt: 'Just now',
        status: newRecord.status,
        characterCount: newRecord.metadata.characterCount,
        lineCount: newRecord.metadata.lineCount,
      };

      const nextSummaries = [newSummary, ...summaries.filter((s) => s.id !== id)];
      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }

    return newRecord;
  }

  async update(id: string, updates: Partial<FileRecord>): Promise<FileRecord> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`FileRecord ${id} not found.`);
    }

    const updatedRecord: FileRecord = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...(updates.metadata || {}),
      },
      ingestion: {
        ...existing.ingestion,
        ...(updates.ingestion || {}),
        status: updates.status || updates.ingestion?.status || existing.ingestion.status,
      },
      status: updates.status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`${KEYS.FILE_PREFIX}${id}`, JSON.stringify(updatedRecord));

      const summaries = await this.list();
      const nextSummaries = summaries.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            name: updatedRecord.name,
            projectId: updatedRecord.projectId,
            fileType: updatedRecord.fileType,
            sizeBytes: updatedRecord.sizeBytes,
            status: updatedRecord.status,
            characterCount: updatedRecord.metadata.characterCount,
            lineCount: updatedRecord.metadata.lineCount,
            updatedAt: 'Just now',
          };
        }
        return s;
      });

      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }

    return updatedRecord;
  }

  async delete(id: string): Promise<void> {
    const file = await this.get(id);
    if (file && file.normalizedDocumentId) {
      await documentStore.delete(file.normalizedDocumentId);
    }

    try {
      localStorage.removeItem(`${KEYS.FILE_PREFIX}${id}`);
      const summaries = await this.list();
      const nextSummaries = summaries.filter((s) => s.id !== id);
      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }
  }

  async attachToProject(fileId: string, projectId: string | null): Promise<FileRecord> {
    return this.update(fileId, { projectId });
  }

  async detachFromProject(fileId: string): Promise<FileRecord> {
    return this.update(fileId, { projectId: null });
  }

  async findByContentHash(hash: string): Promise<FileRecord | null> {
    const summaries = await this.list();
    for (const summary of summaries) {
      const full = await this.get(summary.id);
      if (full && full.contentHash === hash) {
        return full;
      }
    }
    return null;
  }
}

export const fileStore = new LocalStorageFileStore();
