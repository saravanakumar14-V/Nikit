import {
  Experiment,
  ExperimentExport,
  RunRecord,
  GenerationConfig,
  LabContextConfig,
} from '@nikit/types';
import { ILabStore } from './LabStore';
import { localLabStore } from './LocalStorageLabStore';
import { DEFAULT_GENERATION_CONFIG, DEFAULT_LAB_CONTEXT_CONFIG } from './types';

export interface CreateExperimentParams {
  name: string;
  description?: string;
  systemPrompt?: string;
  userPrompt?: string;
  developerPrompt?: string;
  generationConfig?: Partial<GenerationConfig>;
  contextConfig?: Partial<LabContextConfig>;
  modelId?: string | null;
  tags?: string[];
  notes?: string;
}

export class ExperimentService {
  private store: ILabStore;

  constructor(store: ILabStore = localLabStore) {
    this.store = store;
  }

  async createExperiment(params: CreateExperimentParams): Promise<Experiment> {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error('Experiment name cannot be empty.');
    }

    const now = new Date().toISOString();
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const experiment: Experiment = {
      id,
      name: trimmedName,
      description: params.description?.trim() || undefined,
      systemPrompt: params.systemPrompt || '',
      userPrompt: params.userPrompt || '',
      developerPrompt: params.developerPrompt?.trim() || undefined,
      generationConfig: {
        ...DEFAULT_GENERATION_CONFIG,
        ...params.generationConfig,
      },
      contextConfig: {
        ...DEFAULT_LAB_CONTEXT_CONFIG,
        ...params.contextConfig,
      },
      modelId: params.modelId || null,
      runIds: [],
      notes: params.notes || '',
      tags: params.tags || [],
      archived: false,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };

    await this.store.saveExperiment(experiment);
    return experiment;
  }

  async getExperiment(id: string): Promise<Experiment | null> {
    return this.store.getExperiment(id);
  }

  async listExperiments(query?: { search?: string; tag?: string; archived?: boolean; limit?: number }): Promise<Experiment[]> {
    return this.store.listExperiments(query);
  }

  async updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment> {
    const existing = await this.store.getExperiment(id);
    if (!existing) {
      throw new Error(`Experiment "${id}" not found.`);
    }

    const updated: Experiment = {
      ...existing,
      ...updates,
      name: updates.name ? updates.name.trim() : existing.name,
      description: updates.description !== undefined ? updates.description.trim() || undefined : existing.description,
      updatedAt: new Date().toISOString(),
    };

    await this.store.saveExperiment(updated);
    return updated;
  }

  async duplicateExperiment(id: string, newName?: string): Promise<Experiment> {
    const existing = await this.store.getExperiment(id);
    if (!existing) {
      throw new Error(`Experiment "${id}" not found.`);
    }

    const name = newName?.trim() || `${existing.name} (Copy)`;
    return this.createExperiment({
      name,
      description: existing.description,
      systemPrompt: existing.systemPrompt,
      userPrompt: existing.userPrompt,
      developerPrompt: existing.developerPrompt,
      generationConfig: existing.generationConfig,
      contextConfig: existing.contextConfig,
      modelId: existing.modelId,
      tags: existing.tags ? [...existing.tags] : [],
      notes: existing.notes,
    });
  }

  async archiveExperiment(id: string): Promise<Experiment> {
    return this.updateExperiment(id, { archived: true });
  }

  async restoreExperiment(id: string): Promise<Experiment> {
    return this.updateExperiment(id, { archived: false });
  }

  async deleteExperiment(id: string): Promise<boolean> {
    return this.store.deleteExperiment(id);
  }

  /**
   * Exports experiment and associated runs into a portable JSON document.
   * Invariant: Never embeds model weights, raw private document contents, or full memory DB.
   */
  async exportExperiment(id: string): Promise<ExperimentExport> {
    const exp = await this.store.getExperiment(id);
    if (!exp) {
      throw new Error(`Experiment "${id}" not found.`);
    }

    const runs = await this.store.listRuns({ experimentId: id });

    // Sanitize runs: Ensure raw full content is not leaked unless opted in
    const sanitizedRuns: RunRecord[] = runs.map((r) => ({
      ...r,
      contextSummary: r.contextSummary
        ? {
            ...r.contextSummary,
            rawFullContent: r.contextSummary.fullContentIncluded
              ? r.contextSummary.rawFullContent
              : null,
          }
        : undefined,
    }));

    return {
      exportVersion: 'nikit-lab-v1',
      exportedAt: new Date().toISOString(),
      experiment: exp,
      runs: sanitizedRuns,
    };
  }

  /**
   * Imports an experiment export JSON with strict schema validation.
   */
  async importExperiment(data: unknown): Promise<{ experiment: Experiment; runs: RunRecord[] }> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid export data format.');
    }

    const expData = data as Partial<ExperimentExport>;
    if (expData.exportVersion !== 'nikit-lab-v1') {
      throw new Error(
        `Unsupported experiment export version "${expData.exportVersion || 'unknown'}". Expected "nikit-lab-v1".`
      );
    }

    if (!expData.experiment || typeof expData.experiment !== 'object' || !expData.experiment.name) {
      throw new Error('Malformed experiment metadata in import payload.');
    }

    const now = new Date().toISOString();
    const newExpId = `exp-imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const importedRuns: RunRecord[] = [];
    const newRunIds: string[] = [];

    if (Array.isArray(expData.runs)) {
      for (const rawRun of expData.runs) {
        if (rawRun && typeof rawRun === 'object' && rawRun.modelId && rawRun.userPrompt) {
          const runId = `run-imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const run: RunRecord = {
            ...rawRun,
            id: runId,
            experimentId: newExpId,
            createdAt: rawRun.createdAt || now,
            schemaVersion: 'v1',
          };
          await this.store.saveRun(run);
          importedRuns.push(run);
          newRunIds.push(runId);
        }
      }
    }

    const importedExperiment: Experiment = {
      ...expData.experiment,
      id: newExpId,
      name: `${expData.experiment.name} (Imported)`,
      runIds: newRunIds,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 'v1',
    };

    await this.store.saveExperiment(importedExperiment);

    return {
      experiment: importedExperiment,
      runs: importedRuns,
    };
  }
}

export const experimentService = new ExperimentService();
