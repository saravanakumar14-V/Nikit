import { Dataset, DatasetVersion, DatasetRecord, DatasetSplit } from '@nikit/types';

export interface DatasetQuery {
  search?: string;
  tag?: string;
  status?: string;
  limit?: number;
}

export interface RecordQuery {
  datasetVersionId: string;
  split?: DatasetSplit;
  limit?: number;
  offset?: number;
}

export interface IDataStore {
  // Datasets
  saveDataset(dataset: Dataset): Promise<void>;
  getDataset(id: string): Promise<Dataset | null>;
  listDatasets(query?: DatasetQuery): Promise<Dataset[]>;
  deleteDataset(id: string): Promise<boolean>;

  // Versions
  saveVersion(version: DatasetVersion): Promise<void>;
  getVersion(id: string): Promise<DatasetVersion | null>;
  listVersions(datasetId: string): Promise<DatasetVersion[]>;
  deleteVersion(id: string): Promise<boolean>;

  // Records
  saveRecords(versionId: string, records: DatasetRecord[]): Promise<void>;
  getRecords(query: RecordQuery): Promise<DatasetRecord[]>;
  countRecords(versionId: string, split?: DatasetSplit): Promise<number>;
  deleteRecords(versionId: string): Promise<void>;

  clearAll(): Promise<void>;
}
