import { Memory, MemoryQuery, MemoryPolicy } from '@nikit/types';
import { IMemoryStore } from './MemoryStore';
import { MemoryStorageRecord, DEFAULT_MEMORY_POLICY } from './types';

const STORAGE_KEY = 'nikit_memory_store_v1';

export class LocalMemoryStore implements IMemoryStore {
  private cache: Map<string, Memory> = new Map();
  private policy: MemoryPolicy = { ...DEFAULT_MEMORY_POLICY };

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
          const parsed = JSON.parse(raw) as MemoryStorageRecord;
          if (parsed && typeof parsed === 'object') {
            if (parsed.policy && typeof parsed.policy === 'object') {
              this.policy = { ...DEFAULT_MEMORY_POLICY, ...parsed.policy };
            }
            if (parsed.memories && typeof parsed.memories === 'object') {
              this.cache.clear();
              for (const [id, mem] of Object.entries(parsed.memories)) {
                if (this.isValidMemoryRecord(mem)) {
                  this.cache.set(id, mem);
                }
              }
            }
          }
        } else {
          this.cache.clear();
          this.policy = { ...DEFAULT_MEMORY_POLICY };
        }
      }
    } catch {
      // In case of corruption, preserve memory store safely without throwing
      this.cache.clear();
      this.policy = { ...DEFAULT_MEMORY_POLICY };
    }
  }

  private async persist(): Promise<void> {
    try {
      const storage = this.getStorage();
      if (storage) {
        const record: MemoryStorageRecord = {
          schemaVersion: 'v1',
          policy: this.policy,
          memories: Object.fromEntries(this.cache.entries()),
        };
        storage.setItem(STORAGE_KEY, JSON.stringify(record));
      }
    } catch {
      // Ignore quota errors gracefully
    }
  }

  private isValidMemoryRecord(mem: unknown): mem is Memory {
    if (!mem || typeof mem !== 'object') return false;
    const m = mem as Partial<Memory>;
    return (
      typeof m.id === 'string' &&
      (m.scope === 'user' || m.scope === 'project') &&
      typeof m.content === 'string' &&
      typeof m.status === 'string' &&
      typeof m.confidence === 'string'
    );
  }

  async save(memory: Memory): Promise<void> {
    await this.load();
    this.cache.set(memory.id, { ...memory });
    await this.persist();
  }

  async get(id: string): Promise<Memory | null> {
    await this.load();
    const item = this.cache.get(id);
    return item ? { ...item } : null;
  }

  async list(query?: MemoryQuery): Promise<Memory[]> {
    await this.load();
    let list = Array.from(this.cache.values());

    if (query) {
      if (query.scope) {
        list = list.filter((m) => m.scope === query.scope);
      }
      if (query.projectId !== undefined) {
        list = list.filter((m) => m.projectId === query.projectId);
      }
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status];
        list = list.filter((m) => statuses.includes(m.status));
      }
      if (query.source) {
        list = list.filter((m) => m.source === query.source);
      }
      if (query.search && query.search.trim()) {
        const term = query.search.toLowerCase().trim();
        list = list.filter(
          (m) =>
            m.content.toLowerCase().includes(term) ||
            (m.title && m.title.toLowerCase().includes(term))
        );
      }
      if (query.limit && query.limit > 0) {
        list = list.slice(0, query.limit);
      }
    }

    // Sort by updatedAt descending
    return list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((m) => ({ ...m }));
  }

  async delete(id: string): Promise<boolean> {
    await this.load();
    const existed = this.cache.delete(id);
    if (existed) {
      await this.persist();
    }
    return existed;
  }

  async clearScope(scope: 'user' | 'project', projectId?: string | null): Promise<number> {
    await this.load();
    let count = 0;
    for (const [id, m] of this.cache.entries()) {
      if (m.scope === scope) {
        if (scope === 'project' && projectId !== undefined && m.projectId !== projectId) {
          continue;
        }
        this.cache.delete(id);
        count++;
      }
    }
    if (count > 0) {
      await this.persist();
    }
    return count;
  }

  async clearAll(): Promise<number> {
    await this.load();
    const count = this.cache.size;
    this.cache.clear();
    await this.persist();
    return count;
  }

  async getPolicy(): Promise<MemoryPolicy> {
    await this.load();
    return { ...this.policy };
  }

  async savePolicy(policy: MemoryPolicy): Promise<void> {
    await this.load();
    this.policy = { ...DEFAULT_MEMORY_POLICY, ...policy };
    await this.persist();
  }
}

export const localMemoryStore = new LocalMemoryStore();
