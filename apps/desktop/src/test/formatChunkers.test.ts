import { describe, it, expect } from 'vitest';
import { CodeChunker } from '../services/knowledge/chunkers/CodeChunker';
import { CsvChunker } from '../services/knowledge/chunkers/CsvChunker';
import { JsonChunker } from '../services/knowledge/chunkers/JsonChunker';
import { PlainTextChunker } from '../services/knowledge/chunkers/PlainTextChunker';
import { DEFAULT_CHUNKING_CONFIG } from '../services/knowledge/config';
import { NormalizedDocument, FileRecord } from '@nikit/types';

describe('Format-Specific Document Chunkers', () => {
  it('CodeChunker: preserves exact raw code without reformatting and records language', async () => {
    const rawCode = `import torch
import torch.nn as nn

class TransformerBlock(nn.Module):
    def __init__(self, d_model: int):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, num_heads=8)
`;

    const file: FileRecord = {
      id: 'f-code-1',
      name: 'model.py',
      extension: 'py',
      fileType: 'code',
      sizeBytes: rawCode.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ready',
      ingestion: { status: 'ready' },
      metadata: {},
      schemaVersion: 'v1',
    };

    const doc: NormalizedDocument = {
      id: 'doc-code-1',
      fileId: file.id,
      title: 'model.py',
      text: rawCode,
      metadata: {
        sourceName: 'model.py',
        sourceType: 'code',
        characterCount: rawCode.length,
        lineCount: 8,
        wordCount: 18,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const chunker = new CodeChunker();
    const chunks = await chunker.chunk(doc, file, DEFAULT_CHUNKING_CONFIG);

    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe(rawCode);
    expect(chunks[0].metadata.language).toBe('py');
    expect(chunks[0].location.startLine).toBe(1);
  });

  it('CsvChunker: INJECTS column header row into each row group chunk for tabular context', async () => {
    const header = 'id,name,role,department';
    const rows = [
      '1,Alice,AI Engineer,Core Research',
      '2,Bob,Kernel Specialist,Systems',
      '3,Charlie,Research Scientist,Quiet Intelligence',
    ];
    const rawCsv = [header, ...rows].join('\n');

    const file: FileRecord = {
      id: 'f-csv-1',
      name: 'team.csv',
      extension: 'csv',
      fileType: 'csv',
      sizeBytes: rawCsv.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ready',
      ingestion: { status: 'ready' },
      metadata: {},
      schemaVersion: 'v1',
    };

    const doc: NormalizedDocument = {
      id: 'doc-csv-1',
      fileId: file.id,
      title: 'team.csv',
      text: rawCsv,
      metadata: {
        sourceName: 'team.csv',
        sourceType: 'csv',
        characterCount: rawCsv.length,
        lineCount: 4,
        wordCount: 16,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const chunker = new CsvChunker();
    // Use smaller target chunk size to force multiple row groups
    const chunks = await chunker.chunk(doc, file, {
      ...DEFAULT_CHUNKING_CONFIG,
      targetChunkSize: 70,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // Invariant: every CSV chunk MUST start with the column header
    for (const chunk of chunks) {
      expect(chunk.text.startsWith(header)).toBe(true);
    }
  });

  it('JsonChunker: preserves key hierarchy and JSON path metadata', async () => {
    const rawJson = JSON.stringify(
      {
        hyperparameters: {
          learningRate: 0.0001,
          batchSize: 32,
          optimizer: 'AdamW',
        },
        architecture: {
          layers: 32,
          heads: 16,
          hiddenDim: 4096,
        },
      },
      null,
      2
    );

    const file: FileRecord = {
      id: 'f-json-1',
      name: 'config.json',
      extension: 'json',
      fileType: 'json',
      sizeBytes: rawJson.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ready',
      ingestion: { status: 'ready' },
      metadata: {},
      schemaVersion: 'v1',
    };

    const doc: NormalizedDocument = {
      id: 'doc-json-1',
      fileId: file.id,
      title: 'config.json',
      text: rawJson,
      metadata: {
        sourceName: 'config.json',
        sourceType: 'json',
        characterCount: rawJson.length,
        lineCount: 16,
        wordCount: 18,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const chunker = new JsonChunker();
    const chunks = await chunker.chunk(doc, file, {
      ...DEFAULT_CHUNKING_CONFIG,
      targetChunkSize: 80,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0].metadata.path).toBeDefined();
  });

  it('PlainTextChunker: splits long text using paragraph and sentence boundaries', async () => {
    const p1 = 'First paragraph explaining attention mechanism concepts in depth.';
    const p2 = 'Second paragraph detailing how multi-query attention saves KV-cache memory bandwidth.';
    const fullText = `${p1}\n\n${p2}`;

    const file: FileRecord = {
      id: 'f-txt-1',
      name: 'notes.txt',
      extension: 'txt',
      fileType: 'text',
      sizeBytes: fullText.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ready',
      ingestion: { status: 'ready' },
      metadata: {},
      schemaVersion: 'v1',
    };

    const doc: NormalizedDocument = {
      id: 'doc-txt-1',
      fileId: file.id,
      title: 'notes.txt',
      text: fullText,
      metadata: {
        sourceName: 'notes.txt',
        sourceType: 'text',
        characterCount: fullText.length,
        lineCount: 3,
        wordCount: 20,
        parsedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    const chunker = new PlainTextChunker();
    const chunks = await chunker.chunk(doc, file, {
      ...DEFAULT_CHUNKING_CONFIG,
      targetChunkSize: 75,
    });

    expect(chunks.length).toBe(2);
    expect(chunks[0].text).toBe(p1);
    expect(chunks[1].text).toBe(p2);
  });
});
