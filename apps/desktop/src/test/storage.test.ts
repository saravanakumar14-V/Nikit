import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageConversationStore } from '../services/storage/LocalStorageConversationStore';
import { Message } from '@nikit/types';

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

describe('LocalStorageConversationStore', () => {
  let store: LocalStorageConversationStore;

  beforeEach(() => {
    localStorageMock.clear();
    store = new LocalStorageConversationStore();
  });

  it('should initialize with seed conversation data', async () => {
    const list = await store.list();
    expect(list.length).toBeGreaterThan(0);
    expect(list[0].id).toBe('conv-1');

    const conv = await store.get('conv-1');
    expect(conv).not.toBeNull();
    expect(conv?.messages.length).toBe(2);
    expect(conv?.schemaVersion).toBe('v1');
  });

  it('should create a new conversation and list it', async () => {
    const created = await store.create({
      id: 'conv-test-1',
      title: 'Neural Architecture Search',
      modelId: 'zaqx-1.0',
      modelName: 'ZaqX 1.0 (Prototype)',
    });

    expect(created.id).toBe('conv-test-1');
    expect(created.title).toBe('Neural Architecture Search');

    const list = await store.list();
    const found = list.find((c) => c.id === 'conv-test-1');
    expect(found).toBeDefined();
    expect(found?.title).toBe('Neural Architecture Search');
  });

  it('should append a user message and an assistant message', async () => {
    const created = await store.create({
      id: 'conv-test-2',
      title: 'New Conversation',
    });

    const userMsg: Message = {
      id: 'msg-u-1',
      conversationId: created.id,
      role: 'user',
      status: 'completed',
      parts: [{ type: 'text', content: 'What is low-rank attention compression?' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const afterUser = await store.appendMessage(created.id, userMsg);
    expect(afterUser.messages.length).toBe(1);
    expect(afterUser.messages[0].id).toBe('msg-u-1');
    // Title should be updated automatically from first user message
    expect(afterUser.title).toContain('What is low-rank attention');

    const asstMsg: Message = {
      id: 'msg-a-1',
      conversationId: created.id,
      role: 'assistant',
      status: 'completed',
      parts: [{ type: 'text', content: 'Low-rank compression projects Key-Value states into a smaller subspace.' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      telemetry: { isPrototypeData: true },
    };

    const afterAsst = await store.appendMessage(created.id, asstMsg);
    expect(afterAsst.messages.length).toBe(2);
    expect(afterAsst.messages[1].id).toBe('msg-a-1');
  });

  it('should update an existing message', async () => {
    const created = await store.create({ id: 'conv-test-3' });
    const msg: Message = {
      id: 'msg-target',
      conversationId: created.id,
      role: 'user',
      status: 'completed',
      parts: [{ type: 'text', content: 'Original content' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.appendMessage(created.id, msg);

    const updated = await store.updateMessage(created.id, 'msg-target', {
      parts: [{ type: 'text', content: 'Edited content' }],
    });

    expect(updated.messages[0].parts[0]).toEqual({
      type: 'text',
      content: 'Edited content',
    });
  });

  it('should truncate downstream messages on message edit', async () => {
    const created = await store.create({ id: 'conv-test-4' });

    const m1: Message = {
      id: 'msg-1',
      conversationId: created.id,
      role: 'user',
      status: 'completed',
      parts: [{ type: 'text', content: 'First question' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const m2: Message = {
      id: 'msg-2',
      conversationId: created.id,
      role: 'assistant',
      status: 'completed',
      parts: [{ type: 'text', content: 'First answer' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const m3: Message = {
      id: 'msg-3',
      conversationId: created.id,
      role: 'user',
      status: 'completed',
      parts: [{ type: 'text', content: 'Second question' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const m4: Message = {
      id: 'msg-4',
      conversationId: created.id,
      role: 'assistant',
      status: 'completed',
      parts: [{ type: 'text', content: 'Second answer' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.appendMessage(created.id, m1);
    await store.appendMessage(created.id, m2);
    await store.appendMessage(created.id, m3);
    await store.appendMessage(created.id, m4);

    // Truncate at msg-1 (e.g. editing msg-1)
    const truncated = await store.truncateDownstreamMessages(created.id, 'msg-1');
    expect(truncated.messages.length).toBe(1);
    expect(truncated.messages[0].id).toBe('msg-1');
  });

  it('should save and retrieve debounced drafts', async () => {
    await store.saveDraft('conv-draft-test', 'Draft text in progress');
    const draft = await store.getDraft('conv-draft-test');
    expect(draft).toBe('Draft text in progress');

    await store.saveDraft('conv-draft-test', '');
    const clearedDraft = await store.getDraft('conv-draft-test');
    expect(clearedDraft).toBe('');
  });

  it('should delete a conversation', async () => {
    await store.create({ id: 'conv-delete-me', title: 'To Be Deleted' });
    let list = await store.list();
    expect(list.some((c) => c.id === 'conv-delete-me')).toBe(true);

    await store.delete('conv-delete-me');
    list = await store.list();
    expect(list.some((c) => c.id === 'conv-delete-me')).toBe(false);

    const deletedConv = await store.get('conv-delete-me');
    expect(deletedConv).toBeNull();
  });
});
