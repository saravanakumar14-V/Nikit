import { describe, it, expect, beforeEach } from 'vitest';
import { LocalEmbeddingProvider } from '../services/retrieval/embedding/LocalEmbeddingProvider';
import { LocalStorageEmbeddingStore } from '../services/retrieval/embedding/LocalStorageEmbeddingStore';
import { LocalVectorStore } from '../services/retrieval/vector/LocalVectorStore';
import { EmbeddingService } from '../services/retrieval/embedding/EmbeddingService';
import { DocumentChunk, EmbeddingModel } from '@nikit/types';

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

describe('Embedding Provider, Store & Stale Detection', () => {
  let provider: LocalEmbeddingProvider;
  let store: LocalStorageEmbeddingStore;
  let vectorStore: LocalVectorStore;
  let service: EmbeddingService;

  beforeEach(() => {
    localStorageMock.clear();
    provider = new LocalEmbeddingProvider();
    store = new LocalStorageEmbeddingStore();
    vectorStore = new LocalVectorStore();
    service = new EmbeddingService(provider, store, vectorStore);
  });

  const dummyChunk: DocumentChunk = {
    id: 'chk-attention-1',
    documentId: 'doc-attn-1',
    fileId: 'file-attn-1',
    projectId: 'proj-ml',
    text: 'Multi-Head Attention computes multiple attention heads in parallel.',
    metadata: {
      headings: ['Attention', 'Multi-Head Attention'],
      sourceName: 'attention.md',
      sourceExtension: 'md',
      approximateTokens: null,
    },
    location: {
      documentId: 'doc-attn-1',
      startOffset: 0,
      endOffset: 67,
    },
    contentHash: 'hash-initial-123',
    sequence: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };

  it('LocalEmbeddingProvider: generates deterministic 384-dimensional unit vectors (||v|| ≈ 1.0)', async () => {
    const vector1 = await provider.embedQuery('Transformer Attention Mechanism');
    const vector2 = await provider.embedQuery('Transformer Attention Mechanism');

    expect(vector1.length).toBe(384);
    expect(vector1).toEqual(vector2);

    // Compute L2 norm
    let sumSq = 0;
    for (const val of vector1) sumSq += val * val;
    expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 4);

    expect(provider.model.isPrototypeBaseline).toBe(true);
  });

  it('EmbeddingService: embeds chunks, stores records, and populates vector store', async () => {
    const records = await service.ensureChunksEmbedded([dummyChunk]);

    expect(records.length).toBe(1);
    expect(records[0].chunkId).toBe('chk-attention-1');
    expect(records[0].modelId).toBe('local-deterministic-v1');
    expect(records[0].dimensions).toBe(384);
    expect(vectorStore.getRecordCount()).toBe(1);

    const stored = await store.get('chk-attention-1');
    expect(stored).not.toBeNull();
    expect(stored?.inputHash).toBe(records[0].inputHash);
  });

  it('Stale Detection: flags embedding stale when chunk text/contentHash changes', async () => {
    const records = await service.ensureChunksEmbedded([dummyChunk]);
    const originalRecord = records[0];

    // Chunk text modified
    const modifiedChunk: DocumentChunk = {
      ...dummyChunk,
      text: 'KV Cache optimization for Attention Mechanism',
      contentHash: 'hash-modified-456',
    };

    expect(store.isStale(originalRecord, modifiedChunk, provider.model)).toBe(true);

    // Re-embed with modified chunk
    const updatedRecords = await service.ensureChunksEmbedded([modifiedChunk]);
    expect(updatedRecords[0].inputHash).not.toBe(originalRecord.inputHash);
  });

  it('Stale Detection: flags embedding stale when modelId, version, or dimensions change', async () => {
    const records = await service.ensureChunksEmbedded([dummyChunk]);
    const record = records[0];

    const differentModel: EmbeddingModel = {
      id: 'bge-small-en-v1.5',
      name: 'BGE Small',
      provider: 'local-transformer',
      dimensions: 384,
      version: '1.5.0',
      isLocal: true,
    };

    expect(store.isStale(record, dummyChunk, differentModel)).toBe(true);
  });

  it('Index Reconstruction: rebuilds in-process vector store from persistent records', async () => {
    await service.ensureChunksEmbedded([dummyChunk]);
    expect(vectorStore.getRecordCount()).toBe(1);

    // Wipe vector store in-memory map
    await vectorStore.delete([dummyChunk.id]);
    expect(vectorStore.getRecordCount()).toBe(0);

    // Derived state rebuild
    const count = await service.rebuildVectorIndex();
    expect(count).toBe(1);
    expect(vectorStore.getRecordCount()).toBe(1);
  });
});
