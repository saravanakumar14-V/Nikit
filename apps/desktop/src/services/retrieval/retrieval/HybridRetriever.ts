import {
  DocumentChunk,
  RetrievalConfig,
  RetrievalFilters,
  RetrievalResult,
} from '@nikit/types';
import { IHybridRetriever, IEmbeddingProvider, IVectorStore, ILexicalStore } from '../types';
import { DEFAULT_RETRIEVAL_CONFIG } from '../config';
import { localEmbeddingProvider } from '../embedding/LocalEmbeddingProvider';
import { localVectorStore } from '../vector/LocalVectorStore';
import { localLexicalStore } from '../lexical/LocalLexicalStore';
import { embeddingService } from '../embedding/EmbeddingService';
import { chunkStore } from '../../knowledge/LocalStorageChunkStore';
import { Ranking } from './Ranking';

export class HybridRetriever implements IHybridRetriever {
  private provider: IEmbeddingProvider;
  private vectorStore: IVectorStore;
  private lexicalStore: ILexicalStore;

  constructor(
    provider: IEmbeddingProvider = localEmbeddingProvider,
    vectorStore: IVectorStore = localVectorStore,
    lexicalStore: ILexicalStore = localLexicalStore
  ) {
    this.provider = provider;
    this.vectorStore = vectorStore;
    this.lexicalStore = lexicalStore;
  }

  async retrieve(
    query: string,
    options?: {
      config?: Partial<RetrievalConfig>;
      filters?: RetrievalFilters;
    }
  ): Promise<RetrievalResult> {
    const config: RetrievalConfig = {
      ...DEFAULT_RETRIEVAL_CONFIG,
      ...(options?.config || {}),
    };
    const filters = options?.filters;
    const startTime = performance.now();

    // 1. Gather all candidate chunks from knowledge store
    let allChunks: DocumentChunk[] = [];
    if (filters?.projectId) {
      allChunks = await chunkStore.listByProject(filters.projectId);
    } else {
      // List all document chunks across store
      const allIndexedIds = await (chunkStore as unknown as { getIndex?: () => Promise<string[]> }).getIndex?.() || [];
      for (const id of allIndexedIds) {
        const c = await chunkStore.get(id);
        if (c) allChunks.push(c);
      }
    }

    if (allChunks.length === 0) {
      return {
        query,
        results: [],
        totalCandidates: 0,
        durationMs: Math.round(performance.now() - startTime),
        config,
        filters,
        modelId: this.provider.model.id,
        executedAt: new Date().toISOString(),
      };
    }

    // 2. Ensure candidate chunks are embedded and indexed
    await embeddingService.ensureChunksEmbedded(allChunks);

    // 3. Execute Vector and Lexical searches in parallel
    const queryVector = await this.provider.embedQuery(query);

    const [vectorCandidates, lexicalCandidates] = await Promise.all([
      this.vectorStore.search(queryVector, {
        topK: config.vectorTopK,
        filters,
      }),
      this.lexicalStore.search(query, allChunks, {
        topK: config.lexicalTopK,
        filters,
      }),
    ]);

    // 4. Map chunks for provenance lookup
    const chunkMap = new Map<string, DocumentChunk>();
    for (const chunk of allChunks) {
      chunkMap.set(chunk.id, chunk);
    }

    // 5. Rank and fuse candidates
    const rankedResults = Ranking.fuseAndRank(
      vectorCandidates,
      lexicalCandidates,
      chunkMap,
      config
    );

    const durationMs = Math.round(performance.now() - startTime);

    return {
      query,
      results: rankedResults,
      totalCandidates: allChunks.length,
      durationMs,
      config,
      filters,
      modelId: this.provider.model.id,
      executedAt: new Date().toISOString(),
    };
  }
}

export const hybridRetriever = new HybridRetriever();
