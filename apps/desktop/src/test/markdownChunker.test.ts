import { describe, it, expect } from 'vitest';
import { MarkdownChunker } from '../services/knowledge/chunkers/MarkdownChunker';
import { DEFAULT_CHUNKING_CONFIG } from '../services/knowledge/config';
import { NormalizedDocument, FileRecord } from '@nikit/types';

describe('MarkdownChunker Heading Ancestry & Structure', () => {
  const dummyFile: FileRecord = {
    id: 'file-transformer-spec',
    name: 'transformer.md',
    extension: 'md',
    fileType: 'markdown',
    sizeBytes: 1024,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'ready',
    ingestion: { status: 'ready' },
    metadata: {},
    schemaVersion: 'v1',
  };

  it('PRESERVES exact heading ancestry hierarchy: Transformer -> Attention -> Multi-Head Attention', async () => {
    const rawMarkdown = `# Transformer

## Attention

Attention allows the model to dynamically focus on relevant context vectors.

## Multi-Head Attention

Multiple attention heads compute independent attention patterns in parallel across distinct representation subspaces.`;

    const doc: NormalizedDocument = {
      id: 'doc-transformer-spec',
      fileId: dummyFile.id,
      title: 'Transformer Architecture Spec',
      text: rawMarkdown,
      metadata: {
        sourceName: 'transformer.md',
        sourceType: 'markdown',
        characterCount: rawMarkdown.length,
        lineCount: 11,
        wordCount: 30,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const chunker = new MarkdownChunker();
    const chunks = await chunker.chunk(doc, dummyFile, DEFAULT_CHUNKING_CONFIG);

    expect(chunks.length).toBeGreaterThanOrEqual(2);

    // Verify first section heading ancestry
    const attentionChunk = chunks.find((c) => c.text.includes('Attention allows'));
    expect(attentionChunk).toBeDefined();
    expect(attentionChunk?.metadata.headings).toEqual(['Transformer', 'Attention']);

    // Verify second section heading ancestry
    const mhaChunk = chunks.find((c) => c.text.includes('Multiple attention heads'));
    expect(mhaChunk).toBeDefined();
    expect(mhaChunk?.metadata.headings).toEqual(['Transformer', 'Multi-Head Attention']);
  });

  it('preserves deep nested headings and source line offsets', async () => {
    const deepMarkdown = `# Machine Learning
## Deep Learning
### Neural Networks
#### Activation Functions
ReLU and GELU are common activation functions.`;

    const doc: NormalizedDocument = {
      id: 'doc-deep-headings',
      fileId: dummyFile.id,
      title: 'ML Guide',
      text: deepMarkdown,
      metadata: {
        sourceName: 'guide.md',
        sourceType: 'markdown',
        characterCount: deepMarkdown.length,
        lineCount: 5,
        wordCount: 14,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const chunker = new MarkdownChunker();
    const chunks = await chunker.chunk(doc, dummyFile, DEFAULT_CHUNKING_CONFIG);

    expect(chunks.length).toBe(1);
    expect(chunks[0].metadata.headings).toEqual([
      'Machine Learning',
      'Deep Learning',
      'Neural Networks',
      'Activation Functions',
    ]);
    expect(chunks[0].location.startLine).toBe(4);
    expect(chunks[0].location.endLine).toBe(5);
  });
});
