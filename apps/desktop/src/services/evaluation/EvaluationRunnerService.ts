import {
  EvaluationSuite,
  EvaluationCase,
  EvaluationRun,
  EvaluationCaseResult,
  GenerationConfig,
  Message,
} from '@nikit/types';
import { IEvaluationStore } from './EvaluationStore';
import { localEvaluationStore } from './LocalStorageEvaluationStore';
import { modelService, ModelService } from '../models';
import { EvaluationMetricsService } from './EvaluationMetricsService';
import { DEFAULT_GENERATION_CONFIG } from '../lab/types';
import { CreateSuiteParams, CreateCaseParams } from './types';

export interface ExecuteEvaluationParams {
  suiteId: string;
  modelId: string;
  generationConfig?: Partial<GenerationConfig>;
  onCaseCompleted?: (caseIndex: number, totalCases: number, result: EvaluationCaseResult) => void;
  abortSignal?: AbortSignal;
}

export interface ComparisonMatrixItem {
  prompt: string;
  expectedOutput?: string;
  outputA: string;
  outputB: string;
  passedA?: boolean;
  passedB?: boolean;
  scoreA: number;
  scoreB: number;
}

export class EvaluationRunnerService {
  private store: IEvaluationStore;
  private modelSvc: ModelService;

  constructor(store: IEvaluationStore = localEvaluationStore, modelSvc: ModelService = modelService) {
    this.store = store;
    this.modelSvc = modelSvc;
  }

