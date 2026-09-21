import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageFileStore } from '../services/files/LocalStorageFileStore';
import { LocalStorageDocumentStore } from '../services/files/LocalStorageDocumentStore';

// In-memory mock for localStorage
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => {
    storageMap.set(key, val);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('LocalStorageFileStore & NormalizedDocumentStore', () => {
  let fileStore: LocalStorageFileStore;
  let docStore: LocalStorageDocumentStore;

  beforeEach(() => {
    localStorageMock.clear();
    fileStore = new LocalStorageFileStore();
    docStore = new LocalStorageDocumentStore();
  });

  it('should create and retrieve a file record with v1 schema', async () => {
    const record = await fileStore.create({
      name: 'attention.py',
      extension: 'py',
      fileType: 'code',
      sizeBytes: 2048,
      status: 'ready',
      contentHash: 'hash-12345',
      metadata: {
        lineCount: 84,
        characterCount: 2048,
        wordCount: 310,
      },
    });

    expect(record.id).toBeDefined();
    expect(record.name).toBe('attention.py');
    expect(record.schemaVersion).toBe('v1');
    expect(record.status).toBe('ready');

    const fetched = await fileStore.get(record.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('attention.py');
    expect(fetched?.metadata.lineCount).toBe(84);
  });

  it('should list files filtered by project', async () => {
    await fileStore.create({ name: 'global.txt', projectId: null });
    await fileStore.create({ name: 'project_file.md', projectId: 'proj-1' });

    const globalFiles = await fileStore.list(null);
    expect(globalFiles.length).toBe(1);
    expect(globalFiles[0].name).toBe('global.txt');

    const projectFiles = await fileStore.list('proj-1');
    expect(projectFiles.length).toBe(1);
    expect(projectFiles[0].name).toBe('project_file.md');
  });

  it('should attach and detach files from projects', async () => {
    const file = await fileStore.create({ name: 'dataset.csv' });
    expect(file.projectId).toBeNull();

    const attached = await fileStore.attachToProject(file.id, 'proj-alpha');
    expect(attached.projectId).toBe('proj-alpha');

    const detached = await fileStore.detachFromProject(file.id);
    expect(detached.projectId).toBeNull();
  });

  it('should find files by content hash (SHA-256 lookup)', async () => {
    await fileStore.create({ name: 'file1.txt', contentHash: 'sha-abc-123' });

    const found = await fileStore.findByContentHash('sha-abc-123');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('file1.txt');

    const notFound = await fileStore.findByContentHash('sha-nonexistent');
    expect(notFound).toBeNull();
  });

  it('should store and delete normalized documents separately from file record', async () => {
    const docId = 'doc-test-1';
    await docStore.save({
      id: docId,
      fileId: 'file-test-1',
      title: 'Doc Title',
      text: '# Normalized Header\nDetailed content here.',
      metadata: {
        sourceName: 'test.md',
        sourceType: 'markdown',
        characterCount: 42,
        lineCount: 2,
        wordCount: 6,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    });

    const fetched = await docStore.get(docId);
    expect(fetched).not.toBeNull();
    expect(fetched?.text).toContain('Normalized Header');

    await docStore.delete(docId);
    expect(await docStore.get(docId)).toBeNull();
  });
});
