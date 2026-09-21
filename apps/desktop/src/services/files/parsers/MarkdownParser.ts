import { DocumentParser, NormalizedDocument } from '@nikit/types';
import { EncodingService } from '../EncodingService';
import { FILE_LIMITS } from '../config';

export class MarkdownParser implements DocumentParser {
  id = 'markdown-parser';
  supportedExtensions = ['md', 'markdown'];
  supportedMimeTypes = ['text/markdown'];

  canParse(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'markdown';
  }

  async parse(
    fileId: string,
    filename: string,
    content: string | ArrayBuffer
  ): Promise<NormalizedDocument> {
    const { text, encoding } = EncodingService.decode(content);
    const safeText = text.slice(0, FILE_LIMITS.maxNormalizedCharacters);

    // Extract title from first markdown heading # Title if present
    const firstHeadingMatch = safeText.match(/^#\s+(.+)$/m);
    const title = firstHeadingMatch ? firstHeadingMatch[1].trim() : filename;

    const lines = safeText.split('\n');
    const words = safeText.split(/\s+/).filter(Boolean);

    return {
      id: `doc-${fileId}`,
      fileId,
      title,
      text: safeText,
      metadata: {
        title,
        sourceName: filename,
        sourceType: 'markdown',
        characterCount: safeText.length,
        lineCount: lines.length,
        wordCount: words.length,
        parsedAt: new Date().toISOString(),
        detectedEncoding: encoding,
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };
  }
}
