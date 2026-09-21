import { describe, it, expect, beforeEach } from 'vitest';
import { LocalVectorStore } from '../services/retrieval/vector/LocalVectorStore';
import { LocalLexicalStore } from '../services/retrieval/lexical/LocalLexicalStore';
import { LocalEmbeddingProvider } from '../services/retrieval/embedding/LocalEmbeddingProvider';
import { DocumentChunk } from '@nikit/types';

describe('LocalVectorStore & LocalLexicalStore Search Engines', () => {
  let vectorStore: LocalVectorStore;
  let lexicalStore: LocalLexicalStore;
  let provider: LocalEmbeddingProvider;

  beforeEach(() => {
    vectorStore = new LocalVectorStore();
    lexicalStore = new LocalLexicalStore();
    provider = new LocalEmbeddingProvider();
  });

  const chunkA: DocumentChunk = {
    id: 'chk-attn-01',
    documentId: 'doc-attn',
    fileId: 'file-attn',
    projectId: 'proj-1',
    text: 'Multi-Head Attention mechanisms allow models to jointly attend to information from different representation subspaces.',
    metadata: {
      headings: ['Transformer', 'Multi-Head Attention'],
      sourceName: 'attention.md',
      sourceExtension: 'md',
      approximateTokens: null,
    },
    location: { documentId: 'doc-attn', startOffset: 0, endOffset: 120 },
    contentHash: 'hash-a',
    sequence: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };

  const chunkB: DocumentChunk = {
    id: 'chk-python-01',
    documentId: 'doc-py',
    fileId: 'file-py',
    projectId: 'proj-2',
    text: 'Python asyncio provides cooperative multitasking using async and await coroutines and event loops.',
    metadata: {
      headings: ['Python', 'AsyncIO'],
      sourceName: 'asyncio.md',
      sourceExtension: 'md',
      approximateTokens: null,
    },
    location: { documentId: 'doc-py', startOffset: 0, endOffset: 105 },
    contentHash: 'hash-b',
    sequence: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };

  it('LocalVectorStore: ranks matching vector query higher than unrelated query and respects filters', async () => {
    const recA = await provider.embed({
      chunkId: chunkA.id,
      text: chunkA.text,
      documentId: chunkA.documentId,
      fileId: chunkA.fileId,
      projectId: chunkA.projectId,
    });

    const recB = await provider.embed({
      chunkId: chunkB.id,
      text: chunkB.text,
      documentId: chunkB.documentId,
      fileId: chunkB.fileId,
      projectId: chunkB.projectId,
    });

    await vectorStore.upsert([recA, recB]);

    // Query relevant to Attention
    const queryVector = await provider.embedQuery('How does Multi-Head Attention work?');
    const results = await vectorStore.search(queryVector, { topK: 2 });

    expect(results.length).toBe(2);
    expect(results[0].chunkId).toBe('chk-attn-01');
    expect(results[0].score).toBeGreaterThan(results[1].score);

    // Test project filter
    const filteredResults = await vectorStore.search(queryVector, {
      topK: 2,
      filters: { projectId: 'proj-2' },
    });
    expect(filteredResults.length).toBe(1);
    expect(filteredResults[0].chunkId).toBe('chk-python-01');
  });

  it('LocalLexicalStore: matches exact terms and boosts heading matches', async () => {
    const results = await lexicalStore.search(
      'Multi-Head Attention representation',
      [chunkA, chunkB],
      { topK: 2 }
    );

    expect(results.length).toBe(1);
    expect(results[0].chunkId).toBe('chk-attn-01');
    expect(results[0].score).toBeGreaterThan(0.5);

    // Heading boost check
    const headingResults = await lexicalStore.search(
      'AsyncIO coroutines',
      [chunkA, chunkB],
      { topK: 2 }
    );
    expect(headingResults[0].chunkId).toBe('chk-python-01');
  });
});
