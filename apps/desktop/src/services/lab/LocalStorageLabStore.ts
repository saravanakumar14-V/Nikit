import { RunRecord, Experiment } from '@nikit/types';
import { ILabStore, RunQuery, ExperimentQuery } from './LabStore';
import { LabStorageRecord, CURRENT_LAB_STORAGE_SCHEMA_VERSION } from './types';

const STORAGE_KEY = `nikit_lab_store_${CURRENT_LAB_STORAGE_SCHEMA_VERSION}`;

export class LocalStorageLabStore implements ILabStore {
  private runs: Map<string, RunRecord> = new Map();
  private experiments: Map<string, Experiment> = new Map();

  private getStorage(): Storage | null {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  private async load(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LabStorageRecord;
          if (parsed && typeof parsed === 'object') {
            this.runs.clear();
            this.experiments.clear();

            if (parsed.runs && typeof parsed.runs === 'object') {
              for (const [id, run] of Object.entries(parsed.runs)) {
                if (this.isValidRunRecord(run)) {
                  this.runs.set(id, run);
                }
              }
            }

            if (parsed.experiments && typeof parsed.experiments === 'object') {
              for (const [id, exp] of Object.entries(parsed.experiments)) {
                if (this.isValidExperimentRecord(exp)) {
                  this.experiments.set(id, exp);
                }
              }
            }
          }
        } else {
          this.runs.clear();
          this.experiments.clear();
        }
      }
    } catch {
      this.runs.clear();
      this.experiments.clear();
    }
  }

  private async persist(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const record: LabStorageRecord = {
          schemaVersion: 'v1',
          runs: Object.fromEntries(this.runs.entries()),
          experiments: Object.fromEntries(this.experiments.entries()),
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(record));
      }
    } catch {
      // Gracefully catch quota exceeded errors
    }
  }

  private isValidRunRecord(record: unknown): record is RunRecord {
    if (!record || typeof record !== 'object') return false;
    const r = record as Partial<RunRecord>;
    return (
      typeof r.id === 'string' &&
      typeof r.modelId === 'string' &&
      typeof r.status === 'string' &&
      typeof r.userPrompt === 'string' &&
      typeof r.createdAt === 'string'
    );
  }

  private isValidExperimentRecord(exp: unknown): exp is Experiment {
    if (!exp || typeof exp !== 'object') return false;
    const e = exp as Partial<Experiment>;
    return (
      typeof e.id === 'string' &&
      typeof e.name === 'string' &&
      Array.isArray(e.runIds) &&
      typeof e.createdAt === 'string'
    );
  }

  // --- Run Operations ---

  async saveRun(run: RunRecord): Promise<void> {
    await this.load();

    // Invariant: Bounded RunRecord storage.
    // If full context content was not explicitly requested, strip rawFullContent before persistence.
    const boundedRun: RunRecord = {
      ...run,
      contextSummary: run.contextSummary
        ? {
            ...run.contextSummary,
            rawFullContent: run.contextSummary.fullContentIncluded
              ? run.contextSummary.rawFullContent
              : null,
          }
        : undefined,
    };

    this.runs.set(boundedRun.id, boundedRun);

    // If run belongs to an experiment, ensure it's in the experiment's runIds
    if (boundedRun.experimentId && this.experiments.has(boundedRun.experimentId)) {
      const exp = this.experiments.get(boundedRun.experimentId)!;
      if (!exp.runIds.includes(boundedRun.id)) {
        exp.runIds.push(boundedRun.id);
        exp.updatedAt = new Date().toISOString();
        this.experiments.set(exp.id, exp);
      }
    }

    await this.persist();
  }

  async getRun(id: string): Promise<RunRecord | null> {
    await this.load();
    const item = this.runs.get(id);
    return item ? { ...item } : null;
  }

  async listRuns(query?: RunQuery): Promise<RunRecord[]> {
    await this.load();
    let list = Array.from(this.runs.values());

    if (query) {
      if (query.experimentId !== undefined) {
        list = list.filter((r) => r.experimentId === query.experimentId);
      }
      if (query.modelId) {
        list = list.filter((r) => r.modelId === query.modelId);
      }
      if (query.status) {
        list = list.filter((r) => r.status === query.status);
      }
      if (query.search && query.search.trim()) {
        const term = query.search.toLowerCase().trim();
        list = list.filter(
          (r) =>
            r.userPrompt.toLowerCase().includes(term) ||
            r.systemPrompt.toLowerCase().includes(term) ||
            (r.output && r.output.toLowerCase().includes(term)) ||
            (r.name && r.name.toLowerCase().includes(term)) ||
            r.modelName.toLowerCase().includes(term)
        );
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    // Sort by createdAt descending
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({ ...r }));
  }

  async deleteRun(id: string): Promise<boolean> {
    await this.load();
    const existed = this.runs.delete(id);

    if (existed) {
      // Remove from any experiments
      for (const exp of this.experiments.values()) {
        if (exp.runIds.includes(id)) {
          exp.runIds = exp.runIds.filter((rId) => rId !== id);
          exp.updatedAt = new Date().toISOString();
          this.experiments.set(exp.id, exp);
        }
      }
      await this.persist();
    }

    return existed;
  }

  async clearRuns(experimentId?: string | null): Promise<number> {
    await this.load();
    let count = 0;

    if (experimentId !== undefined) {
      for (const [id, run] of this.runs.entries()) {
        if (run.experimentId === experimentId) {
          this.runs.delete(id);
          count++;
        }
      }
      if (experimentId && this.experiments.has(experimentId)) {
        const exp = this.experiments.get(experimentId)!;
        exp.runIds = [];
        exp.updatedAt = new Date().toISOString();
        this.experiments.set(exp.id, exp);
      }
    } else {
      count = this.runs.size;
      this.runs.clear();
      for (const exp of this.experiments.values()) {
        exp.runIds = [];
        exp.updatedAt = new Date().toISOString();
        this.experiments.set(exp.id, exp);
      }
    }

    if (count > 0) {
      await this.persist();
    }
    return count;
  }

  // --- Experiment Operations ---

  async saveExperiment(experiment: Experiment): Promise<void> {
    await this.load();
    this.experiments.set(experiment.id, { ...experiment });
    await this.persist();
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    await this.load();
    const item = this.experiments.get(id);
    return item ? { ...item } : null;
  }

  async listExperiments(query?: ExperimentQuery): Promise<Experiment[]> {
    await this.load();
    let list = Array.from(this.experiments.values());

    if (query) {
      if (query.archived !== undefined) {
        list = list.filter((e) => (e.archived ?? false) === query.archived);
      }
      if (query.tag) {
        const tag = query.tag.toLowerCase();
        list = list.filter((e) => e.tags?.some((t) => t.toLowerCase() === tag));
      }
      if (query.search && query.search.trim()) {
        const term = query.search.toLowerCase().trim();
        list = list.filter(
          (e) =>
            e.name.toLowerCase().includes(term) ||
            (e.description && e.description.toLowerCase().includes(term)) ||
            e.userPrompt.toLowerCase().includes(term)
        );
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    return list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((e) => ({ ...e }));
  }

  async deleteExperiment(id: string): Promise<boolean> {
    await this.load();
    const existed = this.experiments.delete(id);

    if (existed) {
      // Detach runs from deleted experiment (do not delete the runs themselves)
      for (const run of this.runs.values()) {
        if (run.experimentId === id) {
          run.experimentId = null;
          this.runs.set(run.id, run);
        }
      }
      await this.persist();
    }

    return existed;
  }

  async clearAll(): Promise<void> {
    await this.load();
    this.runs.clear();
    this.experiments.clear();
    await this.persist();
  }
}

export const localLabStore = new LocalStorageLabStore();
