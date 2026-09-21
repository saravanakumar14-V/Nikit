import {
  DatasetSplitRatio,
  DatasetFormat,
} from '@nikit/types';

export const CURRENT_DATA_STORAGE_SCHEMA_VERSION = 'v1';

export const DEFAULT_SPLIT_RATIO: DatasetSplitRatio = {
  train: 0.8,
  validation: 0.1,
  test: 0.1,
};

export const DEFAULT_SPLIT_SEED = 42;

export interface IngestDatasetParams {
  name: string;
  description?: string;
  format: DatasetFormat;
  rawContent: string;
  sourceUri?: string;
  tags?: string[];
  splitRatio?: DatasetSplitRatio;
  splitSeed?: number;
}
