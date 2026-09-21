import { DocumentChunk, RetrievalFilters } from '@nikit/types';
import { ILexicalStore } from '../types';

export class LocalLexicalStore implements ILexicalStore {
  async search(
    query: string,
    chunks: DocumentChunk[],
    options?: { topK?: number; filters?: RetrievalFilters }
  ): Promise<Array<{ chunkId: string; score: number }>> {
    const topK = options?.topK ?? 10;
    const filters = options?.filters;
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const queryTerms = cleanQuery.split(/\s+/).filter((t) => t.length > 1);
    if (queryTerms.length === 0) return [];

    const candidates: Array<{ chunkId: string; score: number }> = [];

    for (const chunk of chunks) {
      // 1. Filter checks
      if (filters) {
        if (filters.projectId !== undefined && chunk.projectId !== filters.projectId) {
          continue;
        }
        if (filters.fileId !== undefined && chunk.fileId !== filters.fileId) {
          continue;
        }
        if (filters.documentId !== undefined && chunk.documentId !== filters.documentId) {
          continue;
        }
      }

      // 2. Lexical scoring across text, title, and headings
      const chunkTextLower = chunk.text.toLowerCase();
      const headingsLower = (chunk.metadata.headings || []).map((h) => h.toLowerCase()).join(' ');
      const titleLower = (chunk.metadata.title || '').toLowerCase();
      const combinedTarget = `${titleLower} ${headingsLower} ${chunkTextLower}`;

      let matchedTerms = 0;
      let totalOccurrences = 0;
      let headingMatches = 0;

      for (const term of queryTerms) {
        if (combinedTarget.includes(term)) {
          matchedTerms++;

          // Check heading matches for structural boost
          if (headingsLower.includes(term) || titleLower.includes(term)) {
            headingMatches++;
          }

          // Count occurrences in body
          const occurrences = chunkTextLower.split(term).length - 1;
          totalOccurrences += Math.min(occurrences, 5);
        }
      }

      if (matchedTerms > 0) {
        // Base term coverage ratio [0..1]
        const coverage = matchedTerms / queryTerms.length;
        // Frequency component
        const freqBonus = Math.min(totalOccurrences * 0.05, 0.25);
        // Heading boost
        const headingBonus = headingMatches > 0 ? 0.2 : 0;

        const rawScore = coverage * 0.7 + freqBonus + headingBonus;
        const normalizedScore = Math.min(1.0, Math.max(0.0, rawScore));

        candidates.push({
          chunkId: chunk.id,
          score: normalizedScore,
        });
      }
    }

    // 3. Sort descending by lexical score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, topK);
  }
}

export const localLexicalStore = new LocalLexicalStore();
