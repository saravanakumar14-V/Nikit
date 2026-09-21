import {
  DocumentChunk,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
} from '@nikit/types';
import { IChunker } from '../types';
import { createDocumentChunk, computeOffsetsAndLines } from './chunkUtils';
import { HashService } from '../../files/HashService';

export class CodeChunker implements IChunker {
  id = 'code-chunker';
  strategyName = 'line-preserving-code-block-chunker';

  async chunk(
    doc: NormalizedDocument,
    file: FileRecord,
    config: ChunkingConfig
  ): Promise<DocumentChunk[]> {
    const configHash = await HashService.calculateHash(JSON.stringify(config));
    const fullText = doc.text;
    const rawLines = fullText.split('\n');

    if (rawLines.length === 0 || fullText.trim().length === 0) {
      return [];
    }

    const chunks: DocumentChunk[] = [];
    let sequence = 0;
    let currentLineIndex = 0;
    let searchOffset = 0;

    while (currentLineIndex < rawLines.length) {
      const chunkLines: string[] = [];
      let currentLength = 0;
      const startLineNumber = currentLineIndex + 1;

      while (
        currentLineIndex < rawLines.length &&
        (currentLength + rawLines[currentLineIndex].length <= config.targetChunkSize ||
          chunkLines.length === 0)
      ) {
        chunkLines.push(rawLines[currentLineIndex]);
        currentLength += rawLines[currentLineIndex].length + 1;
        currentLineIndex++;
      }

      const chunkText = chunkLines.join('\n');
      if (chunkText.length > 0) {
        sequence++;
        const loc = computeOffsetsAndLines(fullText, chunkText, searchOffset);
        searchOffset = loc.endOffset;

        const chunk = await createDocumentChunk({
          doc,
          file,
          text: chunkText,
          sequence,
          language: file.extension,
          startOffset: loc.startOffset,
          endOffset: loc.endOffset,
          startLine: startLineNumber,
          endLine: startLineNumber + chunkLines.length - 1,
          config,
          configHash,
          strategyName: this.strategyName,
        });

        chunks.push(chunk);
      }
    }

    return chunks;
  }
}
