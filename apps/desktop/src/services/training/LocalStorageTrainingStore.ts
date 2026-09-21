import { TrainingRun, Checkpoint } from '@nikit/types';
import { ITrainingStore, TrainingRunQuery, CheckpointQuery } from './TrainingStore';
import { CURRENT_TRAINING_STORAGE_SCHEMA_VERSION } from './types';

const STORAGE_KEY = `nikit_training_store_${CURRENT_TRAINING_STORAGE_SCHEMA_VERSION}`;

interface TrainingStoragePayload {
  schemaVersion: 'v1';
  runs: Record<string, TrainingRun>;
  checkpoints: Record<string, Checkpoint>;
}

export class LocalStorageTrainingStore implements ITrainingStore {
  private runs: Map<string, TrainingRun> = new Map();
  private checkpoints: Map<string, Checkpoint> = new Map();

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
          const parsed = JSON.parse(raw) as TrainingStoragePayload;
          if (parsed && typeof parsed === 'object') {
            this.runs.clear();
            this.checkpoints.clear();

            if (parsed.runs && typeof parsed.runs === 'object') {
              for (const [id, r] of Object.entries(parsed.runs)) {
                this.runs.set(id, r);
              }
            }
            if (parsed.checkpoints && typeof parsed.checkpoints === 'object') {
              for (const [id, c] of Object.entries(parsed.checkpoints)) {
                this.checkpoints.set(id, c);
              }
            }
          }
        }
      }
    } catch {
      // Graceful catch
    }
  }

  private async persist(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const payload: TrainingStoragePayload = {
          schemaVersion: 'v1',
          runs: Object.fromEntries(this.runs.entries()),
          checkpoints: Object.fromEntries(this.checkpoints.entries()),
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
    } catch {
      // Quota safety
    }
  }

  // --- Run Operations ---

  async saveRun(run: TrainingRun): Promise<void> {
    await this.load();
    this.runs.set(run.id, { ...run });
    await this.persist();
  }

  async getRun(id: string): Promise<TrainingRun | null> {
    await this.load();
    const r = this.runs.get(id);
    return r ? { ...r } : null;
  }

  async listRuns(query?: TrainingRunQuery): Promise<TrainingRun[]> {
    await this.load();
    let list = Array.from(this.runs.values());

    if (query) {
      if (query.modelId) {
        list = list.filter((r) => r.modelId === query.modelId);
      }
      if (query.status) {
        list = list.filter((r) => r.status === query.status);
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    return list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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

  // --- Checkpoint Operations ---

  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    await this.load();
    this.checkpoints.set(checkpoint.id, { ...checkpoint });

    const run = this.runs.get(checkpoint.trainingRunId);
    if (run) {
      if (!run.checkpointIds.includes(checkpoint.id)) {
        run.checkpointIds.push(checkpoint.id);
        run.updatedAt = new Date().toISOString();
        this.runs.set(run.id, run);
      }
    }

    await this.persist();
  }

  async getCheckpoint(id: string): Promise<Checkpoint | null> {
    await this.load();
    const c = this.checkpoints.get(id);
    return c ? { ...c } : null;
  }

  async listCheckpoints(query?: CheckpointQuery): Promise<Checkpoint[]> {
    await this.load();
    let list = Array.from(this.checkpoints.values());

    if (query) {
      if (query.trainingRunId) {
        list = list.filter((c) => c.trainingRunId === query.trainingRunId);
      }
      if (query.modelId) {
        list = list.filter((c) => c.modelId === query.modelId);
      }
      if (query.status) {
        list = list.filter((c) => c.status === query.status);
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((c) => ({ ...c }));
  }

  async deleteCheckpoint(id: string): Promise<boolean> {
    await this.load();
    const existed = this.checkpoints.delete(id);
    if (existed) {
      await this.persist();
    }
    return existed;
  }

  async clearAll(): Promise<void> {
    this.runs.clear();
    this.checkpoints.clear();
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

export const localTrainingStore = new LocalStorageTrainingStore();
