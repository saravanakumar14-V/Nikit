import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryService } from '../services/memory/MemoryService';
import { LocalMemoryStore } from '../services/memory/LocalMemoryStore';
import { MemoryPolicyManager } from '../services/memory/MemoryPolicy';

// In-memory mock for localStorage in Node environment
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => {
    storageMap.set(key, val);
  },
  removeItem: (key: string) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('MemoryService Operations & Policy', () => {
  let store: LocalMemoryStore;
  let policyManager: MemoryPolicyManager;
  let service: MemoryService;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalMemoryStore();
    policyManager = new MemoryPolicyManager(store);
    service = new MemoryService(store, policyManager);
  });

  it('creates user memory successfully with valid provenance', async () => {
    const mem = await service.createMemory({
      scope: 'user',
      content: 'Prefers dark mode and concise summaries.',
      title: 'UI Preference',
      source: 'user_saved',
      sourceConversationId: 'conv-123',
    });

    expect(mem.id).toMatch(/^mem-/);
    expect(mem.scope).toBe('user');
    expect(mem.content).toBe('Prefers dark mode and concise summaries.');
    expect(mem.provenance.sourceConversationId).toBe('conv-123');
    expect(mem.status).toBe('active');
    expect(mem.usageCount).toBe(0);
  });

  it('rejects project memory without a valid projectId', async () => {
    await expect(
      service.createMemory({
        scope: 'project',
        projectId: null,
        content: 'Should fail',
      })
    ).rejects.toThrow('Project memory requires a valid projectId.');
  });

  it('enforces memory policy disablement', async () => {
    await service.updatePolicy({ enabled: false });

    await expect(
      service.createMemory({
        scope: 'user',
        content: 'Will fail when disabled',
      })
    ).rejects.toThrow('Memory is currently disabled by system policy.');
  });

  it('isolates project memories from unrelated projects in getMemoriesForContext', async () => {
    // User memory
    await service.createMemory({
      scope: 'user',
      content: 'Global user fact',
    });

    // Project A memory
    await service.createMemory({
      scope: 'project',
      projectId: 'proj-alpha',
      content: 'Project Alpha fact',
    });

    // Project B memory
    await service.createMemory({
      scope: 'project',
      projectId: 'proj-beta',
      content: 'Project Beta fact',
    });

    // Query for Project Alpha
    const alphaContext = await service.getMemoriesForContext('proj-alpha');
    expect(alphaContext.userMemories.length).toBe(1);
    expect(alphaContext.userMemories[0].content).toBe('Global user fact');
    expect(alphaContext.projectMemories.length).toBe(1);
    expect(alphaContext.projectMemories[0].content).toBe('Project Alpha fact');

    // Query for null project (standalone conversation)
    const nullContext = await service.getMemoriesForContext(null);
    expect(nullContext.userMemories.length).toBe(1);
    expect(nullContext.projectMemories.length).toBe(0);
  });

  it('detects contradictory preference pairs transparently', async () => {
    const mem1 = await service.createMemory({
      scope: 'user',
      content: 'Always prefers TypeScript over JavaScript.',
    });

    const mem2 = await service.createMemory({
      scope: 'user',
      content: 'Never prefers TypeScript over JavaScript.',
    });

    const conflicts = await service.detectConflicts([mem1, mem2]);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].reason).toContain('Possible preference divergence');
  });

  it('tracks memory usage counts correctly', async () => {
    const mem = await service.createMemory({
      scope: 'user',
      content: 'Test usage tracking',
    });

    expect(mem.usageCount).toBe(0);
    expect(mem.lastUsedAt).toBeNull();

    await service.recordMemoryUsage([mem.id]);

    const updated = await service.getMemory(mem.id);
    expect(updated?.usageCount).toBe(1);
    expect(updated?.lastUsedAt).not.toBeNull();
  });
});
