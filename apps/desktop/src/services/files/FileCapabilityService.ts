import { FileType } from '@nikit/types';
import { SUPPORTED_EXTENSIONS } from './config';

export class FileCapabilityService {
  private static readonly TEXT_EXTENSIONS = new Set(['txt']);
  private static readonly MARKDOWN_EXTENSIONS = new Set(['md', 'markdown']);
  private static readonly JSON_EXTENSIONS = new Set(['json']);
  private static readonly CSV_EXTENSIONS = new Set(['csv']);
  private static readonly CODE_EXTENSIONS = new Set([
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
  ]);

  static getCleanExtension(filename: string): string {
    const parts = filename.split('.');
    if (parts.length <= 1) return '';
    return parts[parts.length - 1].toLowerCase().trim();
  }

  static getFileType(filename: string): FileType {
    const ext = this.getCleanExtension(filename);
    if (this.TEXT_EXTENSIONS.has(ext)) return 'text';
    if (this.MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
    if (this.JSON_EXTENSIONS.has(ext)) return 'json';
    if (this.CSV_EXTENSIONS.has(ext)) return 'csv';
    if (this.CODE_EXTENSIONS.has(ext)) return 'code';
    if (ext === 'pdf') return 'pdf';
    return 'unsupported';
  }

  static isSupported(filename: string): boolean {
    const ext = this.getCleanExtension(filename);
    return SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number]);
  }

  static canRead(filename: string): boolean {
    return this.isSupported(filename);
  }

  static canPreview(filename: string): boolean {
    const type = this.getFileType(filename);
    return ['text', 'markdown', 'json', 'csv', 'code'].includes(type);
  }

  static canNormalize(filename: string): boolean {
    return this.isSupported(filename);
  }

  // Phase 5B / 5C boundaries: Explicitly false/unavailable in Phase 5A
  static canChunk(_filename: string): boolean {
    return false;
  }

  static canEmbed(_filename: string): boolean {
    return false;
  }

  static canRetrieve(_filename: string): boolean {
    return false;
  }
}
