import {
  GenerationConfig,
  LabContextConfig,
  RunRecord,
  RunMetrics,
  GenerationEvent,
  Message,
  StructuredContext,
  ContextBlock,
  AIModel,
} from '@nikit/types';
import { ILabStore } from './LabStore';
import { localLabStore } from './LocalStorageLabStore';
import { modelService, ModelService } from '../models';
import { ContextBuilder } from '../context/ContextBuilder';
import { ContextBudgetManager } from '../context/ContextBudgetManager';
import { memoryService } from '../memory';
import { projectStore } from '../projects';
import { conversationStore } from '../storage';
import {
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_LAB_CONTEXT_CONFIG,
  validateGenerationConfig,
} from './types';

export interface PlaygroundRunParams {
  modelId: string;
  systemPrompt: string;
  developerPrompt?: string;
  userPrompt: string;
  generationConfig?: Partial<GenerationConfig>;
  contextConfig?: Partial<LabContextConfig>;
  captureFullContext?: boolean;
  experimentId?: string | null;
  runName?: string;
  abortSignal?: AbortSignal;
  onEvent?: (event: GenerationEvent) => void;
}

export interface ComparisonRunParams {
  modelIds: string[];
  systemPrompt: string;
  developerPrompt?: string;
  userPrompt: string;
  generationConfig?: Partial<GenerationConfig>;
  contextConfig?: Partial<LabContextConfig>;
  experimentId?: string | null;
  onProgress?: (modelId: string, status: 'starting' | 'generating' | 'completed' | 'failed') => void;
}

export class LabService {
  private store: ILabStore;
  private modelSvc: ModelService;

  constructor(store: ILabStore = localLabStore, modelSvc: ModelService = modelService) {
    this.store = store;
    this.modelSvc = modelSvc;
  }

