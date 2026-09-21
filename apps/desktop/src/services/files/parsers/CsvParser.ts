import { DocumentParser, NormalizedDocument } from '@nikit/types';
import { EncodingService } from '../EncodingService';
import { FILE_LIMITS } from '../config';

export class CsvParser implements DocumentParser {
  id = 'csv-parser';
  supportedExtensions = ['csv'];
  supportedMimeTypes = ['text/csv'];

  canParse(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'csv';
  }

  async parse(
    fileId: string,
    filename: string,
    content: string | ArrayBuffer
  ): Promise<NormalizedDocument> {
    const { text, encoding } = EncodingService.decode(content);
    const rawLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (rawLines.length === 0) {
      return {
        id: `doc-${fileId}`,
        fileId,
        title: filename,
        text: '[Empty CSV file]',
        metadata: {
          title: filename,
          sourceName: filename,
          sourceType: 'csv',
          characterCount: 0,
          lineCount: 0,
          wordCount: 0,
          parsedAt: new Date().toISOString(),
          detectedEncoding: encoding,
        },
        createdAt: new Date().toISOString(),
        schemaVersion: 'v1',
      };
    }

    // Process rows up to max limit
    const limitedLines = rawLines.slice(0, FILE_LIMITS.maxCsvRows);
    const formattedRows: string[] = [];

    for (const line of limitedLines) {
      const cols = line.split(',').slice(0, FILE_LIMITS.maxCsvColumns);
      formattedRows.push(cols.map((c) => c.trim()).join(' | '));
    }

    if (rawLines.length > FILE_LIMITS.maxCsvRows) {
      formattedRows.push(`... [Truncated ${rawLines.length - FILE_LIMITS.maxCsvRows} remaining rows]`);
    }

    const safeText = formattedRows.join('\n').slice(0, FILE_LIMITS.maxNormalizedCharacters);
    const words = safeText.split(/\s+/).filter(Boolean);

    return {
      id: `doc-${fileId}`,
      fileId,
      title: filename,
      text: safeText,
      metadata: {
        title: filename,
        sourceName: filename,
        sourceType: 'csv',
        characterCount: safeText.length,
        lineCount: limitedLines.length,
        wordCount: words.length,
        parsedAt: new Date().toISOString(),
        detectedEncoding: encoding,
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };
  }
}
