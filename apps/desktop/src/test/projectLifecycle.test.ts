import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageProjectStore } from '../services/projects/LocalStorageProjectStore';
import { LocalStorageConversationStore } from '../services/storage/LocalStorageConversationStore';

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

describe('Phase 4 Full Invariant Lifecycle Integration', () => {
  let projectStore: LocalStorageProjectStore;
  let convStore: LocalStorageConversationStore;

  beforeEach(() => {
    localStorageMock.clear();
    projectStore = new LocalStorageProjectStore();
    convStore = new LocalStorageConversationStore();
  });

  it('verifies exact requirement sequence: Create Project -> Create Chat -> projectId attached -> Remove Chat -> Global preservation -> Delete Project -> Complete safety', async () => {
    // 1. Create Project: "LLM Research"
    const project = await projectStore.create({
      id: 'proj-lifecycle-1',
      name: 'LLM Research',
      description: 'Persistent workspace for LLM experimentation',
      defaultModelId: 'zaqx-1.0',
      defaultModelName: 'ZaqX 1.0 (Prototype)',
      instructions: 'You are helping me research and build my own LLM.',
    });
    expect(project.id).toBe('proj-lifecycle-1');

    // 2. Create Chat inside Project
    const chatInProject = await convStore.create({
      id: 'chat-proj-1',
      title: 'Attention architecture',
      modelId: project.defaultModelId,
      modelName: project.defaultModelName,
      projectId: project.id,
    });
    await projectStore.addConversation(project.id, chatInProject.id);

    // 3. Chat has projectId
    expect(chatInProject.projectId).toBe(project.id);
    const projConvs = await projectStore.getConversations(project.id);
    expect(projConvs.length).toBe(1);
    expect(projConvs[0].id).toBe('chat-proj-1');

    // 4. Remove Chat from Project
    await projectStore.removeConversation(project.id, chatInProject.id);

    // 5. Chat remains globally with projectId = null
    const globalChat = await convStore.get('chat-proj-1');
    expect(globalChat).not.toBeNull();
    expect(globalChat?.projectId).toBeNull();

    // 6. Reopen Project -> Chat is absent from project
    const projConvsAfterRemoval = await projectStore.getConversations(project.id);
    expect(projConvsAfterRemoval.length).toBe(0);

    // 7. Open global chat list -> Chat is still present
    const allConvs = await convStore.list();
    const foundInGlobal = allConvs.find((c) => c.id === 'chat-proj-1');
    expect(foundInGlobal).toBeDefined();

    // 8. Delete Project -> Conversation still remains
    await projectStore.delete(project.id);

    const projectAfterDelete = await projectStore.get(project.id);
    expect(projectAfterDelete).toBeNull();

    const persistentChat = await convStore.get('chat-proj-1');
    expect(persistentChat).not.toBeNull();
    expect(persistentChat?.title).toBe('Attention architecture');
  });
});
