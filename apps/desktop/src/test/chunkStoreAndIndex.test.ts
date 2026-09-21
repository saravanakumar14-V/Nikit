import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageChunkStore } from '../services/knowledge/LocalStorageChunkStore';
import { ChunkIndex } from '../services/knowledge/ChunkIndex';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { LocalStorageFileStore } from '../services/files/LocalStorageFileStore';
import { ChunkingService } from '../services/knowledge/ChunkingService';
import { NormalizedDocument } from '@nikit/types';

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

describe('ChunkStore, ChunkIndex & Project Invariants', () => {
  let chunkStore: LocalStorageChunkStore;
  let chunkIndex: ChunkIndex;
  let projectStore: LocalStorageProjectStore;
  let fileStore: LocalStorageFileStore;

  beforeEach(() => {
    localStorageMock.clear();
    chunkStore = new LocalStorageChunkStore();
    chunkIndex = new ChunkIndex(chunkStore);
    projectStore = new LocalStorageProjectStore();
    fileStore = new LocalStorageFileStore();
  });

  it('stores, queries, and filters chunks via ChunkIndex', async () => {
    const chunk1 = {
      id: 'chk-1',
      documentId: 'doc-1',
      fileId: 'file-1',
      projectId: 'proj-alpha',
      text: 'First chunk text.',
      metadata: {
        headings: ['Overview'],
        sourceName: 'file1.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: {
        documentId: 'doc-1',
        startOffset: 0,
        endOffset: 17,
        startLine: 1,
        endLine: 1,
      },
      contentHash: 'hash-1',
      sequence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1' as const,
    };

    await chunkStore.saveChunks([chunk1]);

    const byDoc = await chunkIndex.listByDocument('doc-1');
    expect(byDoc.length).toBe(1);
    expect(byDoc[0].id).toBe('chk-1');

    const byProj = await chunkIndex.listByProject('proj-alpha');
    expect(byProj.length).toBe(1);
    expect(byProj[0].text).toBe('First chunk text.');

    const filtered = await chunkIndex.filterByMetadata((c) => c.metadata.sourceExtension === 'md');
    expect(filtered.length).toBe(1);
  });

  it('INVARIANT: Deleting a project atomically detaches all associated chunks (projectId = null) without deleting them', async () => {
    // 1. Create Project
    const project = await projectStore.create({
      id: 'proj-knowledge-test',
      name: 'Knowledge Test Workspace',
    });

    // 2. Create and attach File
    const file = await fileStore.create({
      id: 'file-in-proj-knowledge',
      name: 'notes.md',
      projectId: project.id,
      status: 'ready',
    });

    // 3. Save Chunks associated with this project
    const chunk = {
      id: 'chk-proj-1',
      documentId: 'doc-notes-1',
      fileId: file.id,
      projectId: project.id,
      text: 'Important project chunk content.',
      metadata: {
        headings: ['Notes'],
        sourceName: 'notes.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: {
        documentId: 'doc-notes-1',
        startOffset: 0,
        endOffset: 32,
      },
      contentHash: 'hash-notes-1',
      sequence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1' as const,
    };
    await chunkStore.saveChunks([chunk]);

    // Verify initial association
    expect((await chunkStore.get('chk-proj-1'))?.projectId).toBe(project.id);

    // 4. Delete Project
    await projectStore.delete(project.id);

    // 5. Verify Project is deleted
    expect(await projectStore.get(project.id)).toBeNull();

    // 6. Verify Chunk SURVIVED and is preserved globally with projectId = null
    const preservedChunk = await chunkStore.get('chk-proj-1');
    expect(preservedChunk).not.toBeNull();
    expect(preservedChunk?.projectId).toBeNull();
  });

  it('ASYNC RACE PROTECTION: If project was deleted during asynchronous chunking, chunks are saved with projectId = null', async () => {
    // 1. Create Project and File
    const project = await projectStore.create({
      id: 'proj-race-test',
      name: 'Race Project',
    });

    const file = await fileStore.create({
      id: 'file-race-test',
      name: 'spec.md',
      projectId: project.id,
      status: 'ready',
    });

    const doc: NormalizedDocument = {
      id: 'doc-race-test',
      fileId: file.id,
      title: 'Spec',
      text: '# Race\nChecking race condition protection.',
      metadata: {
        sourceName: 'spec.md',
        sourceType: 'markdown',
        characterCount: 40,
        lineCount: 2,
        wordCount: 5,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const service = new ChunkingService(chunkStore);

    // Simulate: Project gets deleted right before chunk commit
    await projectStore.delete(project.id);

    // Now chunking completes
    const result = await service.chunkDocument(doc, file);

    // Verify: Chunks MUST have projectId = null (never resurrecting the deleted project)
    expect(result.chunks.length).toBeGreaterThan(0);
    for (const c of result.chunks) {
      expect(c.projectId).toBeNull();
    }
  });
});
