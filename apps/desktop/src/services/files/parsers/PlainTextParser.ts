import { DocumentParser, NormalizedDocument } from '@nikit/types';
import { EncodingService } from '../EncodingService';
import { FILE_LIMITS } from '../config';

export class PlainTextParser implements DocumentParser {
  id = 'plain-text-parser';
  supportedExtensions = ['txt'];
  supportedMimeTypes = ['text/plain'];

  canParse(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'txt';
  }

  async parse(
    fileId: string,
    filename: string,
    content: string | ArrayBuffer
  ): Promise<NormalizedDocument> {
    const { text, encoding } = EncodingService.decode(content);

    // Limit extracted characters to safe limit
    const safeText = text.slice(0, FILE_LIMITS.maxNormalizedCharacters);
    const lines = safeText.split('\n');
    const words = safeText.split(/\s+/).filter(Boolean);

    return {
      id: `doc-${fileId}`,
      fileId,
      title: filename,
      text: safeText,
      metadata: {
        title: filename,
        sourceName: filename,
        sourceType: 'text',
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
