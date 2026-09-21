import { EvaluationSuite, EvaluationCase, EvaluationRun } from '@nikit/types';
import { IEvaluationStore, SuiteQuery, RunQuery } from './EvaluationStore';
import { CURRENT_EVAL_STORAGE_SCHEMA_VERSION, BASELINE_EVALUATION_SUITES } from './types';

const STORAGE_KEY = `nikit_evaluation_store_${CURRENT_EVAL_STORAGE_SCHEMA_VERSION}`;

interface EvalStoragePayload {
  schemaVersion: 'v1';
  suites: Record<string, EvaluationSuite>;
  cases: Record<string, EvaluationCase>;
  runs: Record<string, EvaluationRun>;
}

export class LocalStorageEvaluationStore implements IEvaluationStore {
  private suites: Map<string, EvaluationSuite> = new Map();
  private cases: Map<string, EvaluationCase> = new Map();
  private runs: Map<string, EvaluationRun> = new Map();

  constructor() {
    this.seedBaselines();
  }

  private getStorage(): Storage | null {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  private seedBaselines(): void {
    if (this.suites.size === 0) {
      const now = new Date().toISOString();
      for (const b of BASELINE_EVALUATION_SUITES) {
        const sId = `suite-baseline-${b.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const caseIds: string[] = [];

        for (let i = 0; i < b.cases.length; i++) {
          const c = b.cases[i];
          const cId = `case-${sId}-${i + 1}`;
          caseIds.push(cId);
          this.cases.set(cId, {
            id: cId,
            suiteId: sId,
            prompt: c.prompt,
            expectedOutput: c.expectedOutput,
            systemPrompt: c.systemPrompt,
          });
        }

        this.suites.set(sId, {
          id: sId,
          name: b.name,
          description: b.description,
          category: b.category,
          caseCount: caseIds.length,
          caseIds,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 'v1',
        });
      }
    }
  }

  private async load(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as EvalStoragePayload;
          if (parsed && typeof parsed === 'object') {
            this.suites.clear();
            this.cases.clear();
            this.runs.clear();

            if (parsed.suites && typeof parsed.suites === 'object') {
              for (const [id, s] of Object.entries(parsed.suites)) {
                this.suites.set(id, s);
              }
            }
            if (parsed.cases && typeof parsed.cases === 'object') {
              for (const [id, c] of Object.entries(parsed.cases)) {
                this.cases.set(id, c);
              }
            }
            if (parsed.runs && typeof parsed.runs === 'object') {
              for (const [id, r] of Object.entries(parsed.runs)) {
                this.runs.set(id, r);
              }
            }
          }
        }
      }
    } catch {
      // Keep memory contents
    }

    if (this.suites.size === 0) {
      this.seedBaselines();
    }
  }

  private async persist(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const payload: EvalStoragePayload = {
          schemaVersion: 'v1',
          suites: Object.fromEntries(this.suites.entries()),
          cases: Object.fromEntries(this.cases.entries()),
          runs: Object.fromEntries(this.runs.entries()),
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // Quota safety
    }
  }

  // --- Suite Operations ---

  async saveSuite(suite: EvaluationSuite): Promise<void> {
    await this.load();
    this.suites.set(suite.id, { ...suite });
    await this.persist();
  }

  async getSuite(id: string): Promise<EvaluationSuite | null> {
    await this.load();
    const s = this.suites.get(id);
    return s ? { ...s } : null;
  }

  async listSuites(query?: SuiteQuery): Promise<EvaluationSuite[]> {
    await this.load();
    let list = Array.from(this.suites.values());

    if (query) {
      if (query.category) {
        list = list.filter((s) => s.category === query.category);
      }
      if (query.search && query.search.trim()) {
        const term = query.search.toLowerCase().trim();
        list = list.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            (s.description && s.description.toLowerCase().includes(term))
        );
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    return list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((s) => ({ ...s }));
  }

  async deleteSuite(id: string): Promise<boolean> {
    await this.load();
    const s = this.suites.get(id);
    if (!s) return false;

    // Delete associated cases
    for (const cId of s.caseIds) {
      this.cases.delete(cId);
    }

    const existed = this.suites.delete(id);
    await this.persist();
    return existed;
  }

  // --- Case Operations ---

  async saveCase(evalCase: EvaluationCase): Promise<void> {
    await this.load();
    this.cases.set(evalCase.id, { ...evalCase });

    const suite = this.suites.get(evalCase.suiteId);
    if (suite) {
      if (!suite.caseIds.includes(evalCase.id)) {
        suite.caseIds.push(evalCase.id);
        suite.caseCount = suite.caseIds.length;
      }
      suite.updatedAt = new Date().toISOString();
      this.suites.set(suite.id, suite);
    }

    await this.persist();
  }

  async getCase(id: string): Promise<EvaluationCase | null> {
    await this.load();
    const c = this.cases.get(id);
    return c ? { ...c } : null;
  }

  async listCases(suiteId: string): Promise<EvaluationCase[]> {
    await this.load();
    return Array.from(this.cases.values())
      .filter((c) => c.suiteId === suiteId)
      .map((c) => ({ ...c }));
  }

  async deleteCase(id: string): Promise<boolean> {
    await this.load();
    const c = this.cases.get(id);
    if (!c) return false;

    this.cases.delete(id);
    const suite = this.suites.get(c.suiteId);
    if (suite) {
      suite.caseIds = suite.caseIds.filter((cId) => cId !== id);
      suite.caseCount = suite.caseIds.length;
      suite.updatedAt = new Date().toISOString();
      this.suites.set(suite.id, suite);
    }

    await this.persist();
    return true;
  }

  // --- Run Operations ---

  async saveRun(run: EvaluationRun): Promise<void> {
    await this.load();
    this.runs.set(run.id, { ...run });
    await this.persist();
  }

  async getRun(id: string): Promise<EvaluationRun | null> {
    await this.load();
    const r = this.runs.get(id);
    return r ? { ...r } : null;
  }

  async listRuns(query?: RunQuery): Promise<EvaluationRun[]> {
    await this.load();
    let list = Array.from(this.runs.values());

    if (query) {
      if (query.suiteId) {
        list = list.filter((r) => r.suiteId === query.suiteId);
      }
      if (query.modelId) {
        list = list.filter((r) => r.modelId === query.modelId);
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({ ...r }));
  }

  async deleteRun(id: string): Promise<boolean> {
    await this.load();
    const existed = this.runs.delete(id);
    if (existed) {
      await this.persist();
    }
    return existed;
  }

  async clearAll(): Promise<void> {
    this.suites.clear();
    this.cases.clear();
    this.runs.clear();
    try {
      const storage = this.getStorage();
      if (storage) {
        storage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
}

export const localEvaluationStore = new LocalStorageEvaluationStore();
