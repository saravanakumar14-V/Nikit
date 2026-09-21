import { ChunkingConfig } from '@nikit/types';

export const CHUNKER_VERSION = 'v1.0.0';

export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  targetChunkSize: 1000, // in characters
  maxChunkSize: 1500, // in characters
  minChunkSize: 100, // in characters
  overlapSize: 150, // in characters
  preserveHeadings: true,
  preserveParagraphs: true,
  chunkerVersion: CHUNKER_VERSION,
};

export function validateChunkingConfig(config: ChunkingConfig): void {
  if (config.targetChunkSize <= 0) {
    throw new Error('targetChunkSize must be greater than 0.');
  }
  if (config.maxChunkSize < config.targetChunkSize) {
    throw new Error('maxChunkSize must be greater than or equal to targetChunkSize.');
  }
  if (config.minChunkSize < 0 || config.minChunkSize > config.targetChunkSize) {
    throw new Error('minChunkSize must be between 0 and targetChunkSize.');
  }
  if (config.overlapSize < 0 || config.overlapSize >= config.targetChunkSize) {
    throw new Error('overlapSize must satisfy: 0 <= overlapSize < targetChunkSize.');
  }
}
