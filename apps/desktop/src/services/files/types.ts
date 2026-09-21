import {
  FileRecord,
  FileSummary,
  NormalizedDocument,
} from '@nikit/types';

export const CURRENT_FILE_STORAGE_SCHEMA_VERSION = 'v1';

export interface IFileStore {
  list(projectId?: string | null): Promise<FileSummary[]>;
  get(id: string): Promise<FileRecord | null>;
  create(initial?: Partial<FileRecord>): Promise<FileRecord>;
  update(id: string, updates: Partial<FileRecord>): Promise<FileRecord>;
  delete(id: string): Promise<void>;
  attachToProject(fileId: string, projectId: string | null): Promise<FileRecord>;
  detachFromProject(fileId: string): Promise<FileRecord>;
  findByContentHash(hash: string): Promise<FileRecord | null>;
}

export interface INormalizedDocumentStore {
  get(id: string): Promise<NormalizedDocument | null>;
  save(doc: NormalizedDocument): Promise<void>;
  delete(id: string): Promise<void>;
}
