import {
  Dataset,
  DatasetVersion,
  DatasetRecord,
  DatasetStatistics,
  DatasetFormat,
  DatasetSplitRatio,
} from '@nikit/types';
import { IDataStore, DatasetQuery, RecordQuery } from './DataStore';
import { localDataStore } from './LocalStorageDataStore';
import { DatasetValidator } from './DatasetValidator';
import { hashText } from '../files/HashService';
import { IngestDatasetParams, DEFAULT_SPLIT_RATIO, DEFAULT_SPLIT_SEED } from './types';

export class DatasetService {
  private store: IDataStore;

  constructor(store: IDataStore = localDataStore) {
    this.store = store;
  }

  /**
   * Ingests a new dataset, validates content, generates immutable Version 1, and assigns deterministic splits.
   */
  async ingestDataset(params: IngestDatasetParams): Promise<{ dataset: Dataset; version: DatasetVersion }> {
    const datasetId = `ds-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const versionId = `dsv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const splitRatio: DatasetSplitRatio = params.splitRatio || { ...DEFAULT_SPLIT_RATIO };
    const splitSeed = params.splitSeed ?? DEFAULT_SPLIT_SEED;

    // 1. Parse & Validate Raw Content
    const parseResult = DatasetValidator.parseAndValidate(params.rawContent, params.format);

    // 2. Deterministic Splitting
    const partitionedRecords = DatasetValidator.splitRecords(
      parseResult.records,
      versionId,
      splitRatio,
      splitSeed
    );

    // 3. Leakage Audit
    const leakageAudit = DatasetValidator.auditLeakage(partitionedRecords);

    // 4. Calculate Factual Statistics
    const lengths = partitionedRecords.map((r) => r.text.length).sort((a, b) => a - b);
    const totalChars = lengths.reduce((acc, len) => acc + len, 0);
    const totalWords = partitionedRecords.reduce(
      (acc, r) => acc + r.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );

    const medianLengthChars =
      lengths.length > 0
        ? lengths[Math.floor(lengths.length / 2)]
        : 0;

    const stats: DatasetStatistics = {
      recordCount: partitionedRecords.length,
      uniqueRecordCount: parseResult.uniqueHashes.size,
      duplicateCount: parseResult.duplicateCount,
      totalChars,
      totalWords,
      minLengthChars: lengths.length > 0 ? lengths[0] : 0,
      maxLengthChars: lengths.length > 0 ? lengths[lengths.length - 1] : 0,
      meanLengthChars: lengths.length > 0 ? Math.round(totalChars / lengths.length) : 0,
      medianLengthChars,
      splitSizes: {
        train: partitionedRecords.filter((r) => r.split === 'train').length,
        validation: partitionedRecords.filter((r) => r.split === 'validation').length,
        test: partitionedRecords.filter((r) => r.split === 'test').length,
      },
      leakageCount: leakageAudit.totalLeakage,
      leakageOverlaps: leakageAudit.overlaps,
    };

    // 5. Create Immutable Dataset Version
    const version: DatasetVersion = {
      id: versionId,
      datasetId,
      versionNumber: 1,
      contentHash: hashText(params.rawContent),
      recordCount: partitionedRecords.length,
      source: params.sourceUri || 'direct_import',
      statistics: stats,
      splitRatio,
      splitSeed,
      splitAlgorithmVersion: 'v1',
      validationResult: parseResult.validation,
      createdAt: now,
      schemaVersion: 'v1',
    };

    // 6. Create Dataset Root
    const dataset: Dataset = {
      id: datasetId,
      name: params.name.trim(),
      description: params.description?.trim() || undefined,
      format: params.format,
      recordCount: partitionedRecords.length,
      activeVersionId: versionId,
      versionIds: [versionId],
      tags: params.tags || [],
      status: parseResult.validation.valid ? 'ready' : 'failed',
      createdAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };

    // 7. Persist
    await this.store.saveRecords(versionId, partitionedRecords);
    await this.store.saveVersion(version);
    await this.store.saveDataset(dataset);

    return { dataset, version };
  }

