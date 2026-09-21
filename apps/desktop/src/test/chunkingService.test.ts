import { describe, it, expect, beforeEach } from 'vitest';
import { ChunkingService } from '../services/knowledge/ChunkingService';
import { LocalStorageChunkStore } from '../services/knowledge/LocalStorageChunkStore';
import { NormalizedDocument, FileRecord } from '@nikit/types';
import { HashService } from '../services/files/HashService';

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

describe('ChunkingService: Determinism, Incremental Caching & Reproducibility', () => {
  let chunkStore: LocalStorageChunkStore;
  let chunkingService: ChunkingService;

  beforeEach(() => {
    localStorageMock.clear();
    chunkStore = new LocalStorageChunkStore();
    chunkingService = new ChunkingService(chunkStore);
  });

  const dummyFile: FileRecord = {
    id: 'f-service-test',
    name: 'architecture.md',
    extension: 'md',
    fileType: 'markdown',
    sizeBytes: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'ready',
    ingestion: { status: 'ready' },
    metadata: {},
    schemaVersion: 'v1',
  };

  it('produces deterministic chunk IDs across runs', async () => {
    const rawText = '# Spec\n\nDeterministic chunking verification text.';
    const doc: NormalizedDocument = {
      id: 'doc-spec-1',
      fileId: dummyFile.id,
      title: 'Spec',
      text: rawText,
      metadata: {
        sourceName: 'spec.md',
        sourceType: 'markdown',
        characterCount: rawText.length,
        lineCount: 3,
        wordCount: 5,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const res1 = await chunkingService.chunkDocument(doc, dummyFile);
    const chunkId1 = res1.chunks[0].id;

    // Clear store to re-run fresh
    await chunkStore.clear();

    const res2 = await chunkingService.chunkDocument(doc, dummyFile);
    const chunkId2 = res2.chunks[0].id;

    expect(chunkId1).toBe(chunkId2);
  });

  it('reuses cached chunks when document checksum and config are unchanged (incremental cache hit)', async () => {
    const text = '# Cache Test\n\nContent for cache verification.';
    const checksum = await HashService.calculateHash(text);

    const doc: NormalizedDocument = {
      id: 'doc-cache-test',
      fileId: dummyFile.id,
      title: 'Cache Test',
      text,
      metadata: {
        sourceName: 'cache.md',
        sourceType: 'markdown',
        characterCount: text.length,
        lineCount: 3,
        wordCount: 6,
        parsedAt: new Date().toISOString(),
        checksum,
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    // First run: builds and saves chunks
    const firstResult = await chunkingService.chunkDocument(doc, dummyFile);
    expect(firstResult.totalChunks).toBe(1);

    // Second run: should hit cache
    const secondResult = await chunkingService.chunkDocument(doc, dummyFile);
    expect(secondResult.chunkingDurationMs).toBe(0); // 0ms indicates cached return
    expect(secondResult.chunks.length).toBe(1);
    expect(secondResult.chunks[0].id).toBe(firstResult.chunks[0].id);
  });

  it('records reproducibility metadata (chunkerVersion, configHash) and maintains approximateTokens=null', async () => {
    const doc: NormalizedDocument = {
      id: 'doc-metadata-test',
      fileId: dummyFile.id,
      title: 'Meta Test',
      text: '# Metadata\nChecking provenance fields.',
      metadata: {
        sourceName: 'meta.md',
        sourceType: 'markdown',
        characterCount: 38,
        lineCount: 2,
        wordCount: 4,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const result = await chunkingService.chunkDocument(doc, dummyFile);
    expect(result.chunkerVersion).toBe('v1.0.0');
    expect(result.configHash).toBeDefined();

    const chunk = result.chunks[0];
    expect(chunk.metadata.chunkerVersion).toBe('v1.0.0');
    expect(chunk.metadata.configHash).toBeDefined();
    // Rule: Never claim fake token counts
    expect(chunk.metadata.approximateTokens).toBeNull();
  });
});
