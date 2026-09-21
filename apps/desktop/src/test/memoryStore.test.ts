import { describe, it, expect, beforeEach } from 'vitest';
import { LocalMemoryStore } from '../services/memory/LocalMemoryStore';
import { Memory } from '@nikit/types';

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

describe('LocalMemoryStore & Persistence Isolation', () => {
  let store: LocalMemoryStore;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalMemoryStore();
  });

  it('performs CRUD operations on memory records', async () => {
    const memory: Memory = {
      id: 'mem-1',
      scope: 'user',
      projectId: null,
      title: 'Coding Preference',
      content: 'Prefers TypeScript with strict types.',
      status: 'active',
      confidence: 'explicit',
      source: 'user_saved',
      provenance: {
        source: 'user_saved',
        recordedBy: 'user',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUsedAt: null,
      usageCount: 0,
      schemaVersion: 'v1',
    };

    await store.save(memory);
    const retrieved = await store.get('mem-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.content).toBe('Prefers TypeScript with strict types.');

    // Update
    await store.save({
      ...memory,
      content: 'Prefers TypeScript and Rust.',
      updatedAt: new Date().toISOString(),
    });

    const updated = await store.get('mem-1');
    expect(updated?.content).toBe('Prefers TypeScript and Rust.');

    // Delete
    const deleted = await store.delete('mem-1');
    expect(deleted).toBe(true);
    expect(await store.get('mem-1')).toBeNull();
  });

  it('filters memories by scope, project, and status', async () => {
    const memUser: Memory = {
      id: 'mem-user',
      scope: 'user',
      content: 'Global preference',
      status: 'active',
      confidence: 'explicit',
      source: 'user_saved',
      provenance: { source: 'user_saved' },
      createdAt: '2026-08-26T10:00:00Z',
      updatedAt: '2026-08-26T10:00:00Z',
      usageCount: 0,
      schemaVersion: 'v1',
    };

    const memProjA: Memory = {
      id: 'mem-proj-a',
      scope: 'project',
      projectId: 'proj-a',
      content: 'Project A fact',
      status: 'active',
      confidence: 'explicit',
      source: 'user_saved',
      provenance: { source: 'user_saved' },
      createdAt: '2026-08-26T11:00:00Z',
      updatedAt: '2026-08-26T11:00:00Z',
      usageCount: 0,
      schemaVersion: 'v1',
    };

    const memProjB: Memory = {
      id: 'mem-proj-b',
      scope: 'project',
      projectId: 'proj-b',
      content: 'Project B fact',
      status: 'archived',
      confidence: 'explicit',
      source: 'user_saved',
      provenance: { source: 'user_saved' },
      createdAt: '2026-08-26T12:00:00Z',
      updatedAt: '2026-08-26T12:00:00Z',
      usageCount: 0,
      schemaVersion: 'v1',
    };

    await store.save(memUser);
    await store.save(memProjA);
    await store.save(memProjB);

    const userOnly = await store.list({ scope: 'user' });
    expect(userOnly.length).toBe(1);
    expect(userOnly[0].id).toBe('mem-user');

    const projAOnly = await store.list({ scope: 'project', projectId: 'proj-a' });
    expect(projAOnly.length).toBe(1);
    expect(projAOnly[0].id).toBe('mem-proj-a');

    const activeOnly = await store.list({ status: 'active' });
    expect(activeOnly.length).toBe(2);

    const searchResults = await store.list({ search: 'Project A' });
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].id).toBe('mem-proj-a');
  });

  it('clears specific scopes without affecting other scopes', async () => {
    await store.save({
      id: 'u1',
      scope: 'user',
      content: 'User memory 1',
      status: 'active',
      confidence: 'explicit',
      source: 'user_saved',
      provenance: { source: 'user_saved' },
      createdAt: '',
      updatedAt: '',
      usageCount: 0,
      schemaVersion: 'v1',
    });

    await store.save({
      id: 'p1',
      scope: 'project',
      projectId: 'proj-1',
      content: 'Project 1 memory',
      status: 'active',
      confidence: 'explicit',
      source: 'user_saved',
      provenance: { source: 'user_saved' },
      createdAt: '',
      updatedAt: '',
      usageCount: 0,
      schemaVersion: 'v1',
    });

    await store.clearScope('project', 'proj-1');
    const remaining = await store.list();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('u1');
  });
});
