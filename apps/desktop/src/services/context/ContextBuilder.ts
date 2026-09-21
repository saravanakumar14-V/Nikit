import {
  Project,
  Conversation,
  Message,
  StructuredContext,
  ContextBlock,
  ContextSnapshot,
  FileContextReference,
  RetrievedChunk,
  Memory,
  AttachmentReference,
} from '@nikit/types';
import { partsToPlainText } from '../messageParser';
import { ContextBudgetManager } from './ContextBudgetManager';

export interface ContextAssembleParams {
  project?: Project | null;
  conversation?: Conversation | null;
  workspaceModelId: string;
  workspaceModelName: string;
  userPrompt?: string;
  userMemories?: Memory[];
  projectMemories?: Memory[];
  fileReferences?: FileContextReference[];
  attachments?: AttachmentReference[];
  retrievedChunks?: RetrievedChunk[];
  contextLimit?: number | null;
}

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are Nikit, an advanced, highly capable quiet-intelligence AI assistant.
Focus on clear, rigorous technical reasoning, modular code architecture, and high precision.`;

export class ContextBuilder {
  /**
   * Assembles a structured, prioritized, and typed context representation.
   * Keeps context blocks distinct, transparent, and auditable.
   */
  static assemble(params: ContextAssembleParams): StructuredContext {
    const {
      project,
      conversation,
      workspaceModelId,
      workspaceModelName,
      userPrompt,
      userMemories = [],
      projectMemories = [],
      retrievedChunks = [],
      contextLimit = null,
    } = params;

    const rawBlocks: ContextBlock[] = [];

    // 1. System Block (Priority 1 - Required)
    const sysContent = DEFAULT_SYSTEM_INSTRUCTIONS;
    rawBlocks.push({
      id: 'block-system',
      type: 'system',
      title: 'Global System Instructions',
      content: sysContent,
      priority: 1,
      required: true,
      enabled: true,
      isAvailable: true,
      tokenEstimate: ContextBudgetManager.estimateTokens(sysContent),
    });

    // 2. Current User Turn (Priority 2 - Required when present)
    if (userPrompt && userPrompt.trim()) {
      const uText = userPrompt.trim();
      rawBlocks.push({
        id: 'block-current-user',
        type: 'current_user',
        title: 'Current User Turn',
        content: `User: ${uText}`,
        priority: 2,
        required: true,
        enabled: true,
        isAvailable: true,
        tokenEstimate: ContextBudgetManager.estimateTokens(uText),
      });
    }

    // 2.5 User Attached Context Block (Priority 2 - High priority user-provided materials)
    const attachments = params.attachments || [];
    if (attachments.length > 0) {
      const formattedAttachments = attachments
        .map((att, i) => {
          const typeLabel = att.type ? att.type.toUpperCase() : 'FILE';
          const header = `--- Attachment #${i + 1}: ${att.name} [${typeLabel}] ---`;
          return `${header}\n${att.content || '(Empty content or binary metadata)'}`;
        })
        .join('\n\n');

      rawBlocks.push({
        id: 'block-user-attachments',
        type: 'files',
        title: 'Attached User Context',
        content: formattedAttachments,
        priority: 2,
        required: true,
        enabled: true,
        isAvailable: true,
        metadata: {
          attachmentCount: attachments.length,
          attachments: attachments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            sizeBytes: a.sizeBytes,
          })),
        },
        tokenEstimate: ContextBudgetManager.estimateTokens(formattedAttachments),
      });
    }

    // 3. Project Instructions Block (Priority 3 - Behavioral instructions)
    if (project && project.instructions && project.instructions.trim()) {
      const pContent = project.instructions.trim();
      rawBlocks.push({
        id: 'block-project-instructions',
        type: 'project_instructions',
        title: `Project Instructions: ${project.name}`,
        content: pContent,
        priority: 3,
        required: true,
        enabled: true,
        isAvailable: true,
        metadata: {
          projectId: project.id,
          projectName: project.name,
        },
        tokenEstimate: ContextBudgetManager.estimateTokens(pContent),
      });
    }

    // 4. Project Memory Block (Priority 4 - Scoped persistent knowledge/facts)
    if (projectMemories.length > 0) {
      const pmContent = projectMemories
        .map((m, i) => `${i + 1}. ${m.content}`)
        .join('\n');

      rawBlocks.push({
        id: 'block-project-memory',
        type: 'project_memory',
        title: `Project Memory: ${project?.name || 'Active Project'}`,
        content: pmContent,
        priority: 4,
        required: false,
        enabled: true,
        isAvailable: true,
        metadata: {
          memoryCount: projectMemories.length,
          memoryIds: projectMemories.map((m) => m.id),
        },
        tokenEstimate: ContextBudgetManager.estimateTokens(pmContent),
      });
    } else {
      rawBlocks.push({
        id: 'block-project-memory',
        type: 'project_memory',
        title: 'Project Memory',
        content: '',
        priority: 4,
        required: false,
        enabled: true,
        isAvailable: false,
        tokenEstimate: 0,
      });
    }

    // 5. User Memory Block (Priority 5 - Global user preferences/facts)
    if (userMemories.length > 0) {
      const umContent = userMemories
        .map((m, i) => `${i + 1}. ${m.content}`)
        .join('\n');

      rawBlocks.push({
        id: 'block-user-memory',
        type: 'user_memory',
        title: 'User Preferences & Memory',
        content: umContent,
        priority: 5,
        required: false,
        enabled: true,
        isAvailable: true,
        metadata: {
          memoryCount: userMemories.length,
          memoryIds: userMemories.map((m) => m.id),
        },
        tokenEstimate: ContextBudgetManager.estimateTokens(umContent),
      });
    } else {
      rawBlocks.push({
        id: 'block-user-memory',
        type: 'user_memory',
        title: 'User Preferences & Memory',
        content: '',
        priority: 5,
        required: false,
        enabled: true,
        isAvailable: false,
        tokenEstimate: 0,
      });
    }

    // 6. Retrieved Knowledge Context (Priority 6 - Dynamically searched chunks)
    if (retrievedChunks.length > 0) {
      const formattedKnowledge = retrievedChunks
        .map((r, i) => {
          const heading =
            r.chunk.metadata.headings && r.chunk.metadata.headings.length > 0
              ? r.chunk.metadata.headings.join(' › ')
              : r.chunk.metadata.section || 'Section';
          const loc = r.chunk.location?.startLine
            ? ` (Lines ${r.chunk.location.startLine}–${r.chunk.location.endLine})`
            : '';
          return `[Retrieved Chunk #${i + 1}] ${r.chunk.metadata.sourceName} › ${heading}${loc}\nRelevance: ${r.score} (${r.source})\n${r.chunk.text}`;
        })
        .join('\n\n---\n\n');

      rawBlocks.push({
        id: 'block-retrieved-knowledge',
        type: 'retrieved_knowledge',
        title: 'Retrieved Knowledge Context',
        content: formattedKnowledge,
        priority: 6,
        required: false,
        enabled: true,
        isAvailable: true,
        fileReferences: params.fileReferences || [],
        tokenEstimate: ContextBudgetManager.estimateTokens(formattedKnowledge),
      });
    } else if (params.fileReferences && params.fileReferences.length > 0) {
      const readyFiles = params.fileReferences.filter((f) => f.status === 'ready');
      rawBlocks.push({
        id: 'block-retrieved-knowledge',
        type: 'retrieved_knowledge',
        title: 'Workspace File References',
        content: `${readyFiles.length} document reference(s) available in workspace.`,
        priority: 6,
        required: false,
        enabled: true,
        fileReferences: readyFiles,
        isAvailable: readyFiles.length > 0,
        tokenEstimate: 10,
      });
    } else {
      rawBlocks.push({
        id: 'block-retrieved-knowledge',
        type: 'retrieved_knowledge',
        title: 'Retrieved Knowledge Context',
        content: '',
        priority: 6,
        required: false,
        enabled: true,
        fileReferences: [],
        isAvailable: false,
        tokenEstimate: 0,
      });
    }

    // 7. Conversation History Block (Priority 7 - Previous chat turns)
    if (conversation && conversation.messages && conversation.messages.length > 0) {
      const formattedHistory = conversation.messages
        .map((m: Message) => {
          const roleLabel = m.role === 'user' ? 'User' : 'Assistant';
          const content = partsToPlainText(m.parts);
          return `${roleLabel}: ${content}`;
        })
        .join('\n\n');

      rawBlocks.push({
        id: 'block-conversation-history',
        type: 'conversation_history',
        title: 'Conversation History',
        content: formattedHistory,
        priority: 7,
        required: false,
        enabled: true,
        isAvailable: true,
        metadata: {
          conversationId: conversation.id,
          messageCount: conversation.messages.length,
        },
        tokenEstimate: ContextBudgetManager.estimateTokens(formattedHistory),
      });
    }

    // 8. Tools Block (Priority 8)
    rawBlocks.push({
      id: 'block-tools',
      type: 'tools',
      title: 'Execution Tool Manifest',
      content: '',
      priority: 8,
      required: false,
      enabled: false,
      isAvailable: false,
      tokenEstimate: 0,
    });

    // Run context budgeting and trimming
    const budgetReport = ContextBudgetManager.allocate(rawBlocks, contextLimit);

    // Model Precedence: Conversation Override > Project Default > Workspace Default
    const effectiveModelId =
      conversation?.modelId || project?.defaultModelId || workspaceModelId;
    const effectiveModelName =
      conversation?.modelName || project?.defaultModelName || workspaceModelName;

    const snapshot: ContextSnapshot = {
      modelTokens: null,
      systemTokens: rawBlocks.find((b) => b.type === 'system')?.tokenEstimate || null,
      projectTokens:
        rawBlocks.find((b) => b.type === 'project_instructions')?.tokenEstimate || null,
      memoryTokens:
        (rawBlocks.find((b) => b.type === 'user_memory')?.tokenEstimate || 0) +
        (rawBlocks.find((b) => b.type === 'project_memory')?.tokenEstimate || 0) || null,
      conversationTokens:
        rawBlocks.find((b) => b.type === 'conversation_history')?.tokenEstimate || null,
      fileTokens:
        ((rawBlocks.find((b) => b.type === 'retrieved_knowledge')?.tokenEstimate || 0) +
        (rawBlocks.find((b) => b.id === 'block-user-attachments')?.tokenEstimate || 0)) || null,
      toolTokens: null,
      userTokens:
        rawBlocks.find((b) => b.type === 'current_user')?.tokenEstimate || null,
      totalTokens: budgetReport.totalTokensEstimated,
      contextLimit: budgetReport.contextLimit,
      remainingTokens: budgetReport.remainingTokens,
      isCalculated: budgetReport.budgetApplied,
    };

    return {
      blocks: rawBlocks,
      effectiveModelId,
      effectiveModelName,
      projectId: project?.id || null,
      conversationId: conversation?.id || null,
      snapshot,
      budgetReport,
    };
  }

  /**
   * Formats structured context blocks into a provider-ready prompt string.
   * Only active, available, and budget-included blocks are serialized.
   */
  static formatForProvider(context: StructuredContext): string {
    const includedIds = new Set(
      (context.budgetReport?.includedBlocks || context.blocks).map((b) => b.id || b.title)
    );

    return context.blocks
      .filter((b) => b.isAvailable && b.content.trim().length > 0 && includedIds.has(b.id || b.title))
      .map((b) => `[${b.title}]\n${b.content}`)
      .join('\n\n');
  }
}
