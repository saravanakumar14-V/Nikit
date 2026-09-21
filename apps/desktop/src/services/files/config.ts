/**
 * Centralized Configuration Limits for File Processing & Document Ingestion
 * Isolates size limits from individual parser components.
 */
export const FILE_LIMITS = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB limit for initial phase
  maxPreviewBytes: 50 * 1024, // 50 KB preview window to maintain snappy UI rendering
  maxNormalizedCharacters: 500_000, // Safe memory limit for extracted text
  maxCsvRows: 5_000,
  maxCsvColumns: 100,
  maxJsonSizeBytes: 5 * 1024 * 1024, // 5 MB max for JSON parsing
} as const;

export const SUPPORTED_EXTENSIONS = [
  // Plain text & documentation
  'txt',
  'md',
  'markdown',
  // Structured data
  'json',
  'csv',
  // Code & configuration
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
] as const;
