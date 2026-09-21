import { Dataset, DatasetVersion, DatasetRecord } from '@nikit/types';
import { IDataStore, DatasetQuery, RecordQuery } from './DataStore';
import { CURRENT_DATA_STORAGE_SCHEMA_VERSION } from './types';

const META_STORAGE_KEY = `nikit_dataset_meta_${CURRENT_DATA_STORAGE_SCHEMA_VERSION}`;
const RECORD_STORAGE_PREFIX = `nikit_dataset_records_${CURRENT_DATA_STORAGE_SCHEMA_VERSION}_`;

interface DataStorageRecord {
  schemaVersion: 'v1';
  datasets: Record<string, Dataset>;
  versions: Record<string, DatasetVersion>;
}

export class LocalStorageDataStore implements IDataStore {
  private datasets: Map<string, Dataset> = new Map();
  private versions: Map<string, DatasetVersion> = new Map();
  private memoryRecords: Map<string, DatasetRecord[]> = new Map();

  private getStorage(): Storage | null {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  private async loadMeta(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const raw = storage.getItem(META_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DataStorageRecord;
          if (parsed && typeof parsed === 'object') {
            this.datasets.clear();
            this.versions.clear();

            if (parsed.datasets && typeof parsed.datasets === 'object') {
              for (const [id, d] of Object.entries(parsed.datasets)) {
                this.datasets.set(id, d);
              }
            }
            if (parsed.versions && typeof parsed.versions === 'object') {
              for (const [id, v] of Object.entries(parsed.versions)) {
                this.versions.set(id, v);
              }
            }
          }
        }
      }
    } catch {
      this.datasets.clear();
      this.versions.clear();
    }
  }

  private async persistMeta(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const payload: DataStorageRecord = {
          schemaVersion: 'v1',
          datasets: Object.fromEntries(this.datasets.entries()),
          versions: Object.fromEntries(this.versions.entries()),
        };
        storage.setItem(META_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // Gracefully handle storage quota
    }
  }

  // --- Dataset Operations ---

  async saveDataset(dataset: Dataset): Promise<void> {
    await this.loadMeta();
    this.datasets.set(dataset.id, { ...dataset });
    await this.persistMeta();
  }

  async getDataset(id: string): Promise<Dataset | null> {
    await this.loadMeta();
    const d = this.datasets.get(id);
    return d ? { ...d } : null;
  }

  async listDatasets(query?: DatasetQuery): Promise<Dataset[]> {
    await this.loadMeta();
    let list = Array.from(this.datasets.values());

    if (query) {
      if (query.status) {
        list = list.filter((d) => d.status === query.status);
      }
      if (query.tag) {
        const t = query.tag.toLowerCase();
        list = list.filter((d) => d.tags?.some((tag) => tag.toLowerCase() === t));
      }
      if (query.search && query.search.trim()) {
        const term = query.search.toLowerCase().trim();
        list = list.filter(
          (d) =>
            d.name.toLowerCase().includes(term) ||
            (d.description && d.description.toLowerCase().includes(term))
        );
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    return list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((d) => ({ ...d }));
  }

  async deleteDataset(id: string): Promise<boolean> {
    await this.loadMeta();
    const dataset = this.datasets.get(id);
    if (!dataset) return false;

    // Delete associated versions and records
    for (const vId of dataset.versionIds) {
      this.versions.delete(vId);
      await this.deleteRecords(vId);
    }

    const existed = this.datasets.delete(id);
    await this.persistMeta();
    return existed;
  }

  // --- Version Operations ---

  async saveVersion(version: DatasetVersion): Promise<void> {
    await this.loadMeta();
    this.versions.set(version.id, { ...version });

    const parent = this.datasets.get(version.datasetId);
    if (parent) {
      if (!parent.versionIds.includes(version.id)) {
        parent.versionIds.push(version.id);
      }
      parent.activeVersionId = version.id;
      parent.recordCount = version.recordCount;
      parent.updatedAt = new Date().toISOString();
      this.datasets.set(parent.id, parent);
    }

    await this.persistMeta();
  }

  async getVersion(id: string): Promise<DatasetVersion | null> {
    await this.loadMeta();
    const v = this.versions.get(id);
    return v ? { ...v } : null;
  }

  async listVersions(datasetId: string): Promise<DatasetVersion[]> {
    await this.loadMeta();
    return Array.from(this.versions.values())
      .filter((v) => v.datasetId === datasetId)
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((v) => ({ ...v }));
  }

  async deleteVersion(id: string): Promise<boolean> {
    await this.loadMeta();
    const v = this.versions.get(id);
    if (!v) return false;

    this.versions.delete(id);
    await this.deleteRecords(id);

    const parent = this.datasets.get(v.datasetId);
    if (parent) {
      parent.versionIds = parent.versionIds.filter((vId) => vId !== id);
      if (parent.activeVersionId === id) {
        parent.activeVersionId = parent.versionIds[parent.versionIds.length - 1] || undefined;
      }
      this.datasets.set(parent.id, parent);
    }

    await this.persistMeta();
    return true;
  }

  // --- Records Operations ---

  async saveRecords(versionId: string, records: DatasetRecord[]): Promise<void> {
    this.memoryRecords.set(versionId, [...records]);

    try {
      const storage = this.getStorage();
      if (storage) {
        storage.setItem(`${RECORD_STORAGE_PREFIX}${versionId}`, JSON.stringify(records));
      }
    } catch {
      // In-memory fallback if LocalStorage is full
    }
  }

  async getRecords(query: RecordQuery): Promise<DatasetRecord[]> {
    let records: DatasetRecord[] = this.memoryRecords.get(query.datasetVersionId) || [];

    if (records.length === 0) {
      try {
        const storage = this.getStorage();
        if (storage) {
          const raw = storage.getItem(`${RECORD_STORAGE_PREFIX}${query.datasetVersionId}`);
          if (raw) {
            records = JSON.parse(raw);
            this.memoryRecords.set(query.datasetVersionId, records);
          }
        }
      } catch {
        records = [];
      }
    }

    if (query.split) {
      records = records.filter((r) => r.split === query.split);
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;
    return records.slice(offset, offset + limit).map((r) => ({ ...r }));
  }

  async countRecords(versionId: string, split?: DatasetRecord['split']): Promise<number> {
    const records = await this.getRecords({ datasetVersionId: versionId, limit: 1000000 });
    return split ? records.filter((r) => r.split === split).length : records.length;
  }

  async deleteRecords(versionId: string): Promise<void> {
    this.memoryRecords.delete(versionId);
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(`${RECORD_STORAGE_PREFIX}${versionId}`);
      }
    } catch {
      // Ignore
    }
  }

  async clearAll(): Promise<void> {
    this.datasets.clear();
    this.versions.clear();
    this.memoryRecords.clear();

    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(META_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

export const localDataStore = new LocalStorageDataStore();
