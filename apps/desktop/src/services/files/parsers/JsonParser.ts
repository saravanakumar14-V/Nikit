import { DocumentParser, NormalizedDocument } from '@nikit/types';
import { EncodingService } from '../EncodingService';
import { FILE_LIMITS } from '../config';

export class JsonParser implements DocumentParser {
  id = 'json-parser';
  supportedExtensions = ['json'];
  supportedMimeTypes = ['application/json'];

  canParse(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'json';
  }

  async parse(
    fileId: string,
    filename: string,
    content: string | ArrayBuffer
  ): Promise<NormalizedDocument> {
    const { text, encoding } = EncodingService.decode(content);

    if (text.length > FILE_LIMITS.maxJsonSizeBytes) {
      throw new Error(`JSON file size exceeds maximum safe limit (${FILE_LIMITS.maxJsonSizeBytes / (1024 * 1024)} MB).`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`JSON parsing error: Malformed syntax (${msg})`);
    }

    const formatted = JSON.stringify(parsed, null, 2);
    const safeText = formatted.slice(0, FILE_LIMITS.maxNormalizedCharacters);
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
        sourceType: 'json',
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
