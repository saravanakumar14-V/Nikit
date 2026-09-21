import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { LocalStorageConversationStore } from '../services/storage/LocalStorageConversationStore';

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

describe('LocalStorageProjectStore & Invariant Lifecycle', () => {
  let projectStore: LocalStorageProjectStore;
  let convStore: LocalStorageConversationStore;

  beforeEach(() => {
    localStorageMock.clear();
    projectStore = new LocalStorageProjectStore();
    convStore = new LocalStorageConversationStore();
  });

  it('should start with an empty project list in normal clean state (demo isolated)', async () => {
    const list = await projectStore.list();
    expect(list.length).toBe(0);
  });

  it('should create and retrieve a project with schemaVersion v1', async () => {
    const project = await projectStore.create({
      id: 'proj-ml-1',
      name: 'ML Research',
      description: 'Latent space attention mechanics and transformer scaling',
      defaultModelId: 'zaqx-1.0',
      defaultModelName: 'ZaqX 1.0 (Prototype)',
      instructions: 'Always write concise tensor annotations.',
    });

    expect(project.id).toBe('proj-ml-1');
    expect(project.name).toBe('ML Research');
    expect(project.schemaVersion).toBe('v1');
    expect(project.instructions).toBe('Always write concise tensor annotations.');

    const fetched = await projectStore.get('proj-ml-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('ML Research');
    expect(fetched?.defaultModelId).toBe('zaqx-1.0');
  });

  it('should list active projects and filter archived projects', async () => {
    await projectStore.create({ id: 'p1', name: 'Active Project 1' });
    await projectStore.create({ id: 'p2', name: 'Archived Project 2', archived: true });

    const activeList = await projectStore.list(false);
    expect(activeList.length).toBe(1);
    expect(activeList[0].id).toBe('p1');

    const allList = await projectStore.list(true);
    expect(allList.length).toBe(2);
  });

  it('should update project metadata and instructions', async () => {
    await projectStore.create({ id: 'p-update', name: 'Initial Name' });

    const updated = await projectStore.update('p-update', {
      name: 'Updated Name',
      instructions: 'New instructions for team.',
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.instructions).toBe('New instructions for team.');

    const fetched = await projectStore.get('p-update');
    expect(fetched?.name).toBe('Updated Name');
    expect(fetched?.instructions).toBe('New instructions for team.');
  });

  it('should archive and restore a project', async () => {
    await projectStore.create({ id: 'p-arch', name: 'Project to Archive' });

    const archived = await projectStore.archive('p-arch');
    expect(archived.archived).toBe(true);

    let activeList = await projectStore.list(false);
    expect(activeList.some((p) => p.id === 'p-arch')).toBe(false);

    const restored = await projectStore.restore('p-arch');
    expect(restored.archived).toBe(false);

    activeList = await projectStore.list(false);
    expect(activeList.some((p) => p.id === 'p-arch')).toBe(true);
  });

  it('INVARIANT: Deleting a project removes project association but PRESERVES conversations globally', async () => {
    const project = await projectStore.create({ id: 'proj-to-delete', name: 'Temporary Project' });

    const conv1 = await convStore.create({
      id: 'conv-in-proj-1',
      title: 'Attention Architecture Chat',
      projectId: project.id,
    });
    const conv2 = await convStore.create({
      id: 'conv-in-proj-2',
      title: 'Tokenizer Strategy Chat',
      projectId: project.id,
    });

    await projectStore.addConversation(project.id, conv1.id);
    await projectStore.addConversation(project.id, conv2.id);

    // Verify conversations belong to project
    let projectConvs = await projectStore.getConversations(project.id);
    expect(projectConvs.length).toBe(2);

    // Delete the project
    await projectStore.delete(project.id);

    // Verify project is gone
    const fetchedProject = await projectStore.get(project.id);
    expect(fetchedProject).toBeNull();

    // Verify conversations STILL EXIST globally with projectId = null
    const globalConv1 = await convStore.get('conv-in-proj-1');
    const globalConv2 = await convStore.get('conv-in-proj-2');

    expect(globalConv1).not.toBeNull();
    expect(globalConv1?.title).toBe('Attention Architecture Chat');
    expect(globalConv1?.projectId).toBeNull();

    expect(globalConv2).not.toBeNull();
    expect(globalConv2?.title).toBe('Tokenizer Strategy Chat');
    expect(globalConv2?.projectId).toBeNull();
  });

  it('INVARIANT: Removing a conversation from a project keeps the conversation globally', async () => {
    const project = await projectStore.create({ id: 'proj-detach', name: 'Detach Project' });
    const conv = await convStore.create({
      id: 'conv-detach-1',
      title: 'Kernel Benchmark',
      projectId: project.id,
    });

    await projectStore.addConversation(project.id, conv.id);
    expect((await projectStore.getConversations(project.id)).length).toBe(1);

    // Remove from project
    await projectStore.removeConversation(project.id, conv.id);

    // No longer in project
    expect((await projectStore.getConversations(project.id)).length).toBe(0);

    // Still exists in conversation store with projectId = null
    const globalConv = await convStore.get(conv.id);
    expect(globalConv).not.toBeNull();
    expect(globalConv?.projectId).toBeNull();
  });

  it('should seed demo project when explicitly requested in showcase mode', async () => {
    const demo = await projectStore.seedDemoProject();
    expect(demo.id).toBe('proj-demo-llm');
    expect(demo.name).toBe('LLM Research & Architecture');
    expect(demo.instructions).toContain('ZaqX 1.0');

    const list = await projectStore.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('proj-demo-llm');
  });
});
