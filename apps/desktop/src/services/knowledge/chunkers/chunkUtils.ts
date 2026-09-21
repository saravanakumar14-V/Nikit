import {
  DocumentChunk,
  ChunkMetadata,
  ChunkLocation,
  NormalizedDocument,
  FileRecord,
  ChunkingConfig,
} from '@nikit/types';
import { HashService } from '../../files/HashService';

export interface ChunkBuildParams {
  doc: NormalizedDocument;
  file: FileRecord;
  text: string;
  sequence: number;
  headings?: string[];
  section?: string;
  path?: string;
  language?: string;
  startOffset?: number;
  endOffset?: number;
  startLine?: number;
  endLine?: number;
  config: ChunkingConfig;
  configHash: string;
  strategyName: string;
}

/**
 * Calculates start/end character offsets and line numbers for a chunk relative to full source document text.
 */
export function computeOffsetsAndLines(
  fullText: string,
  chunkText: string,
  searchFromOffset = 0
): { startOffset: number; endOffset: number; startLine: number; endLine: number } {
  let startOffset = fullText.indexOf(chunkText, searchFromOffset);
  if (startOffset === -1) {
    startOffset = searchFromOffset;
  }
  const endOffset = startOffset + chunkText.length;

  const prefix = fullText.slice(0, startOffset);
  const chunkPortion = fullText.slice(startOffset, endOffset);

  const startLine = (prefix.match(/\n/g) || []).length + 1;
  const lineCountInside = (chunkPortion.match(/\n/g) || []).length;
  const endLine = startLine + lineCountInside;

  return {
    startOffset,
    endOffset,
    startLine,
    endLine,
  };
}

/**
 * Generates a stable deterministic chunk ID based on documentId, contentHash, and section identity.
 * Avoids sequence-shift invalidation when neighboring content changes.
 */
export function generateDeterministicChunkId(
  documentId: string,
  contentHash: string,
  sectionOrPath?: string
): string {
  const cleanDoc = documentId.replace(/^doc-/, '');
  const sectionPart = sectionOrPath
    ? '-' + sectionOrPath.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 16)
    : '';
  const hashPart = contentHash.slice(0, 12);
  return `chunk-${cleanDoc}-${hashPart}${sectionPart}`;
}

/**
 * Splits text into natural sentence chunks using punctuation boundaries.
 */
export function splitIntoSentences(text: string): string[] {
  // Regex splits on sentence endings followed by whitespace or newline, preserving punctuation
  const matches = text.match(/[^.!?\n]+[.!?]+(?:\s+|\n+|$)|[^.!?\n]+(?:\n+|$)/g);
  if (!matches || matches.length === 0) {
    return [text];
  }
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Splits text into paragraph blocks using double newlines.
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Standardized factory to create a fully typed DocumentChunk.
 */
export async function createDocumentChunk(params: ChunkBuildParams): Promise<DocumentChunk> {
  const contentHash = await HashService.calculateHash(params.text);

  const { startOffset, endOffset, startLine, endLine } =
    params.startOffset !== undefined && params.startLine !== undefined
      ? {
          startOffset: params.startOffset,
          endOffset: params.endOffset ?? params.startOffset + params.text.length,
          startLine: params.startLine,
          endLine: params.endLine ?? params.startLine,
        }
      : computeOffsetsAndLines(params.doc.text, params.text);

  const chunkId = generateDeterministicChunkId(
    params.doc.id,
    contentHash,
    params.section || (params.headings && params.headings.length > 0 ? params.headings[params.headings.length - 1] : undefined) || params.path
  );

  const metadata: ChunkMetadata = {
    title: params.doc.title,
    headings: params.headings || [],
    section: params.section,
    path: params.path,
    startCharacter: startOffset,
    endCharacter: endOffset,
    startLine,
    endLine,
    language: params.language,
    sourceName: params.file.name,
    sourceExtension: params.file.extension,
    approximateTokens: null, // Explicitly null in Phase 5B (no fake token claims)
    chunkerVersion: params.config.chunkerVersion,
    configHash: params.configHash,
    chunkingStrategy: params.strategyName,
  };

  const location: ChunkLocation = {
    documentId: params.doc.id,
    startOffset,
    endOffset,
    startLine,
    endLine,
  };

  return {
    id: chunkId,
    documentId: params.doc.id,
    fileId: params.file.id,
    projectId: params.file.projectId || null,
    text: params.text,
    metadata,
    location,
    contentHash,
    sequence: params.sequence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  };
}
