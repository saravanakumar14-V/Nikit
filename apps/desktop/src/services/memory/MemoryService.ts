import {
  Memory,
  MemoryQuery,
  MemoryUpdate,
  MemoryConflict,
  MemoryPolicy,
} from '@nikit/types';
import { IMemoryStore } from './MemoryStore';
import { localMemoryStore } from './LocalMemoryStore';
import { MemoryPolicyManager, memoryPolicyManager } from './MemoryPolicy';
import { CreateMemoryParams } from './types';

export class MemoryService {
  private store: IMemoryStore;
  private policyManager: MemoryPolicyManager;

  constructor(
    store: IMemoryStore = localMemoryStore,
    policyManager: MemoryPolicyManager = memoryPolicyManager
  ) {
    this.store = store;
    this.policyManager = policyManager;
  }

  /**
   * Creates an explicit or promoted memory record with strict policy & scope validation.
   */
  async createMemory(params: CreateMemoryParams): Promise<Memory> {
    const policy = await this.policyManager.getPolicy();
    if (!policy.enabled) {
      throw new Error('Memory is currently disabled by system policy.');
    }

    if (params.scope === 'project') {
      if (!policy.allowProjectMemory) {
        throw new Error('Project memory is disabled by policy.');
      }
      if (!params.projectId || !params.projectId.trim()) {
        throw new Error('Project memory requires a valid projectId.');
      }
    }

    if (params.source === 'conversation' && !policy.allowConversationMemory) {
      throw new Error('Conversation memory extraction is disabled by policy.');
    }

    const trimmedContent = params.content.trim();
    if (!trimmedContent) {
      throw new Error('Memory content cannot be empty.');
    }

    const now = new Date().toISOString();
    const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const memory: Memory = {
      id,
      scope: params.scope,
      projectId: params.scope === 'project' ? params.projectId : null,
      title: params.title?.trim() || undefined,
      content: trimmedContent,
      status: 'active',
      confidence: params.confidence || 'explicit',
      source: params.source || 'user_saved',
      provenance: {
        source: params.source || 'user_saved',
        sourceConversationId: params.sourceConversationId || null,
        sourceMessageId: params.sourceMessageId || null,
        sourceProjectId: params.sourceProjectId || (params.scope === 'project' ? params.projectId : null),
        recordedBy: 'user',
        originalText: params.originalText || trimmedContent,
      },
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      usageCount: 0,
      schemaVersion: 'v1',
    };

    await this.store.save(memory);
    return memory;
  }

  async getMemory(id: string): Promise<Memory | null> {
    return this.store.get(id);
  }

  async listMemories(query?: MemoryQuery): Promise<Memory[]> {
    return this.store.list(query);
  }

  async updateMemory(id: string, update: MemoryUpdate): Promise<Memory> {
    const existing = await this.store.get(id);
    if (!existing) {
      throw new Error(`Memory record "${id}" not found.`);
    }

    const updated: Memory = {
      ...existing,
      title: update.title !== undefined ? update.title?.trim() || undefined : existing.title,
      content: update.content !== undefined ? update.content.trim() : existing.content,
      status: update.status || existing.status,
      confidence: update.confidence || existing.confidence,
      updatedAt: new Date().toISOString(),
    };

    if (!updated.content) {
      throw new Error('Memory content cannot be empty.');
    }

    await this.store.save(updated);
    return updated;
  }

  async deleteMemory(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async archiveMemory(id: string): Promise<Memory> {
    return this.updateMemory(id, { status: 'archived' });
  }

  async restoreMemory(id: string): Promise<Memory> {
    return this.updateMemory(id, { status: 'active' });
  }

  /**
   * Retrieves active memories applicable for context assembly with strict scope isolation.
   */
  async getMemoriesForContext(
    projectId?: string | null
  ): Promise<{ userMemories: Memory[]; projectMemories: Memory[] }> {
    const policy = await this.policyManager.getPolicy();
    if (!policy.enabled) {
      return { userMemories: [], projectMemories: [] };
    }

    // 1. User memories (global, active only)
    const userMemories = await this.store.list({
      scope: 'user',
      status: 'active',
    });

    // 2. Project memories (active only, scoped to target project)
    let projectMemories: Memory[] = [];
    if (policy.allowProjectMemory && projectId) {
      projectMemories = await this.store.list({
        scope: 'project',
        projectId,
        status: 'active',
      });
    }

    return { userMemories, projectMemories };
  }

  /**
   * Tracks memory usage without mutating content or ranking silently.
   */
  async recordMemoryUsage(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const now = new Date().toISOString();

    for (const id of ids) {
      const mem = await this.store.get(id);
      if (mem && mem.status === 'active') {
        mem.lastUsedAt = now;
        mem.usageCount = (mem.usageCount || 0) + 1;
        await this.store.save(mem);
      }
    }
  }

  /**
   * Detects simple contradictory memory statements for transparent user auditing.
   */
  async detectConflicts(memories?: Memory[]): Promise<MemoryConflict[]> {
    const list = memories || (await this.store.list({ status: 'active' }));
    const conflicts: MemoryConflict[] = [];

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];

        // Only compare memories in same effective scope
        if (a.scope === b.scope && a.projectId === b.projectId) {
          const conflictReason = this.checkSimpleContradiction(a.content, b.content);
          if (conflictReason) {
            conflicts.push({
              memoryA: a,
              memoryB: b,
              reason: conflictReason,
              detectedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return conflicts;
  }

  private checkSimpleContradiction(textA: string, textB: string): string | null {
    const a = textA.toLowerCase();
    const b = textB.toLowerCase();

    // Check for direct polarity pairs (prefers X vs avoids X, uses X vs does not use X)
    const patterns = [
      { pos: 'prefers ', neg: 'avoids ' },
      { pos: 'uses ', neg: 'does not use ' },
      { pos: 'always ', neg: 'never ' },
      { pos: 'likes ', neg: 'dislikes ' },
    ];

    for (const p of patterns) {
      if (a.includes(p.pos) && b.includes(p.neg)) {
        return `Possible preference divergence between statements: "${textA}" vs "${textB}"`;
      }
      if (a.includes(p.neg) && b.includes(p.pos)) {
        return `Possible preference divergence between statements: "${textA}" vs "${textB}"`;
      }
    }

    return null;
  }

  async clearUserMemory(): Promise<number> {
    return this.store.clearScope('user');
  }

  async clearProjectMemory(projectId: string): Promise<number> {
    return this.store.clearScope('project', projectId);
  }

  async deleteProjectMemories(projectId: string): Promise<number> {
    return this.store.clearScope('project', projectId);
  }

  async clearAllMemory(): Promise<number> {
    return this.store.clearAll();
  }

  async getPolicy(): Promise<MemoryPolicy> {
    return this.policyManager.getPolicy();
  }

  async updatePolicy(patch: Partial<MemoryPolicy>): Promise<MemoryPolicy> {
    return this.policyManager.updatePolicy(patch);
  }
}

export const memoryService = new MemoryService();
