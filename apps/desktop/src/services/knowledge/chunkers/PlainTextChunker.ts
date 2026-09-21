import {
  DocumentChunk,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
} from '@nikit/types';
import { IChunker } from '../types';
import {
  createDocumentChunk,
  computeOffsetsAndLines,
  splitIntoParagraphs,
  splitIntoSentences,
} from './chunkUtils';
import { HashService } from '../../files/HashService';

export class PlainTextChunker implements IChunker {
  id = 'plain-text-chunker';
  strategyName = 'hierarchical-paragraph-sentence-chunker';

  async chunk(
    doc: NormalizedDocument,
    file: FileRecord,
    config: ChunkingConfig
  ): Promise<DocumentChunk[]> {
    const configHash = await HashService.calculateHash(JSON.stringify(config));
    const fullText = doc.text;

    if (!fullText || fullText.trim().length === 0) {
      return [];
    }

    if (fullText.length <= config.targetChunkSize) {
      const chunk = await createDocumentChunk({
        doc,
        file,
        text: fullText,
        sequence: 1,
        config,
        configHash,
        strategyName: this.strategyName,
      });
      return [chunk];
    }

    const paragraphs = splitIntoParagraphs(fullText);
    const chunks: DocumentChunk[] = [];
    let sequence = 0;
    let accumulatedText = '';
    let currentSearchOffset = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];

      // If single paragraph itself is larger than targetChunkSize, split paragraph by sentences
      if (p.length > config.targetChunkSize) {
        // Flush any accumulated text first
        if (accumulatedText.trim().length > 0) {
          sequence++;
          const loc = computeOffsetsAndLines(fullText, accumulatedText.trim(), currentSearchOffset);
          currentSearchOffset = loc.endOffset;

          const chunk = await createDocumentChunk({
            doc,
            file,
            text: accumulatedText.trim(),
            sequence,
            startOffset: loc.startOffset,
            endOffset: loc.endOffset,
            startLine: loc.startLine,
            endLine: loc.endLine,
            config,
            configHash,
            strategyName: this.strategyName,
          });
          chunks.push(chunk);
          accumulatedText = '';
        }

        const sentences = splitIntoSentences(p);
        let accumulatedSentences = '';

        for (const sentence of sentences) {
          if (
            accumulatedSentences.length + sentence.length > config.targetChunkSize &&
            accumulatedSentences.trim().length > 0
          ) {
            sequence++;
            const loc = computeOffsetsAndLines(fullText, accumulatedSentences.trim(), currentSearchOffset);
            currentSearchOffset = loc.endOffset;

            const chunk = await createDocumentChunk({
              doc,
              file,
              text: accumulatedSentences.trim(),
              sequence,
              startOffset: loc.startOffset,
              endOffset: loc.endOffset,
              startLine: loc.startLine,
              endLine: loc.endLine,
              config,
              configHash,
              strategyName: this.strategyName,
            });
            chunks.push(chunk);

            accumulatedSentences = sentence + ' ';
          } else {
            accumulatedSentences += sentence + ' ';
          }
        }

        if (accumulatedSentences.trim().length > 0) {
          sequence++;
          const loc = computeOffsetsAndLines(fullText, accumulatedSentences.trim(), currentSearchOffset);
          currentSearchOffset = loc.endOffset;

          const chunk = await createDocumentChunk({
            doc,
            file,
            text: accumulatedSentences.trim(),
            sequence,
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
        // Normal paragraph accumulation
        if (
          accumulatedText.length + p.length > config.targetChunkSize &&
          accumulatedText.trim().length > 0
        ) {
          sequence++;
          const loc = computeOffsetsAndLines(fullText, accumulatedText.trim(), currentSearchOffset);
          currentSearchOffset = loc.endOffset;

          const chunk = await createDocumentChunk({
            doc,
            file,
            text: accumulatedText.trim(),
            sequence,
            startOffset: loc.startOffset,
            endOffset: loc.endOffset,
            startLine: loc.startLine,
            endLine: loc.endLine,
            config,
            configHash,
            strategyName: this.strategyName,
          });
          chunks.push(chunk);

          accumulatedText = p + '\n\n';
        } else {
          accumulatedText += p + '\n\n';
        }
      }
    }

    if (accumulatedText.trim().length > 0) {
      sequence++;
      const loc = computeOffsetsAndLines(fullText, accumulatedText.trim(), currentSearchOffset);

      const chunk = await createDocumentChunk({
        doc,
        file,
        text: accumulatedText.trim(),
        sequence,
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

    return chunks;
  }
}
