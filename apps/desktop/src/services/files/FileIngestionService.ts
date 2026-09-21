import { FileRecord } from '@nikit/types';
import { fileStore } from './LocalStorageFileStore';
import { documentStore } from './LocalStorageDocumentStore';
import { parserRegistry } from './ParserRegistry';
import { FileCapabilityService } from './FileCapabilityService';
import { HashService } from './HashService';
import { FILE_LIMITS } from './config';
import { chunkingService } from '../knowledge/ChunkingService';

export interface RawFileInput {
  name: string;
  content: string | ArrayBuffer;
  sizeBytes?: number;
  sourcePath?: string;
  mimeType?: string;
}

export class FileIngestionService {
  /**
   * Primary ingestion pipeline.
   * Transforms raw file payloads into validated, normalized documents through explicit state stages.
   */
  static async ingest(
    input: RawFileInput,
    projectId?: string | null
  ): Promise<FileRecord> {
    const extension = FileCapabilityService.getCleanExtension(input.name);
    const fileType = FileCapabilityService.getFileType(input.name);
    const sizeBytes =
      input.sizeBytes !== undefined
        ? input.sizeBytes
        : typeof input.content === 'string'
        ? new TextEncoder().encode(input.content).length
        : input.content.byteLength;

    // 1. Stage: detecting
    const contentHash = await HashService.calculateHash(input.content);

    // Initial Registration
    const record = await fileStore.create({
      name: input.name,
      extension,
      fileType,
      sizeBytes,
      projectId: projectId || null,
      sourcePath: input.sourcePath,
      contentHash,
      mimeType: input.mimeType,
      status: 'processing',
      ingestion: {
        status: 'processing',
        stage: 'detecting',
        startedAt: new Date().toISOString(),
        progress: 20,
      },
    });

    // Enforce file size limit
    if (sizeBytes > FILE_LIMITS.maxFileSizeBytes) {
      return fileStore.update(record.id, {
        status: 'failed',
        ingestion: {
          status: 'failed',
          stage: 'reading',
          completedAt: new Date().toISOString(),
          errorCode: 'ERR_FILE_TOO_LARGE',
          errorMessage: `File exceeds the maximum safe limit (${FILE_LIMITS.maxFileSizeBytes / (1024 * 1024)} MB).`,
        },
      });
    }

    // Capability / Support check
    if (!FileCapabilityService.isSupported(input.name)) {
      return fileStore.update(record.id, {
        status: 'unsupported',
        ingestion: {
          status: 'unsupported',
          stage: 'parsing',
          completedAt: new Date().toISOString(),
          errorCode: 'ERR_UNSUPPORTED_FORMAT',
          errorMessage: `File format .${extension || 'unknown'} is not supported in Phase 5A.`,
        },
      });
    }

    // 2. Stage: reading & parsing
    await fileStore.update(record.id, {
      ingestion: {
        status: 'processing',
        stage: 'reading',
        progress: 50,
      },
    });

    const parser = parserRegistry.getParser(input.name, input.mimeType);
    if (!parser) {
      return fileStore.update(record.id, {
        status: 'unsupported',
        ingestion: {
          status: 'unsupported',
          stage: 'parsing',
          completedAt: new Date().toISOString(),
          errorCode: 'ERR_PARSER_NOT_FOUND',
          errorMessage: `No parser available for .${extension}`,
        },
      });
    }

    // 3. Stage: normalizing & finalizing
    try {
      await fileStore.update(record.id, {
        ingestion: {
          status: 'processing',
          stage: 'normalizing',
          progress: 80,
        },
      });

      const normalizedDoc = await parser.parse(
        record.id,
        input.name,
        input.content,
        input.mimeType
      );

      // Save extracted document separately
      await documentStore.save(normalizedDoc);

      // 4. Stage: ready (Document is officially READY)
      const updatedRecord = await fileStore.update(record.id, {
        status: 'ready',
        normalizedDocumentId: normalizedDoc.id,
        metadata: {
          lineCount: normalizedDoc.metadata.lineCount,
          characterCount: normalizedDoc.metadata.characterCount,
          wordCount: normalizedDoc.metadata.wordCount,
          detectedEncoding: normalizedDoc.metadata.detectedEncoding,
          approximateTokens: null, // Null until real tokenizer connects
        },
        ingestion: {
          status: 'ready',
          stage: 'finalizing',
          progress: 100,
          completedAt: new Date().toISOString(),
        },
      });

      // 5. Asynchronous downstream chunking stage (lifecycle decoupled from document readiness)
      try {
        await chunkingService.chunkDocument(normalizedDoc, updatedRecord);
      } catch (chunkErr: unknown) {
        // Document remains ready even if chunking encounters an issue
        console.warn(`Downstream chunking failed for ${record.id}:`, chunkErr);
      }

      return updatedRecord;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return await fileStore.update(record.id, {
        status: 'failed',
        ingestion: {
          status: 'failed',
          stage: 'parsing',
          completedAt: new Date().toISOString(),
          errorCode: 'ERR_PARSING_FAILED',
          errorMessage: errorMsg,
        },
      });
    }
  }

  /**
   * Retries ingestion on an existing file record with refreshed content.
   */
  static async retry(fileId: string, rawContent?: string | ArrayBuffer): Promise<FileRecord> {
    const file = await fileStore.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found.`);
    }

    if (!rawContent) {
      // If no fresh content provided, try to read from normalized document if present
      if (file.normalizedDocumentId) {
        const doc = await documentStore.get(file.normalizedDocumentId);
        if (doc) {
          rawContent = doc.text;
        }
      }
    }

    if (!rawContent) {
      return fileStore.update(fileId, {
        status: 'unavailable',
        ingestion: {
          status: 'unavailable',
          stage: 'reading',
          errorMessage: 'Physical file content is unavailable. Please select or drop the file again.',
        },
      });
    }

    // Re-run parsing
    const parser = parserRegistry.getParser(file.name, file.mimeType);
    if (!parser) {
      return fileStore.update(fileId, {
        status: 'unsupported',
        ingestion: {
          status: 'unsupported',
          stage: 'parsing',
          errorMessage: `No parser available for .${file.extension}`,
        },
      });
    }

    try {
      const normalizedDoc = await parser.parse(fileId, file.name, rawContent, file.mimeType);
      await documentStore.save(normalizedDoc);

      return await fileStore.update(fileId, {
        status: 'ready',
        normalizedDocumentId: normalizedDoc.id,
        metadata: {
          lineCount: normalizedDoc.metadata.lineCount,
          characterCount: normalizedDoc.metadata.characterCount,
          wordCount: normalizedDoc.metadata.wordCount,
          detectedEncoding: normalizedDoc.metadata.detectedEncoding,
          approximateTokens: null,
        },
        ingestion: {
          status: 'ready',
          stage: 'finalizing',
          progress: 100,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return await fileStore.update(fileId, {
        status: 'failed',
        ingestion: {
          status: 'failed',
          stage: 'parsing',
          completedAt: new Date().toISOString(),
          errorCode: 'ERR_PARSING_FAILED',
          errorMessage: errorMsg,
        },
      });
    }
  }
}