  /**
   * Executes all test cases in an EvaluationSuite against the specified model.
   */
  async runEvaluation(params: ExecuteEvaluationParams): Promise<EvaluationRun> {
    const suite = await this.store.getSuite(params.suiteId);
    if (!suite) {
      throw new Error(`Evaluation Suite "${params.suiteId}" not found.`);
    }

    const cases = await this.store.listCases(params.suiteId);
    if (cases.length === 0) {
      throw new Error(`Evaluation Suite "${suite.name}" contains no test cases.`);
    }

    const model = this.modelSvc.getModel(params.modelId);
    if (!model) {
      throw new Error(`Model "${params.modelId}" is not registered.`);
    }

    const resolution = await this.modelSvc.resolveModel({
      explicitModelId: model.id,
      requiredCapability: 'streaming',
    });

    const provider = this.modelSvc.getProvider(resolution.providerId);
    if (!provider) {
      throw new Error(`Provider "${resolution.providerId}" is unavailable.`);
    }

    const genConfig: GenerationConfig = {
      ...DEFAULT_GENERATION_CONFIG,
      ...params.generationConfig,
      temperature: params.generationConfig?.temperature ?? 0.1, // Low temperature for deterministic evaluation
    };

    const caseResults: EvaluationCaseResult[] = [];
    let totalScore = 0;

    for (let i = 0; i < cases.length; i++) {
      if (params.abortSignal?.aborted) {
        break;
      }

      const c = cases[i];
      const messages: Message[] = [];

      if (c.systemPrompt) {
        messages.push({
          id: `eval-sys-${Date.now()}`,
          conversationId: 'eval-runner',
          role: 'system',
          parts: [{ type: 'text', content: c.systemPrompt }],
          status: 'completed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      messages.push({
        id: `eval-user-${Date.now()}`,
        conversationId: 'eval-runner',
        role: 'user',
        parts: [{ type: 'text', content: c.prompt }],
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const startTime = Date.now();
      let responseText = '';

      try {
        const stream = provider.generate({
          conversationId: 'eval-runner',
          messages,
          modelId: resolution.model.id,
          abortSignal: params.abortSignal,
          options: {
            temperature: genConfig.temperature,
            topP: genConfig.topP,
            maxTokens: genConfig.maxTokens || 512,
          },
        });

        for await (const event of stream) {
          if (event.type === 'delta') {
            responseText += event.textDelta;
          } else if (event.type === 'completed') {
            responseText = event.finalContent || responseText;
          }
        }
      } catch (err) {
        responseText = `[Generation Error: ${err instanceof Error ? err.message : String(err)}]`;
      }

      const latencyMs = Date.now() - startTime;

      // Evaluate Metrics
      const exactMatch = EvaluationMetricsService.evaluateExactMatch(responseText, c.expectedOutput);
      const charSim = EvaluationMetricsService.evaluateCharSimilarity(responseText, c.expectedOutput);
      const lenCheck = EvaluationMetricsService.evaluateLengthCheck(responseText);

      const metrics = [exactMatch, charSim, lenCheck];
      const passed = exactMatch.isAvailable ? exactMatch.score === 1.0 : charSim.score > 0.7;
      const caseScore = exactMatch.isAvailable ? exactMatch.score : charSim.score;
      totalScore += caseScore;

      const caseResult: EvaluationCaseResult = {
        caseId: c.id,
        prompt: c.prompt,
        expectedOutput: c.expectedOutput,
        actualOutput: responseText,
        passed,
        metrics,
        latencyMs,
      };

      caseResults.push(caseResult);
      params.onCaseCompleted?.(i + 1, cases.length, caseResult);
    }

    const overallAccuracy =
      caseResults.length > 0 ? Number(((totalScore / caseResults.length) * 100).toFixed(1)) : 0;

    const runId = `evalrun-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const evalRun: EvaluationRun = {
      id: runId,
      suiteId: suite.id,
      suiteName: suite.name,
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version || '1.0',
      modelFileHash: undefined,
      providerId: resolution.providerId,
      runtimeId: model.runtimeId || resolution.providerId,
      runtimeVersion: 'llama.cpp b10631',
      tokenizerId: 'tokenizer-llamacpp',
      tokenizerVersion: '1.0.0',
      generationConfig: genConfig,
      overallAccuracy,
      metricSummaries: {
        exactMatchAccuracy: overallAccuracy,
        totalCases: caseResults.length,
      },
      caseResults,
      createdAt: new Date().toISOString(),
      schemaVersion: 'v1',
    };

    await this.store.saveRun(evalRun);
    return evalRun;
  }

  /**
   * Generates a side-by-side regression comparison matrix between two evaluation runs.
   */
  async compareRuns(runAId: string, runBId: string): Promise<{
    runA: EvaluationRun;
    runB: EvaluationRun;
    accuracyDelta: number;
    matrix: ComparisonMatrixItem[];
  }> {
    const runA = await this.store.getRun(runAId);
    const runB = await this.store.getRun(runBId);

    if (!runA || !runB) {
      throw new Error('One or both evaluation runs were not found.');
    }

    const matrix: ComparisonMatrixItem[] = [];

    for (const resA of runA.caseResults) {
      const resB = runB.caseResults.find((r) => r.caseId === resA.caseId);
      const scoreA = resA.metrics.find((m) => m.metric === 'exact_match')?.score ?? 0;
      const scoreB = resB?.metrics.find((m) => m.metric === 'exact_match')?.score ?? 0;

      matrix.push({
        prompt: resA.prompt,
        expectedOutput: resA.expectedOutput,
        outputA: resA.actualOutput,
        outputB: resB?.actualOutput || 'N/A',
        passedA: resA.passed,
        passedB: resB?.passed,
        scoreA,
        scoreB,
      });
    }

    const accuracyDelta = Number((runB.overallAccuracy - runA.overallAccuracy).toFixed(1));

    return {
      runA,
      runB,
      accuracyDelta,
      matrix,
    };
  }

  // --- Suite and Case CRUD ---

  async createSuite(params: CreateSuiteParams): Promise<EvaluationSuite> {
    const sId = `suite-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const suite: EvaluationSuite = {
      id: sId,
      name: params.name.trim(),
      description: params.description?.trim() || undefined,
      category: params.category || 'Custom',
      caseCount: 0,
      caseIds: [],
      createdAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };

    await this.store.saveSuite(suite);
    return suite;
  }

  async createCase(params: CreateCaseParams): Promise<EvaluationCase> {
    const cId = `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const evalCase: EvaluationCase = {
      id: cId,
      suiteId: params.suiteId,
      prompt: params.prompt.trim(),
      expectedOutput: params.expectedOutput?.trim() || undefined,
      systemPrompt: params.systemPrompt?.trim() || undefined,
      tags: params.tags || [],
      metadata: params.metadata,
    };

    await this.store.saveCase(evalCase);
    return evalCase;
  }

  async listSuites(): Promise<EvaluationSuite[]> {
    return this.store.listSuites();
  }

  async getSuite(id: string): Promise<EvaluationSuite | null> {
    return this.store.getSuite(id);
  }

  async listCases(suiteId: string): Promise<EvaluationCase[]> {
    return this.store.listCases(suiteId);
  }

  async listRuns(query?: { suiteId?: string; modelId?: string }): Promise<EvaluationRun[]> {
    return this.store.listRuns(query);
  }

  async getRun(id: string): Promise<EvaluationRun | null> {
    return this.store.getRun(id);
  }
}

export const evaluationRunnerService = new EvaluationRunnerService();
