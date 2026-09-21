import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { LocalStorageConversationStore } from '../services/storage/LocalStorageConversationStore';
import { LocalStorageFileStore } from '../services/files/LocalStorageFileStore';

// In-memory mock for localStorage
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

describe('Phase 5A Project & File Invariant Integration', () => {
  let projectStore: LocalStorageProjectStore;
  let convStore: LocalStorageConversationStore;
  let fileStore: LocalStorageFileStore;

  beforeEach(() => {
    localStorageMock.clear();
    projectStore = new LocalStorageProjectStore();
    convStore = new LocalStorageConversationStore();
    fileStore = new LocalStorageFileStore();
  });

  it('INVARIANT: Deleting a project atomically detaches both conversations and files (projectId = null) while preserving all data', async () => {
    // 1. Create Project
    const project = await projectStore.create({
      id: 'proj-ai-research',
      name: 'AI Research Workspace',
    });

    // 2. Create and attach Conversation
    const conv = await convStore.create({
      id: 'conv-in-proj-10',
      title: 'Attention Experiments',
      projectId: project.id,
    });
    await projectStore.addConversation(project.id, conv.id);

    // 3. Create and attach File
    const file = await fileStore.create({
      id: 'file-in-proj-10',
      name: 'model_spec.md',
      projectId: project.id,
      status: 'ready',
    });

    // Verify initial attachment
    expect((await convStore.get(conv.id))?.projectId).toBe(project.id);
    expect((await fileStore.get(file.id))?.projectId).toBe(project.id);

    // 4. Delete Project
    await projectStore.delete(project.id);

    // 5. Verify Project is deleted
    expect(await projectStore.get(project.id)).toBeNull();

    // 6. Verify Conversation is PRESERVED with projectId = null
    const preservedConv = await convStore.get(conv.id);
    expect(preservedConv).not.toBeNull();
    expect(preservedConv?.title).toBe('Attention Experiments');
    expect(preservedConv?.projectId).toBeNull();

    // 7. Verify File is PRESERVED with projectId = null
    const preservedFile = await fileStore.get(file.id);
    expect(preservedFile).not.toBeNull();
    expect(preservedFile?.name).toBe('model_spec.md');
    expect(preservedFile?.projectId).toBeNull();
  });
});
