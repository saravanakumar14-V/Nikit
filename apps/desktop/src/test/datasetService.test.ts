import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageDataStore } from '../services/data/LocalStorageDataStore';
import { DatasetService } from '../services/data/DatasetService';
import { DatasetValidator } from '../services/data/DatasetValidator';

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

describe('DatasetService: Ingestion, Validation, Immutability & Leakage Protection', () => {
  let store: LocalStorageDataStore;
  let service: DatasetService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageDataStore();
    service = new DatasetService(store);
  });

  it('ingests JSONL dataset, validates records, and generates immutable Version 1', async () => {
    const rawJsonl = `{"prompt":"What is 2+2?","response":"4"}
{"prompt":"Name the capital of France.","response":"Paris"}
{"prompt":"Explain photosynthesis.","response":"Plants convert light into chemical energy."}`;

    const { dataset, version } = await service.ingestDataset({
      name: 'Elementary QA',
      format: 'jsonl',
      rawContent: rawJsonl,
      tags: ['qa', 'test'],
    });

    expect(dataset.id).toBeDefined();
    expect(dataset.name).toBe('Elementary QA');
    expect(dataset.status).toBe('ready');
    expect(dataset.versionIds.length).toBe(1);

    expect(version.versionNumber).toBe(1);
    expect(version.recordCount).toBe(3);
    expect(version.statistics.totalWords).toBeGreaterThan(0);
    expect(version.statistics.duplicateCount).toBe(0);
    expect(version.statistics.leakageCount).toBe(0);
    expect(version.contentHash).toBeDefined();
  });

  it('detects malformed JSONL and reports structured validation issues', () => {
    const brokenJsonl = `{"prompt":"Valid","response":"OK"}
{broken json line}
{"unsupported":"schema"}`;

    const result = DatasetValidator.parseAndValidate(brokenJsonl, 'jsonl');
    expect(result.validation.valid).toBe(false);
    expect(result.validation.errorCount).toBe(2);
    expect(result.records.length).toBe(1);
  });

  it('performs deterministic splitting with identical seed reproduction', () => {
    const records = [
      { text: 'Sample 1', contentHash: 'h1' },
      { text: 'Sample 2', contentHash: 'h2' },
      { text: 'Sample 3', contentHash: 'h3' },
      { text: 'Sample 4', contentHash: 'h4' },
      { text: 'Sample 5', contentHash: 'h5' },
    ];

    const splitA = DatasetValidator.splitRecords(
      records,
      'v1',
      { train: 0.6, validation: 0.2, test: 0.2 },
      100
    );

    const splitB = DatasetValidator.splitRecords(
      records,
      'v1',
      { train: 0.6, validation: 0.2, test: 0.2 },
      100
    );

    expect(splitA.map((r) => r.split)).toEqual(splitB.map((r) => r.split));
    expect(splitA.filter((r) => r.split === 'train').length).toBe(3);
  });

  it('audits exact-content leakage across train, validation, and test partitions', () => {
    const records = [
      { id: '1', datasetVersionId: 'v1', split: 'train' as const, text: 'Alpha', contentHash: 'hash-alpha' },
      { id: '2', datasetVersionId: 'v1', split: 'validation' as const, text: 'Alpha', contentHash: 'hash-alpha' }, // Leaked into val
      { id: '3', datasetVersionId: 'v1', split: 'test' as const, text: 'Beta', contentHash: 'hash-beta' },
    ];

    const audit = DatasetValidator.auditLeakage(records);
    expect(audit.totalLeakage).toBe(1);
    expect(audit.overlaps.length).toBe(1);
    expect(audit.overlaps[0].splitA).toBe('train');
    expect(audit.overlaps[0].splitB).toBe('validation');
  });

  it('creates immutable dataset version updates without mutating previous versions', async () => {
    const rawV1 = `{"text":"First version record"}`;
    const { dataset, version: v1 } = await service.ingestDataset({
      name: 'Versioning Test',
      format: 'jsonl',
      rawContent: rawV1,
    });

    const rawV2 = `{"text":"First version record"}\n{"text":"Second version record"}`;
    const v2 = await service.createDatasetVersion(dataset.id, rawV2, 'jsonl');

    expect(v2.versionNumber).toBe(2);
    expect(v2.recordCount).toBe(2);
    expect(v2.contentHash).not.toBe(v1.contentHash);

    // Old version remains untouched
    const retrievedV1 = await service.getVersion(v1.id);
    expect(retrievedV1?.recordCount).toBe(1);
    expect(retrievedV1?.contentHash).toBe(v1.contentHash);
  });
});
