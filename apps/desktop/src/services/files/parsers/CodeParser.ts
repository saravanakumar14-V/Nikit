import { DocumentParser, NormalizedDocument } from '@nikit/types';
import { EncodingService } from '../EncodingService';
import { FILE_LIMITS } from '../config';

const CODE_EXTENSIONS = [
  'py',
  'ts',
  'tsx',
  'js',
  'jsx',
  'rs',
  'go',
  'cpp',
  'c',
  'h',
  'hpp',
  'java',
  'sh',
  'toml',
  'yaml',
  'yml',
  'css',
  'html',
  'sql',
];

export class CodeParser implements DocumentParser {
  id = 'code-parser';
  supportedExtensions = CODE_EXTENSIONS;
  supportedMimeTypes = ['text/plain', 'application/javascript', 'application/x-typescript'];

  canParse(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return CODE_EXTENSIONS.includes(ext);
  }

  async parse(
    fileId: string,
    filename: string,
    content: string | ArrayBuffer
  ): Promise<NormalizedDocument> {
    const { text, encoding } = EncodingService.decode(content);

    // CRITICAL: Preserve source code EXACTLY as read without reformatting or normalization
    const safeText = text.slice(0, FILE_LIMITS.maxNormalizedCharacters);
    const lines = safeText.split('\n');
    const words = safeText.split(/\s+/).filter(Boolean);

    return {
      id: `doc-${fileId}`,
      fileId,
      title: filename,
      text: safeText, // Exact raw source code preserved
      metadata: {
        title: filename,
        sourceName: filename,
        sourceType: 'code',
        characterCount: safeText.length,
        lineCount: lines.length,
        wordCount: words.length,
        parsedAt: new Date().toISOString(),
        detectedEncoding: encoding,
        checksum: undefined,
      },
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };
  }
}
