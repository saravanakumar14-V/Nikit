import { describe, it, expect } from 'vitest';
import { ContextBuilder } from '../services/context/ContextBuilder';
import { AttachmentReference, Conversation, MessagePart } from '@nikit/types';

describe('Context Attachments & Pipeline', () => {
  const sampleAttachments: AttachmentReference[] = [
    {
      id: 'att-1',
      name: 'architecture.md',
      type: 'file',
      sizeBytes: 1024,
      content: '# Architecture Overview\nLocal-first modular engine with offline privacy.',
      mimeType: 'text/markdown',
      path: '/docs/architecture.md',
    },
    {
      id: 'att-2',
      name: 'retriever.ts',
      type: 'code',
      sizeBytes: 512,
      content: 'export function hybridSearch(query: string) { return []; }',
      mimeType: 'text/typescript',
      path: '/src/retriever.ts',
    },
  ];

  const createDummyConversation = (id: string, title: string): Conversation => ({
    id,
    title,
    messages: [],
    modelId: 'mock-dev',
    modelName: 'Mock Model',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
  });

  it('creates and serializes attachments into MessageParts without data loss', () => {
    const userParts: MessagePart[] = [{ type: 'text', content: 'Explain this design.' }];

    for (const att of sampleAttachments) {
      if (att.type === 'code') {
        userParts.push({
          type: 'code',
          content: att.content || '',
          language: att.mimeType || 'text',
          filename: att.name,
        });
      } else {
        userParts.push({
          type: 'file',
          name: att.name,
          sizeBytes: att.sizeBytes,
          mimeType: att.mimeType,
          path: att.path,
        });
      }
    }

    expect(userParts.length).toBe(3);
    expect(userParts[0]).toEqual({ type: 'text', content: 'Explain this design.' });
    expect(userParts[1]).toMatchObject({
      type: 'file',
      name: 'architecture.md',
      sizeBytes: 1024,
      path: '/docs/architecture.md',
    });
    expect(userParts[2]).toMatchObject({
      type: 'code',
      filename: 'retriever.ts',
      language: 'text/typescript',
      content: 'export function hybridSearch(query: string) { return []; }',
    });
  });

  it('supports attachment removal and maintains remaining attachments state', () => {
    let attachments = [...sampleAttachments];
    expect(attachments.length).toBe(2);

    // Remove first attachment
    attachments = attachments.filter((a) => a.id !== 'att-1');
    expect(attachments.length).toBe(1);
    expect(attachments[0].id).toBe('att-2');
  });

  it('assembles attachments as a distinct high-priority block in ContextBuilder', () => {
    const context = ContextBuilder.assemble({
      conversation: createDummyConversation('conv-test', 'Attachment Test'),
      attachments: sampleAttachments,
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    const attachmentBlock = context.blocks.find((b) => b.id === 'block-user-attachments');
    expect(attachmentBlock).toBeDefined();
    expect(attachmentBlock?.isAvailable).toBe(true);
    expect(attachmentBlock?.priority).toBe(2);
    expect(attachmentBlock?.content).toContain('--- Attachment #1: architecture.md [FILE] ---');
    expect(attachmentBlock?.content).toContain('# Architecture Overview');
    expect(attachmentBlock?.content).toContain('--- Attachment #2: retriever.ts [CODE] ---');
    expect(attachmentBlock?.content).toContain('export function hybridSearch');
  });

  it('participates in token budget accounting and updates fileTokens', () => {
    const context = ContextBuilder.assemble({
      conversation: createDummyConversation('conv-test', 'Attachment Test'),
      attachments: sampleAttachments,
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    // Verify snapshot reflects file tokens
    expect(context.snapshot.fileTokens).toBeGreaterThan(0);
    expect(context.snapshot.totalTokens ?? 0).toBeGreaterThanOrEqual(context.snapshot.fileTokens ?? 0);
  });

  it('preserves deterministic ordering across message history and formatted output', () => {
    const context = ContextBuilder.assemble({
      conversation: createDummyConversation('conv-test', 'Ordering Test'),
      attachments: sampleAttachments,
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    const formatted = ContextBuilder.formatForProvider(context);
    const posFile = formatted.indexOf('--- Attachment #1: architecture.md [FILE] ---');
    const posCode = formatted.indexOf('--- Attachment #2: retriever.ts [CODE] ---');

    expect(posFile).toBeGreaterThan(-1);
    expect(posCode).toBeGreaterThan(-1);
    expect(posFile).toBeLessThan(posCode);
  });

  it('handles empty attachments cleanly without generating empty blocks', () => {
    const context = ContextBuilder.assemble({
      conversation: createDummyConversation('conv-test', 'Empty Test'),
      attachments: [],
      workspaceModelId: 'mock-dev',
      workspaceModelName: 'Mock Model',
    });

    const attachmentBlock = context.blocks.find((b) => b.id === 'block-user-attachments');
    expect(attachmentBlock).toBeUndefined();
  });
});
