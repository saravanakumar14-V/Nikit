import { describe, it, expect, beforeEach } from 'vitest';
import { FileIngestionService } from '../services/files/FileIngestionService';
import { documentStore } from '../services/files/LocalStorageDocumentStore';
import { FILE_LIMITS } from '../services/files/config';

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

describe('FileIngestionService State Machine Pipeline', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should ingest a supported markdown file to ready status with extracted document', async () => {
    const rawContent = '# Attention Mechanisms\n\nDetailed breakdown of queries, keys, and values.';
    const record = await FileIngestionService.ingest({
      name: 'attention.md',
      content: rawContent,
    });

    expect(record.status).toBe('ready');
    expect(record.ingestion.status).toBe('ready');
    expect(record.ingestion.stage).toBe('finalizing');
    expect(record.metadata.characterCount).toBe(rawContent.length);
    expect(record.metadata.lineCount).toBe(3);
    expect(record.normalizedDocumentId).toBeDefined();

    // Verify document was stored separately
    const doc = await documentStore.get(record.normalizedDocumentId!);
    expect(doc).not.toBeNull();
    expect(doc?.title).toBe('Attention Mechanisms');
    expect(doc?.text).toBe(rawContent);
  });

  it('should mark unsupported file format as unsupported status with error message', async () => {
    const record = await FileIngestionService.ingest({
      name: 'compiled_binary.exe',
      content: new ArrayBuffer(100),
    });

    expect(record.status).toBe('unsupported');
    expect(record.ingestion.status).toBe('unsupported');
    expect(record.ingestion.errorCode).toBe('ERR_UNSUPPORTED_FORMAT');
  });

  it('should mark oversized file as failed status', async () => {
    const record = await FileIngestionService.ingest({
      name: 'giant_dataset.csv',
      content: 'a,b,c',
      sizeBytes: FILE_LIMITS.maxFileSizeBytes + 1024,
    });

    expect(record.status).toBe('failed');
    expect(record.ingestion.status).toBe('failed');
    expect(record.ingestion.errorCode).toBe('ERR_FILE_TOO_LARGE');
  });

  it('should handle malformed JSON and allow retry', async () => {
    const record = await FileIngestionService.ingest({
      name: 'broken_config.json',
      content: '{ invalid_json_content }',
    });

    expect(record.status).toBe('failed');
    expect(record.ingestion.status).toBe('failed');
    expect(record.ingestion.errorCode).toBe('ERR_PARSING_FAILED');

    // Retry with valid JSON
    const fixedRecord = await FileIngestionService.retry(
      record.id,
      JSON.stringify({ model: 'ZaqX 1.0', valid: true })
    );

    expect(fixedRecord.status).toBe('ready');
    expect(fixedRecord.ingestion.status).toBe('ready');
  });
});