  /**
   * Creates a new immutable version for an existing dataset.
   */
  async createDatasetVersion(
    datasetId: string,
    rawContent: string,
    format: DatasetFormat,
    options?: { splitRatio?: DatasetSplitRatio; splitSeed?: number }
  ): Promise<DatasetVersion> {
    const parent = await this.store.getDataset(datasetId);
    if (!parent) {
      throw new Error(`Dataset "${datasetId}" not found.`);
    }

    const versionId = `dsv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const splitRatio = options?.splitRatio || { ...DEFAULT_SPLIT_RATIO };
    const splitSeed = options?.splitSeed ?? DEFAULT_SPLIT_SEED;

    const parseResult = DatasetValidator.parseAndValidate(rawContent, format);
    const partitionedRecords = DatasetValidator.splitRecords(
      parseResult.records,
      versionId,
      splitRatio,
      splitSeed
    );
    const leakageAudit = DatasetValidator.auditLeakage(partitionedRecords);

    const lengths = partitionedRecords.map((r) => r.text.length).sort((a, b) => a - b);
    const totalChars = lengths.reduce((acc, len) => acc + len, 0);
    const totalWords = partitionedRecords.reduce(
      (acc, r) => acc + r.text.trim().split(/\s+/).filter(Boolean).length,
      0
    );

    const stats: DatasetStatistics = {
      recordCount: partitionedRecords.length,
      uniqueRecordCount: parseResult.uniqueHashes.size,
      duplicateCount: parseResult.duplicateCount,
      totalChars,
      totalWords,
      minLengthChars: lengths.length > 0 ? lengths[0] : 0,
      maxLengthChars: lengths.length > 0 ? lengths[lengths.length - 1] : 0,
      meanLengthChars: lengths.length > 0 ? Math.round(totalChars / lengths.length) : 0,
      medianLengthChars: lengths.length > 0 ? lengths[Math.floor(lengths.length / 2)] : 0,
      splitSizes: {
        train: partitionedRecords.filter((r) => r.split === 'train').length,
        validation: partitionedRecords.filter((r) => r.split === 'validation').length,
        test: partitionedRecords.filter((r) => r.split === 'test').length,
      },
      leakageCount: leakageAudit.totalLeakage,
      leakageOverlaps: leakageAudit.overlaps,
    };

    const existingVersions = await this.store.listVersions(datasetId);
    const nextVersionNumber = existingVersions.length + 1;

    const version: DatasetVersion = {
      id: versionId,
      datasetId,
      versionNumber: nextVersionNumber,
      contentHash: hashText(rawContent),
      recordCount: partitionedRecords.length,
      source: 'version_update',
      statistics: stats,
      splitRatio,
      splitSeed,
      splitAlgorithmVersion: 'v1',
      validationResult: parseResult.validation,
      createdAt: now,
      schemaVersion: 'v1',
    };

    await this.store.saveRecords(versionId, partitionedRecords);
    await this.store.saveVersion(version);

    return version;
  }

  // --- Query Proxies ---

  async getDataset(id: string): Promise<Dataset | null> {
    return this.store.getDataset(id);
  }

  async listDatasets(query?: DatasetQuery): Promise<Dataset[]> {
    return this.store.listDatasets(query);
  }

  async getVersion(id: string): Promise<DatasetVersion | null> {
    return this.store.getVersion(id);
  }

  async listVersions(datasetId: string): Promise<DatasetVersion[]> {
    return this.store.listVersions(datasetId);
  }

  async getRecords(query: RecordQuery): Promise<DatasetRecord[]> {
    return this.store.getRecords(query);
  }

  async deleteDataset(id: string): Promise<boolean> {
    return this.store.deleteDataset(id);
  }

  async deleteVersion(id: string): Promise<boolean> {
    return this.store.deleteVersion(id);
  }
}

export const datasetService = new DatasetService();
