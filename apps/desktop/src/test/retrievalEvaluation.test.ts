import { describe, it, expect, beforeEach } from 'vitest';
import { RetrievalEvaluator } from '../services/retrieval/retrieval/RetrievalEvaluator';
import { HybridRetriever } from '../services/retrieval/retrieval/HybridRetriever';
import { LocalEmbeddingProvider } from '../services/retrieval/embedding/LocalEmbeddingProvider';
import { LocalVectorStore } from '../services/retrieval/vector/LocalVectorStore';
import { LocalLexicalStore } from '../services/retrieval/lexical/LocalLexicalStore';
import { LocalStorageChunkStore } from '../services/knowledge/LocalStorageChunkStore';
import { DocumentChunk, EvaluationItem } from '@nikit/types';

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

describe('Retrieval Evaluation & Multi-Document Knowledge Corpus Fixture', () => {
  let chunkStore: LocalStorageChunkStore;
  let evaluator: RetrievalEvaluator;

  // Knowledge Corpus Fixture
  const chunks: DocumentChunk[] = [
    {
      id: 'chk-attn',
      documentId: 'doc-transformer',
      fileId: 'f-transformer',
      text: 'Attention mechanisms dynamically focus on relevant context vectors in neural networks.',
      metadata: {
        headings: ['Transformer', 'Attention'],
        sourceName: 'transformer_notes.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: { documentId: 'doc-transformer', startOffset: 0, endOffset: 85 },
      contentHash: 'h-1',
      sequence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    },
    {
      id: 'chk-mha',
      documentId: 'doc-transformer',
      fileId: 'f-transformer',
      text: 'Multi-head attention runs independent attention heads in parallel to attend to information from different representation subspaces.',
      metadata: {
        headings: ['Transformer', 'Multi-Head Attention'],
        sourceName: 'transformer_notes.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: { documentId: 'doc-transformer', startOffset: 86, endOffset: 215 },
      contentHash: 'h-2',
      sequence: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    },
    {
      id: 'chk-kvc',
      documentId: 'doc-transformer',
      fileId: 'f-transformer',
      text: 'Key-Value KV cache stores previously calculated projections during autoregressive token generation.',
      metadata: {
        headings: ['Transformer', 'KV Cache'],
        sourceName: 'transformer_notes.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: { documentId: 'doc-transformer', startOffset: 216, endOffset: 315 },
      contentHash: 'h-3',
      sequence: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    },
    {
      id: 'chk-async',
      documentId: 'doc-python',
      fileId: 'f-python',
      text: 'Python asyncio enables concurrent execution using event loops, coroutines, and async await keywords.',
      metadata: {
        headings: ['Python', 'AsyncIO'],
        sourceName: 'python_notes.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: { documentId: 'doc-python', startOffset: 0, endOffset: 100 },
      contentHash: 'h-4',
      sequence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    },
    {
      id: 'chk-gd',
      documentId: 'doc-ml',
      fileId: 'f-ml',
      text: 'Gradient descent updates model parameters iteratively in the opposite direction of the gradient of the loss function.',
      metadata: {
        headings: ['Machine Learning', 'Gradient Descent'],
        sourceName: 'ml_notes.md',
        sourceExtension: 'md',
        approximateTokens: null,
      },
      location: { documentId: 'doc-ml', startOffset: 0, endOffset: 118 },
      contentHash: 'h-5',
      sequence: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    },
  ];

  beforeEach(() => {
    localStorageMock.clear();
    chunkStore = new LocalStorageChunkStore();

    const provider = new LocalEmbeddingProvider();
    const vectorStore = new LocalVectorStore();
    const lexicalStore = new LocalLexicalStore();
    const retriever = new HybridRetriever(provider, vectorStore, lexicalStore);

    evaluator = new RetrievalEvaluator(retriever);
  });

  it('evaluates Recall@K, Precision@K, HitRate@K, and MRR across test queries', async () => {
    await chunkStore.saveChunks(chunks);

    const testDataset: EvaluationItem[] = [
      {
        query: 'How does multi-head attention work?',
        expectedChunkIds: ['chk-mha'],
      },
      {
        query: 'What is KV cache?',
        expectedChunkIds: ['chk-kvc'],
      },
      {
        query: 'How does Python asyncio work?',
        expectedChunkIds: ['chk-async'],
      },
      {
        query: 'What is gradient descent?',
        expectedChunkIds: ['chk-gd'],
      },
    ];

    const metrics = await evaluator.evaluate(testDataset, { topK: 3 });

    expect(metrics.totalQueries).toBe(4);
    expect(metrics.hitRateAtK).toBe(1.0); // 100% hit rate across all queries
    expect(metrics.meanRecallAtK).toBe(1.0);
    expect(metrics.meanReciprocalRank).toBeGreaterThanOrEqual(0.75);

    // Verify individual evaluation entries
    for (const ev of metrics.evaluations) {
      expect(ev.hitAtK).toBe(true);
      expect(ev.recallAtK).toBe(1.0);
      expect(ev.reciprocalRank).toBeGreaterThan(0);
    }
  });
});
