import {
  StructuredContext,
  Project,
  Conversation,
  FileContextReference,
  RetrievedChunk,
  AttachmentReference,
  Memory,
} from '@nikit/types';
import { ContextBuilder, ContextAssembleParams } from './ContextBuilder';
import { memoryService, MemoryService } from '../memory';
import { projectStore } from '../projects';
import { conversationStore } from '../storage';
import { hybridRetriever, IHybridRetriever } from '../retrieval';

export interface ToolConfiguration {
  rag: boolean;
  memory: boolean;
}

export interface PrepareContextParams {
  conversationId?: string | null;
  projectId?: string | null;
  userPrompt?: string;
  workspaceModelId: string;
  workspaceModelName: string;
  fileReferences?: FileContextReference[];
  attachments?: AttachmentReference[];
  retrievedChunks?: RetrievedChunk[];
  toolConfig?: ToolConfiguration;
  modelContextLimit?: number | null;
  projectOverride?: Project | null;
  conversationOverride?: Conversation | null;
}

export class ContextService {
  private memorySvc: MemoryService;
  private retriever: IHybridRetriever;

  constructor(
    memorySvc: MemoryService = memoryService,
    retriever: IHybridRetriever = hybridRetriever
  ) {
    this.memorySvc = memorySvc;
    this.retriever = retriever;
  }

  /**
   * Prepares a complete, prioritized, budget-trimmed structured context.
   */
  async prepare(params: PrepareContextParams): Promise<StructuredContext> {
    const {
      conversationId,
      projectId,
      userPrompt,
      workspaceModelId,
      workspaceModelName,
      fileReferences,
      attachments,
      retrievedChunks,
      toolConfig,
      modelContextLimit,
      projectOverride,
      conversationOverride,
    } = params;

    // 1. Resolve Project (if any)
    let project: Project | null = projectOverride || null;
    if (!project && projectId) {
      project = (await projectStore.get(projectId)) || null;
    }

    // 2. Resolve Conversation (if any)
    let conversation: Conversation | null = conversationOverride || null;
    if (!conversation && conversationId) {
      conversation = (await conversationStore.get(conversationId)) || null;
    }

    // Effective Project ID from conversation or params
    const effectiveProjectId = projectId || conversation?.projectId || null;

    // 3. Resolve active memories with strict scoping (only if memory tool is enabled, default true)
    const isMemoryEnabled = toolConfig ? toolConfig.memory : true;
    let userMemories: Memory[] = [];
    let projectMemories: Memory[] = [];
    if (isMemoryEnabled) {
      const memoryResult = await this.memorySvc.getMemoriesForContext(effectiveProjectId);
      userMemories = memoryResult.userMemories;
      projectMemories = memoryResult.projectMemories;
    }

    // 4. Resolve RAG retrieval chunks (only if rag tool is enabled, default true)
    const isRagEnabled = toolConfig ? toolConfig.rag : true;
    let effectiveRetrievedChunks: RetrievedChunk[] = [];
    if (isRagEnabled) {
      if (retrievedChunks && retrievedChunks.length > 0) {
        effectiveRetrievedChunks = retrievedChunks;
      } else if (userPrompt && userPrompt.trim()) {
        try {
          const retrievalResult = await this.retriever.retrieve(userPrompt, {
            filters: { projectId: effectiveProjectId || undefined },
          });
          effectiveRetrievedChunks = (retrievalResult.results || []).map((r, idx) => ({
            chunkId: r.chunk.id,
            score: r.score,
            vectorScore: r.vectorScore,
            lexicalScore: r.lexicalScore,
            rank: idx + 1,
            chunk: r.chunk,
            source: 'hybrid' as const,
          }));
        } catch {
          effectiveRetrievedChunks = [];
        }
      }
    }

    // 5. Assemble context blocks
    const assembleParams: ContextAssembleParams = {
      project,
      conversation,
      workspaceModelId,
      workspaceModelName,
      userPrompt,
      userMemories,
      projectMemories,
      fileReferences,
      attachments,
      retrievedChunks: effectiveRetrievedChunks,
      contextLimit: modelContextLimit || null,
    };

    const structuredContext = ContextBuilder.assemble(assembleParams);

    // 5. Track usage for included memories
    const includedMemoryIds: string[] = [];
    const includedBlocks =
      structuredContext.budgetReport?.includedBlocks || structuredContext.blocks;

    for (const b of includedBlocks) {
      if (b.type === 'user_memory' || b.type === 'project_memory') {
        const ids = b.metadata?.memoryIds as string[] | undefined;
        if (ids && Array.isArray(ids)) {
          includedMemoryIds.push(...ids);
        }
      }
    }

    if (includedMemoryIds.length > 0) {
      try {
        await this.memorySvc.recordMemoryUsage(includedMemoryIds);
      } catch {
        // Ignore tracking error
      }
    }

    return structuredContext;
  }
}

export const contextService = new ContextService();
