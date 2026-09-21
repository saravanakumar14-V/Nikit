import {
  DocumentChunk,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
  ChunkingResult,
} from '@nikit/types';
import { IChunkingService, IChunkStore } from './types';
import { DEFAULT_CHUNKING_CONFIG, validateChunkingConfig } from './config';
import { chunkerRegistry } from './chunkers/ChunkerRegistry';
import { chunkStore } from './LocalStorageChunkStore';
import { fileStore } from '../files/LocalStorageFileStore';
import { HashService } from '../files/HashService';

export class ChunkingService implements IChunkingService {
  private store: IChunkStore;

  constructor(store: IChunkStore = chunkStore) {
    this.store = store;
  }

  async chunkDocument(
    doc: NormalizedDocument,
    file: FileRecord,
    configOverride?: Partial<ChunkingConfig>
  ): Promise<ChunkingResult> {
    const config: ChunkingConfig = {
      ...DEFAULT_CHUNKING_CONFIG,
      ...(configOverride || {}),
    };

    validateChunkingConfig(config);

    const configHash = await HashService.calculateHash(JSON.stringify(config));
    const documentChecksum = await HashService.calculateHash(doc.text);

    // 1. Check for cached chunks (incremental re-chunking optimization)
    const existingChunks = await this.store.listByDocument(doc.id);
    if (existingChunks.length > 0) {
      const first = existingChunks[0];
      const isConfigMatch = first.metadata.configHash === configHash;
      const isVersionMatch = first.metadata.chunkerVersion === config.chunkerVersion;

      if (isConfigMatch && isVersionMatch && doc.metadata.checksum === documentChecksum) {
        return {
          documentId: doc.id,
          fileId: file.id,
          chunks: existingChunks,
          totalChunks: existingChunks.length,
          chunkingDurationMs: 0, // Cached
          documentChecksum,
          chunkerVersion: config.chunkerVersion,
          configHash,
        };
      }
    }

    // 2. Invalidate previous chunks for this document before rebuilding
    if (existingChunks.length > 0) {
      await this.store.deleteChunksForDocument(doc.id);
    }

    // 3. Execute format-aware chunking strategy
    const startTime = performance.now();
    const chunker = chunkerRegistry.getChunker(file.fileType);
    const rawChunks = await chunker.chunk(doc, file, config);

    // 4. CRITICAL INVARIANT: Re-resolve CURRENT project association to protect against race conditions
    // (e.g. if project was deleted or file was detached during asynchronous processing)
    const currentFile = await fileStore.get(file.id);
    const effectiveProjectId = currentFile ? currentFile.projectId || null : null;

    const finalizedChunks: DocumentChunk[] = rawChunks.map((chunk) => ({
      ...chunk,
      projectId: effectiveProjectId,
    }));

    // 5. Persist chunks in chunk store
    if (finalizedChunks.length > 0) {
      await this.store.saveChunks(finalizedChunks);
    }

    const durationMs = Math.round(performance.now() - startTime);

    return {
      documentId: doc.id,
      fileId: file.id,
      chunks: finalizedChunks,
      totalChunks: finalizedChunks.length,
      chunkingDurationMs: durationMs,
      documentChecksum,
      chunkerVersion: config.chunkerVersion,
      configHash,
    };
  }

  async getChunksForDocument(docId: string): Promise<DocumentChunk[]> {
    return this.store.listByDocument(docId);
  }
}

export const chunkingService = new ChunkingService();
