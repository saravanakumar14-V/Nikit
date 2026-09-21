import { EvaluationTarget, EvaluationCase, EvaluationResult } from '@nikit/types';

/**
 * Phase 10 Evaluation Hooks.
 * Provides lightweight typed registry stubs without implementing full benchmarking suites.
 */
export class EvaluationHooks {
  private targets: Map<string, EvaluationTarget> = new Map();
  private cases: Map<string, EvaluationCase> = new Map();
  private results: Map<string, EvaluationResult> = new Map();

  registerTarget(target: EvaluationTarget): void {
    this.targets.set(target.id, target);
  }

  getTarget(id: string): EvaluationTarget | null {
    return this.targets.get(id) || null;
  }

  listTargets(): EvaluationTarget[] {
    return Array.from(this.targets.values());
  }

  registerCase(evalCase: EvaluationCase): void {
    this.cases.set(evalCase.id, evalCase);
  }

  getCase(id: string): EvaluationCase | null {
    return this.cases.get(id) || null;
  }

  listCases(): EvaluationCase[] {
    return Array.from(this.cases.values());
  }

  recordResult(result: EvaluationResult): void {
    this.results.set(result.id, result);
  }

  listResultsForCase(caseId: string): EvaluationResult[] {
    return Array.from(this.results.values()).filter((r) => r.caseId === caseId);
  }
}

export const evaluationHooks = new EvaluationHooks();
