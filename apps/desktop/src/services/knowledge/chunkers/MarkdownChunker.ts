import {
  DocumentChunk,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
} from '@nikit/types';
import { IChunker } from '../types';
import { createDocumentChunk, computeOffsetsAndLines } from './chunkUtils';
import { HashService } from '../../files/HashService';

interface SectionBlock {
  headingLevel: number;
  headingText: string;
  headingAncestry: string[];
  lines: string[];
}

export class MarkdownChunker implements IChunker {
  id = 'markdown-chunker';
  strategyName = 'hierarchical-markdown-heading-tree';

  async chunk(
    doc: NormalizedDocument,
    file: FileRecord,
    config: ChunkingConfig
  ): Promise<DocumentChunk[]> {
    const configHash = await HashService.calculateHash(JSON.stringify(config));
    const fullText = doc.text;
    const rawLines = fullText.split('\n');

    // 1. Segment document into sections with heading hierarchy tracking
    const sections: SectionBlock[] = [];
    const headingStack: { level: number; text: string }[] = [];

    let currentSection: SectionBlock = {
      headingLevel: 0,
      headingText: '',
      headingAncestry: [],
      lines: [],
    };

    for (const line of rawLines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // Finalize previous section if it has non-heading body content
        const hasBodyContent = currentSection.lines.some(
          (l) => !l.match(/^#{1,6}\s+/) && l.trim().length > 0
        );
        if (hasBodyContent) {
          sections.push(currentSection);
        }

        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();

        // Update heading stack (pop any headings of equal or deeper level)
        while (
          headingStack.length > 0 &&
          headingStack[headingStack.length - 1].level >= level
        ) {
          headingStack.pop();
        }
        headingStack.push({ level, text });

        const headingAncestry = headingStack.map((h) => h.text);

        currentSection = {
          headingLevel: level,
          headingText: text,
          headingAncestry,
          lines: [line],
        };
      } else {
        currentSection.lines.push(line);
      }
    }

    if (currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    // 2. Generate chunks from sections
    const chunks: DocumentChunk[] = [];
    let sequence = 0;
    let currentSearchOffset = 0;

    for (const section of sections) {
      const sectionText = section.lines.join('\n').trim();
      if (!sectionText) continue;

      // If section fits comfortably within maxChunkSize, keep as single chunk
      if (sectionText.length <= config.maxChunkSize) {
        sequence++;
        const loc = computeOffsetsAndLines(fullText, sectionText, currentSearchOffset);
        currentSearchOffset = loc.endOffset;

        const chunk = await createDocumentChunk({
          doc,
          file,
          text: sectionText,
          sequence,
          headings: section.headingAncestry,
          section: section.headingText || undefined,
          startOffset: loc.startOffset,
          endOffset: loc.endOffset,
          startLine: loc.startLine,
          endLine: loc.endLine,
          config,
          configHash,
          strategyName: this.strategyName,
        });
        chunks.push(chunk);
      } else {
        // Section is large: split into paragraph chunks while preserving heading ancestry
        const paragraphs = sectionText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        let accumulatedParagraphs: string[] = [];
        let accumulatedLength = 0;

        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];

          if (accumulatedLength + p.length > config.targetChunkSize && accumulatedParagraphs.length > 0) {
            sequence++;
            const chunkText = accumulatedParagraphs.join('\n\n');
            const loc = computeOffsetsAndLines(fullText, chunkText, currentSearchOffset);
            currentSearchOffset = loc.endOffset;

            const chunk = await createDocumentChunk({
              doc,
              file,
              text: chunkText,
              sequence,
              headings: section.headingAncestry,
              section: section.headingText || undefined,
              startOffset: loc.startOffset,
              endOffset: loc.endOffset,
              startLine: loc.startLine,
              endLine: loc.endLine,
              config,
              configHash,
              strategyName: this.strategyName,
            });
            chunks.push(chunk);

            // Handle overlap: keep last paragraph if configured
            if (config.overlapSize > 0 && accumulatedParagraphs.length > 1) {
              const lastP = accumulatedParagraphs[accumulatedParagraphs.length - 1];
              accumulatedParagraphs = [lastP, p];
              accumulatedLength = lastP.length + p.length;
            } else {
              accumulatedParagraphs = [p];
              accumulatedLength = p.length;
            }
          } else {
            accumulatedParagraphs.push(p);
            accumulatedLength += p.length;
          }
        }

        if (accumulatedParagraphs.length > 0) {
          sequence++;
          const chunkText = accumulatedParagraphs.join('\n\n');
          const loc = computeOffsetsAndLines(fullText, chunkText, currentSearchOffset);
          currentSearchOffset = loc.endOffset;

          const chunk = await createDocumentChunk({
            doc,
            file,
            text: chunkText,
            sequence,
            headings: section.headingAncestry,
            section: section.headingText || undefined,
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

    // Fallback if empty document
    if (chunks.length === 0 && fullText.trim().length > 0) {
      sequence++;
      const chunk = await createDocumentChunk({
        doc,
        file,
        text: fullText,
        sequence,
        headings: [],
        config,
        configHash,
        strategyName: this.strategyName,
      });
      chunks.push(chunk);
    }

    return chunks;
  }
}
