import { MemoryPolicy } from '@nikit/types';
import { IMemoryStore } from './MemoryStore';
import { localMemoryStore } from './LocalMemoryStore';
import { DEFAULT_MEMORY_POLICY } from './types';

export class MemoryPolicyManager {
  private store: IMemoryStore;
  private cachedPolicy: MemoryPolicy = { ...DEFAULT_MEMORY_POLICY };

  constructor(store: IMemoryStore = localMemoryStore) {
    this.store = store;
    this.store.getPolicy().then((p) => {
      this.cachedPolicy = p;
    });
  }

  async getPolicy(): Promise<MemoryPolicy> {
    const policy = await this.store.getPolicy();
    this.cachedPolicy = policy;
    return policy;
  }

  getCachedPolicy(): MemoryPolicy {
    return { ...this.cachedPolicy };
  }

  async updatePolicy(patch: Partial<MemoryPolicy>): Promise<MemoryPolicy> {
    const current = await this.getPolicy();
    const updated: MemoryPolicy = { ...current, ...patch };
    await this.store.savePolicy(updated);
    this.cachedPolicy = updated;
    return updated;
  }

  isMemoryEnabled(): boolean {
    return this.cachedPolicy.enabled;
  }

  isProjectMemoryAllowed(): boolean {
    return this.cachedPolicy.enabled && this.cachedPolicy.allowProjectMemory;
  }

  isConversationMemoryAllowed(): boolean {
    return this.cachedPolicy.enabled && this.cachedPolicy.allowConversationMemory;
  }

  isExplicitSaveRequired(): boolean {
    return this.cachedPolicy.requireExplicitSave;
  }
}

export const memoryPolicyManager = new MemoryPolicyManager();