  /**
   * Executes a single Playground run with real streaming and metric capture.
   */
  async executePlaygroundRun(params: PlaygroundRunParams): Promise<RunRecord> {
    const genConfig: GenerationConfig = {
      ...DEFAULT_GENERATION_CONFIG,
      ...params.generationConfig,
    };

    const ctxConfig: LabContextConfig = {
      ...DEFAULT_LAB_CONTEXT_CONFIG,
      ...params.contextConfig,
    };

    // 1. Resolve Target Model
    const model = this.modelSvc.getModel(params.modelId);
    if (!model) {
      throw new Error(`Model "${params.modelId}" is not registered in the Model Registry.`);
    }

    if (model.prototype && !model.local) {
      throw new Error(
        `Model "${model.name}" is a prototype specification and cannot be executed directly.`
      );
    }

    // 2. Validate Generation Configuration
    const validation = validateGenerationConfig(genConfig, model);
    if (!validation.valid) {
      throw new Error(`Invalid generation parameters: ${validation.errors.join(' ')}`);
    }

    // 3. Resolve Model & Provider via ModelResolutionService
    const resolution = await this.modelSvc.resolveModel({
      explicitModelId: model.id,
      requiredCapability: 'streaming',
    });

    const provider = this.modelSvc.getProvider(resolution.providerId);
    if (!provider) {
      throw new Error(`Provider "${resolution.providerId}" is unavailable.`);
    }

    // 4. Assemble Structured Context respecting explicit Lab Context Config
    const structuredContext = await this.assembleLabContext(
      params.systemPrompt,
      params.developerPrompt,
      params.userPrompt,
      ctxConfig,
      model
    );

    // 5. Construct Generation Messages
    const messages: Message[] = [];
    const fullPromptText = ContextBuilder.formatForProvider(structuredContext);

    // System prompt message
    const sysBlock = structuredContext.blocks.find(
      (b) => b.type === 'system' && b.isAvailable && b.content.trim().length > 0
    );
    if (sysBlock) {
      messages.push({
        id: `msg-sys-${Date.now()}`,
        conversationId: 'lab-playground',
        role: 'system',
        parts: [{ type: 'text', content: sysBlock.content }],
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Context instructions / memory / retrieved knowledge
    const contextContentBlocks = structuredContext.blocks.filter(
      (b) =>
        b.type !== 'system' &&
        b.type !== 'current_user' &&
        b.isAvailable &&
        b.content.trim().length > 0
    );

    if (contextContentBlocks.length > 0) {
      const formattedContext = contextContentBlocks
        .map((b) => `[${b.title}]\n${b.content}`)
        .join('\n\n');

      messages.push({
        id: `msg-ctx-${Date.now()}`,
        conversationId: 'lab-playground',
        role: 'user',
        parts: [{ type: 'text', content: `Contextual Information:\n${formattedContext}` }],
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Current User turn
    messages.push({
      id: `msg-user-${Date.now()}`,
      conversationId: 'lab-playground',
      role: 'user',
      parts: [{ type: 'text', content: params.userPrompt }],
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 6. Execution & Streaming Measurement
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let accumulatedText = '';
    let runStatus: RunRecord['status'] = 'running';
    let errorMessage: string | null = null;
    let telemetryData: RunMetrics | null = null;

    try {
      const stream = provider.generate({
        conversationId: 'lab-playground',
        messages,
        modelId: resolution.model.id,
        abortSignal: params.abortSignal,
        options: {
          temperature: genConfig.temperature,
          topP: genConfig.topP,
          topK: genConfig.topK || undefined,
          maxTokens: genConfig.maxTokens || undefined,
          stopSequences: genConfig.stopSequences,
        },
      });

      for await (const event of stream) {
        if (params.abortSignal?.aborted) {
          runStatus = 'cancelled';
          params.onEvent?.({
            type: 'cancelled',
            messageId: runId,
            partialContent: accumulatedText,
          });
          break;
        }

        params.onEvent?.(event);

        switch (event.type) {
          case 'delta':
            if (firstTokenTime === null) {
              firstTokenTime = Date.now();
            }
            accumulatedText += event.textDelta;
            break;

          case 'completed': {
            runStatus = 'completed';
            accumulatedText = event.finalContent || accumulatedText;
            const durationMs = Date.now() - startTime;
            const ttftMs = firstTokenTime ? firstTokenTime - startTime : null;

            // Extract factual metrics from event telemetry if available
            const t = event.telemetry;
            const promptToks = t?.promptTokens ?? null;
            const compToks = t?.completionTokens ?? null;
            const tps =
              t?.tokensPerSecond ??
              (compToks && durationMs > 0
                ? Number(((compToks / durationMs) * 1000).toFixed(2))
                : null);

            telemetryData = {
              ttftMs,
              durationMs,
              promptTokens: promptToks,
              completionTokens: compToks,
              tokensPerSecond: tps,
              contextTokens: structuredContext.snapshot.totalTokens ?? null,
              modelLoadTimeMs: null,
              metricSource: t?.isPrototypeData === false ? 'runtime' : 'local_measurement',
            };
            break;
          }

          case 'error':
            runStatus = 'failed';
            errorMessage = event.error.message;
            break;

          case 'cancelled':
            runStatus = 'cancelled';
            accumulatedText = event.partialContent || accumulatedText;
            break;
        }
      }
    } catch (err: unknown) {
      if (params.abortSignal?.aborted) {
        runStatus = 'cancelled';
      } else {
        runStatus = 'failed';
        errorMessage = err instanceof Error ? err.message : String(err);
      }
    }

    const durationMs = Date.now() - startTime;
    if (!telemetryData && runStatus === 'completed') {
      telemetryData = {
        ttftMs: firstTokenTime ? firstTokenTime - startTime : null,
        durationMs,
        promptTokens: null,
        completionTokens: null,
        tokensPerSecond: null,
        contextTokens: structuredContext.snapshot.totalTokens ?? null,
        modelLoadTimeMs: null,
        metricSource: 'local_measurement',
      };
    }

    // 7. Assemble Bounded RunRecord with Reproducibility Metadata
    const includedIds = structuredContext.blocks
      .filter((b) => b.isAvailable && b.content.trim().length > 0)
      .map((b) => b.id || b.title);

    const omittedIds = structuredContext.blocks
      .filter((b) => !b.isAvailable || b.content.trim().length === 0)
      .map((b) => b.id || b.title);

    const runRecord: RunRecord = {
      id: runId,
      experimentId: params.experimentId || null,
      name: params.runName || `Run #${runId.slice(-4)} (${model.name})`,
      modelId: model.id,
      modelName: model.name,
      providerId: resolution.providerId,
      runtimeId: model.runtimeId || resolution.providerId,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      developerPrompt: params.developerPrompt,
      generationConfig: genConfig,
      contextSummary: {
        contextConfig: ctxConfig,
        includedBlockIds: includedIds,
        omittedBlockIds: omittedIds,
        budgetReport: structuredContext.budgetReport,
        tokenEstimate: structuredContext.snapshot.totalTokens,
        fullContentIncluded: params.captureFullContext ?? false,
        rawFullContent: params.captureFullContext ? fullPromptText : null,
      },
      reproducibility: {
        modelId: model.id,
        modelVersion: model.version || '1.0',
        modelFileHash: null, // Populated if inspectable from GgufInspector
        providerId: resolution.providerId,
        runtimeId: model.runtimeId || resolution.providerId,
        runtimeVersion: 'llama.cpp b10631',
        llamaCppVersion: 'b10631',
        runtimeBackend: model.local ? 'CPU/GPU Local' : 'Mock Simulator',
        runtimeConfig: {
          contextLength: model.contextLength || 2048,
          precision: model.precision || 'Q4_K_M',
        },
      },
      status: runStatus,
      output: accumulatedText,
      metrics: telemetryData,
      error: errorMessage,
      createdAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await this.store.saveRun(runRecord);
    return runRecord;
  }

  /**
   * Executes sequential model comparisons respecting the single-model runtime constraint.
   */
  async runSequentialComparison(params: ComparisonRunParams): Promise<RunRecord[]> {
    const results: RunRecord[] = [];

    for (const modelId of params.modelIds) {
      params.onProgress?.(modelId, 'starting');
      try {
        const run = await this.executePlaygroundRun({
          modelId,
          systemPrompt: params.systemPrompt,
          developerPrompt: params.developerPrompt,
          userPrompt: params.userPrompt,
          generationConfig: params.generationConfig,
          contextConfig: params.contextConfig,
          experimentId: params.experimentId,
          runName: `Comparison Run · ${modelId}`,
        });
        results.push(run);
        params.onProgress?.(modelId, 'completed');
      } catch (err) {
        params.onProgress?.(modelId, 'failed');
        throw err;
      }
    }

    return results;
  }

  /**
   * Assembles structured context honoring LabContextConfig toggles.
   */
  private async assembleLabContext(
    systemPrompt: string,
    developerPrompt: string | undefined,
    userPrompt: string,
    ctxConfig: LabContextConfig,
    model: AIModel
  ): Promise<StructuredContext> {
    const rawBlocks: ContextBlock[] = [];

    // 1. System Block
    const finalSysPrompt = [systemPrompt.trim(), developerPrompt?.trim()]
      .filter(Boolean)
      .join('\n\n');

    rawBlocks.push({
      id: 'block-system',
      type: 'system',
      title: 'System Instructions',
      content: finalSysPrompt,
      priority: 1,
      required: true,
      enabled: true,
      isAvailable: finalSysPrompt.length > 0,
      tokenEstimate: ContextBudgetManager.estimateTokens(finalSysPrompt),
    });

    // 2. Current User Prompt
    rawBlocks.push({
      id: 'block-current-user',
      type: 'current_user',
      title: 'Current User Prompt',
      content: `User: ${userPrompt.trim()}`,
      priority: 2,
      required: true,
      enabled: true,
      isAvailable: userPrompt.trim().length > 0,
      tokenEstimate: ContextBudgetManager.estimateTokens(userPrompt),
    });

    // 3. Project Instructions (Optional)
    let project = null;
    if (ctxConfig.includeProjectInstructions && ctxConfig.projectId) {
      project = await projectStore.get(ctxConfig.projectId);
      if (project?.instructions?.trim()) {
        rawBlocks.push({
          id: 'block-project-instructions',
          type: 'project_instructions',
          title: `Project Instructions (${project.name})`,
          content: project.instructions.trim(),
          priority: 3,
          required: false,
          enabled: true,
          isAvailable: true,
          tokenEstimate: ContextBudgetManager.estimateTokens(project.instructions),
        });
      }
    }

    // 4. Project Memory (Optional)
    if (ctxConfig.includeProjectMemory && ctxConfig.projectId) {
      const { projectMemories } = await memoryService.getMemoriesForContext(ctxConfig.projectId);
      if (projectMemories.length > 0) {
        const pContent = projectMemories.map((m, i) => `${i + 1}. ${m.content}`).join('\n');
        rawBlocks.push({
          id: 'block-project-memory',
          type: 'project_memory',
          title: 'Project Memory',
          content: pContent,
          priority: 4,
          required: false,
          enabled: true,
          isAvailable: true,
          tokenEstimate: ContextBudgetManager.estimateTokens(pContent),
        });
      }
    }

    // 5. User Memory (Optional)
    if (ctxConfig.includeUserMemory) {
      const { userMemories } = await memoryService.getMemoriesForContext(null);
      if (userMemories.length > 0) {
        const uContent = userMemories.map((m, i) => `${i + 1}. ${m.content}`).join('\n');
        rawBlocks.push({
          id: 'block-user-memory',
          type: 'user_memory',
          title: 'User Preferences & Memory',
          content: uContent,
          priority: 5,
          required: false,
          enabled: true,
          isAvailable: true,
          tokenEstimate: ContextBudgetManager.estimateTokens(uContent),
        });
      }
    }

    // 6. Conversation History (Optional)
    if (ctxConfig.includeConversationHistory) {
      const convs = await conversationStore.list();
      const recent = convs[0] ? await conversationStore.get(convs[0].id) : null;
      if (recent && recent.messages.length > 0) {
        const hContent = recent.messages
          .map((m) => `${m.role}: ${m.parts.map((p) => (p.type === 'text' ? p.content : '')).join('')}`)
          .join('\n\n');

        rawBlocks.push({
          id: 'block-conversation-history',
          type: 'conversation_history',
          title: 'Recent Conversation History',
          content: hContent,
          priority: 7,
          required: false,
          enabled: true,
          isAvailable: true,
          tokenEstimate: ContextBudgetManager.estimateTokens(hContent),
        });
      }
    }

    // Budget allocation
    const budgetReport = ContextBudgetManager.allocate(rawBlocks, model.contextLength || null);

    return {
      blocks: rawBlocks,
      effectiveModelId: model.id,
      effectiveModelName: model.name,
      projectId: ctxConfig.projectId || null,
      conversationId: 'lab-playground',
      snapshot: {
        totalTokens: budgetReport.totalTokensEstimated,
        contextLimit: budgetReport.contextLimit,
        remainingTokens: budgetReport.remainingTokens,
        isCalculated: budgetReport.budgetApplied,
      },
      budgetReport,
    };
  }

  // --- Run Store Proxies ---

  async getRun(id: string): Promise<RunRecord | null> {
    return this.store.getRun(id);
  }

  async listRuns(query?: { experimentId?: string | null; modelId?: string; status?: string; search?: string }): Promise<RunRecord[]> {
    return this.store.listRuns(query);
  }

  async deleteRun(id: string): Promise<boolean> {
    return this.store.deleteRun(id);
  }

  async clearRuns(experimentId?: string | null): Promise<number> {
    return this.store.clearRuns(experimentId);
  }
}

export const labService = new LabService();
