import {
  DocumentChunk,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
} from '@nikit/types';
import { IChunker } from '../types';
import { createDocumentChunk, computeOffsetsAndLines } from './chunkUtils';
import { HashService } from '../../files/HashService';

export class CsvChunker implements IChunker {
  id = 'csv-chunker';
  strategyName = 'header-retaining-tabular-chunker';

  async chunk(
    doc: NormalizedDocument,
    file: FileRecord,
    config: ChunkingConfig
  ): Promise<DocumentChunk[]> {
    const configHash = await HashService.calculateHash(JSON.stringify(config));
    const fullText = doc.text;
    const rawLines = fullText.split('\n').filter((l) => l.trim().length > 0);

    if (rawLines.length === 0) {
      return [];
    }

    const headerLine = rawLines[0];
    const dataLines = rawLines.slice(1);

    if (dataLines.length === 0) {
      const chunk = await createDocumentChunk({
        doc,
        file,
        text: headerLine,
        sequence: 1,
        section: 'CSV Header',
        config,
        configHash,
        strategyName: this.strategyName,
      });
      return [chunk];
    }

    const chunks: DocumentChunk[] = [];
    let sequence = 0;
    let currentRowIndex = 0;
    let searchOffset = 0;

    while (currentRowIndex < dataLines.length) {
      const rowGroup: string[] = [];
      let currentLength = headerLine.length + 1;
      const startRowNumber = currentRowIndex + 2; // 1-indexed (after header)

      while (
        currentRowIndex < dataLines.length &&
        (currentLength + dataLines[currentRowIndex].length <= config.targetChunkSize ||
          rowGroup.length === 0)
      ) {
        rowGroup.push(dataLines[currentRowIndex]);
        currentLength += dataLines[currentRowIndex].length + 1;
        currentRowIndex++;
      }

      const endRowNumber = startRowNumber + rowGroup.length - 1;
      // Invariant: Always inject header row into each chunk to preserve tabular column context
      const chunkText = [headerLine, ...rowGroup].join('\n');
      sequence++;

      const loc = computeOffsetsAndLines(fullText, chunkText, searchOffset);
      searchOffset = loc.endOffset;

      const chunk = await createDocumentChunk({
        doc,
        file,
        text: chunkText,
        sequence,
        section: `Rows ${startRowNumber}–${endRowNumber}`,
        startOffset: loc.startOffset,
        endOffset: loc.endOffset,
        startLine: startRowNumber,
        endLine: endRowNumber,
        config,
        configHash,
        strategyName: this.strategyName,
      });

      chunks.push(chunk);
    }

    return chunks;
  }
}
