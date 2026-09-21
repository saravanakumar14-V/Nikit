import {
  DocumentChunk,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
} from '@nikit/types';
import { IChunker } from '../types';
import { createDocumentChunk, computeOffsetsAndLines } from './chunkUtils';
import { HashService } from '../../files/HashService';

export class JsonChunker implements IChunker {
  id = 'json-chunker';
  strategyName = 'key-hierarchy-json-chunker';

  async chunk(
    doc: NormalizedDocument,
    file: FileRecord,
    config: ChunkingConfig
  ): Promise<DocumentChunk[]> {
    const configHash = await HashService.calculateHash(JSON.stringify(config));
    const fullText = doc.text;

    // If small enough, keep as single chunk
    if (fullText.length <= config.targetChunkSize) {
      const chunk = await createDocumentChunk({
        doc,
        file,
        text: fullText,
        sequence: 1,
        path: 'root',
        config,
        configHash,
        strategyName: this.strategyName,
      });
      return [chunk];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(fullText);
    } catch {
      // Fallback: simple line chunking if JSON failed parsing
      const chunk = await createDocumentChunk({
        doc,
        file,
        text: fullText.slice(0, config.maxChunkSize),
        sequence: 1,
        path: 'root',
        config,
        configHash,
        strategyName: this.strategyName,
      });
      return [chunk];
    }

    const chunks: DocumentChunk[] = [];
    let sequence = 0;
    let searchOffset = 0;

    if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed)) {
        // Chunk array items in groups
        let accumulatedItems: unknown[] = [];
        let currentLen = 0;
        let startIndex = 0;

        for (let i = 0; i < parsed.length; i++) {
          const itemStr = JSON.stringify(parsed[i], null, 2);
          if (currentLen + itemStr.length > config.targetChunkSize && accumulatedItems.length > 0) {
            sequence++;
            const chunkText = JSON.stringify(accumulatedItems, null, 2);
            const loc = computeOffsetsAndLines(fullText, chunkText, searchOffset);
            searchOffset = loc.endOffset;

            const chunk = await createDocumentChunk({
              doc,
              file,
              text: chunkText,
              sequence,
              path: `[${startIndex}..${i - 1}]`,
              startOffset: loc.startOffset,
              endOffset: loc.endOffset,
              startLine: loc.startLine,
              endLine: loc.endLine,
              config,
              configHash,
              strategyName: this.strategyName,
            });
            chunks.push(chunk);

            accumulatedItems = [parsed[i]];
            currentLen = itemStr.length;
            startIndex = i;
          } else {
            accumulatedItems.push(parsed[i]);
            currentLen += itemStr.length;
          }
        }

        if (accumulatedItems.length > 0) {
          sequence++;
          const chunkText = JSON.stringify(accumulatedItems, null, 2);
          const loc = computeOffsetsAndLines(fullText, chunkText, searchOffset);

          const chunk = await createDocumentChunk({
            doc,
            file,
            text: chunkText,
            sequence,
            path: `[${startIndex}..${parsed.length - 1}]`,
            startOffset: loc.startOffset,
            endOffset: loc.endOffset,
            startLine: loc.startLine,
            endLine: loc.endLine,
            config,
            configHash,
            strategyName: this.strategyName,
          });
          chunks.push(chunk);
        }
      } else {
        // Chunk by top-level keys
        const record = parsed as Record<string, unknown>;
        const keys = Object.keys(record);
        let accumulatedObj: Record<string, unknown> = {};
        let currentLen = 0;
        let startKey = keys[0] || '';

        for (let i = 0; i < keys.length; i++) {
          const k = keys[i];
          const valStr = JSON.stringify({ [k]: record[k] }, null, 2);

          if (currentLen + valStr.length > config.targetChunkSize && Object.keys(accumulatedObj).length > 0) {
            sequence++;
            const chunkText = JSON.stringify(accumulatedObj, null, 2);
            const loc = computeOffsetsAndLines(fullText, chunkText, searchOffset);
            searchOffset = loc.endOffset;

            const chunk = await createDocumentChunk({
              doc,
              file,
              text: chunkText,
              sequence,
              path: `${startKey}..${keys[i - 1]}`,
              startOffset: loc.startOffset,
              endOffset: loc.endOffset,
              startLine: loc.startLine,
              endLine: loc.endLine,
              config,
              configHash,
              strategyName: this.strategyName,
            });
            chunks.push(chunk);

            accumulatedObj = { [k]: record[k] };
            currentLen = valStr.length;
            startKey = k;
          } else {
            accumulatedObj[k] = record[k];
            currentLen += valStr.length;
          }
        }

        if (Object.keys(accumulatedObj).length > 0) {
          sequence++;
          const chunkText = JSON.stringify(accumulatedObj, null, 2);
          const loc = computeOffsetsAndLines(fullText, chunkText, searchOffset);

          const chunk = await createDocumentChunk({
            doc,
            file,
            text: chunkText,
            sequence,
            path: `${startKey}..${keys[keys.length - 1]}`,
            startOffset: loc.startOffset,
            endOffset: loc.endOffset,
            startLine: loc.startLine,
            endLine: loc.endLine,
            config,
            configHash,
            strategyName: this.strategyName,
          });
          chunks.push(chunk);
        }
      }
    }

    return chunks;
  }
}
