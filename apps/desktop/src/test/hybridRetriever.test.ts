import { describe, it, expect, beforeEach } from 'vitest';
import { HybridRetriever } from '../services/retrieval/retrieval/HybridRetriever';
import { LocalEmbeddingProvider } from '../services/retrieval/embedding/LocalEmbeddingProvider';
import { LocalVectorStore } from '../services/retrieval/vector/LocalVectorStore';
import { LocalLexicalStore } from '../services/retrieval/lexical/LocalLexicalStore';
import { LocalStorageChunkStore } from '../services/knowledge/LocalStorageChunkStore';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { DocumentChunk } from '@nikit/types';

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

describe('HybridRetriever & Reciprocal Rank Fusion (RRF)', () => {
  let chunkStore: LocalStorageChunkStore;
  let projectStore: LocalStorageProjectStore;
  let retriever: HybridRetriever;

  beforeEach(() => {
    localStorageMock.clear();
    chunkStore = new LocalStorageChunkStore();
    projectStore = new LocalStorageProjectStore();

    const provider = new LocalEmbeddingProvider();
    const vectorStore = new LocalVectorStore();
    const lexicalStore = new LocalLexicalStore();

    retriever = new HybridRetriever(provider, vectorStore, lexicalStore);
  });

  const chunk1: DocumentChunk = {
    id: 'chk-kv-1',
    documentId: 'doc-kv',
    fileId: 'f-kv',
    projectId: 'proj-retrieval',
    text: 'Key-Value (KV) cache stores previously computed attention keys and values to accelerate autoregressive generation.',
    metadata: {
      headings: ['Transformer Optimization', 'KV Cache'],
      sourceName: 'kv_cache.md',
      sourceExtension: 'md',
      approximateTokens: null,
    },
    location: { documentId: 'doc-kv', startOffset: 0, endOffset: 115 },
    contentHash: 'hash-kv-1',
    sequence: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };

  const chunk2: DocumentChunk = {
    id: 'chk-gradient-1',
    documentId: 'doc-grad',
    fileId: 'f-grad',
    projectId: 'proj-retrieval',
    text: 'Stochastic Gradient Descent (SGD) minimizes the loss function by computing gradients with respect to model parameters.',
    metadata: {
      headings: ['Optimization', 'Gradient Descent'],
      sourceName: 'sgd.md',
      sourceExtension: 'md',
      approximateTokens: null,
    },
    location: { documentId: 'doc-grad', startOffset: 0, endOffset: 120 },
    contentHash: 'hash-grad-1',
    sequence: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };

  it('fuses vector and lexical results with RRF ranking and preserves provenance', async () => {
    await chunkStore.saveChunks([chunk1, chunk2]);

    const result = await retriever.retrieve('How does KV cache optimize autoregressive generation?', {
      config: { topK: 2, rankingStrategy: 'rrf' },
      filters: { projectId: 'proj-retrieval' },
    });

    expect(result.results.length).toBeGreaterThan(0);
    const topResult = result.results[0];

    expect(topResult.chunkId).toBe('chk-kv-1');
    expect(topResult.rank).toBe(1);
    expect(topResult.score).toBeGreaterThan(0);
    expect(topResult.chunk.metadata.sourceName).toBe('kv_cache.md');
    expect(topResult.chunk.metadata.headings).toEqual(['Transformer Optimization', 'KV Cache']);
  });

  it('supports Weighted Normalized fusion strategy', async () => {
    await chunkStore.saveChunks([chunk1, chunk2]);

    const result = await retriever.retrieve('Stochastic Gradient Descent SGD optimization', {
      config: { topK: 2, rankingStrategy: 'weighted_normalized', vectorWeight: 0.5, lexicalWeight: 0.5 },
    });

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].chunkId).toBe('chk-gradient-1');
  });

  it('INVARIANT: Deleting a project preserves embeddings and chunks globally for retrieval', async () => {
    const project = await projectStore.create({
      id: 'proj-retrieval-del',
      name: 'Project to Delete',
    });

    const projectChunk: DocumentChunk = {
      ...chunk1,
      id: 'chk-del-proj-1',
      projectId: project.id,
    };
    await chunkStore.saveChunks([projectChunk]);

    // Initial retrieval within project scope
    const res1 = await retriever.retrieve('KV cache', {
      filters: { projectId: project.id },
    });
    expect(res1.results.length).toBe(1);

    // Delete project
    await projectStore.delete(project.id);

    // Verify project is deleted
    expect(await projectStore.get(project.id)).toBeNull();

    // Verify chunk is preserved globally (projectId = null) and retrievable in global scope
    const resGlobal = await retriever.retrieve('KV cache', {
      filters: { projectId: null },
    });
    expect(resGlobal.results.length).toBe(1);
    expect(resGlobal.results[0].chunk.projectId).toBeNull();
  });
});
