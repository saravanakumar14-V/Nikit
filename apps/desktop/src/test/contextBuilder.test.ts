import { describe, it, expect } from 'vitest';
import { ContextBuilder } from '../services/context/ContextBuilder';
import { Project, Conversation } from '@nikit/types';

describe('ContextBuilder & Structured Context Assembly', () => {
  const dummyProject: Project = {
    id: 'proj-ml-2',
    name: 'Neural Compression Lab',
    description: 'Workspace for attention tensor pruning',
    defaultModelId: 'zaqx-1.0-expert',
    defaultModelName: 'ZaqX 1.0 (Expert Pruning)',
    instructions: 'Always annotate tensor shapes with [B, S, H, D] comments.',
    context: {
      fileReferences: [],
      memoryReferences: [],
      knowledgeReferences: [],
      toolReferences: [],
    },
    conversationIds: [],
    archived: false,
    schemaVersion: 'v1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummyConversation: Conversation = {
    id: 'conv-sample-1',
    title: 'Pruning Experiments',
    modelId: 'custom-quant-model',
    modelName: 'Custom Quant 4-Bit',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 'v1',
    messages: [
      {
        id: 'm1',
        conversationId: 'conv-sample-1',
        role: 'user',
        status: 'completed',
        parts: [{ type: 'text', content: 'What is structured pruning?' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'm2',
        conversationId: 'conv-sample-1',
        role: 'assistant',
        status: 'completed',
        parts: [{ type: 'text', content: 'Structured pruning eliminates entire attention heads or channels.' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  it('should assemble structured context with system, project, and conversation blocks', () => {
    const context = ContextBuilder.assemble({
      project: dummyProject,
      conversation: dummyConversation,
      workspaceModelId: 'zaqx-1.0',
      workspaceModelName: 'ZaqX 1.0 (Prototype)',
    });

    expect(context.blocks.length).toBeGreaterThanOrEqual(6);

    const systemBlock = context.blocks.find((b) => b.type === 'system');
    expect(systemBlock).toBeDefined();
    expect(systemBlock?.isAvailable).toBe(true);

    const projectBlock = context.blocks.find((b) => b.type === 'project_instructions');
    expect(projectBlock).toBeDefined();
    expect(projectBlock?.isAvailable).toBe(true);
    expect(projectBlock?.content).toContain('Always annotate tensor shapes');
    expect(projectBlock?.title).toContain('Neural Compression Lab');

    const convBlock = context.blocks.find((b) => b.type === 'conversation_history');
    expect(convBlock).toBeDefined();
    expect(convBlock?.isAvailable).toBe(true);
    expect(convBlock?.content).toContain('What is structured pruning?');
    expect(convBlock?.content).toContain('Structured pruning eliminates entire attention heads');

    // Untriggered blocks remain unavailable
    const userMemBlock = context.blocks.find((b) => b.type === 'user_memory');
    expect(userMemBlock?.isAvailable).toBe(false);

    const retrievedBlock = context.blocks.find((b) => b.type === 'retrieved_knowledge');
    expect(retrievedBlock?.isAvailable).toBe(false);

    const toolsBlock = context.blocks.find((b) => b.type === 'tools');
    expect(toolsBlock?.isAvailable).toBe(false);
  });

  it('should enforce Model Precedence: Conversation Override > Project Default > Workspace Default', () => {
    // 1. Conversation Override
    const ctx1 = ContextBuilder.assemble({
      project: dummyProject, // defaultModelId = 'zaqx-1.0-expert'
      conversation: dummyConversation, // modelId = 'custom-quant-model'
      workspaceModelId: 'workspace-default',
      workspaceModelName: 'Workspace Default',
    });
    expect(ctx1.effectiveModelId).toBe('custom-quant-model');

    // 2. Project Default when Conversation has no override
    const conversationNoOverride: Conversation = {
      ...dummyConversation,
      modelId: '',
      modelName: '',
    };
    const ctx2 = ContextBuilder.assemble({
      project: dummyProject,
      conversation: conversationNoOverride,
      workspaceModelId: 'workspace-default',
      workspaceModelName: 'Workspace Default',
    });
    expect(ctx2.effectiveModelId).toBe('zaqx-1.0-expert');

    // 3. Workspace Default when no Project and no Conversation override
    const ctx3 = ContextBuilder.assemble({
      project: null,
      conversation: conversationNoOverride,
      workspaceModelId: 'workspace-default',
      workspaceModelName: 'Workspace Default',
    });
    expect(ctx3.effectiveModelId).toBe('workspace-default');
  });

  it('should format only available active blocks for provider generation', () => {
    const context = ContextBuilder.assemble({
      project: dummyProject,
      conversation: dummyConversation,
      workspaceModelId: 'zaqx-1.0',
      workspaceModelName: 'ZaqX 1.0 (Prototype)',
    });

    const serialized = ContextBuilder.formatForProvider(context);
    expect(serialized).toContain('[Global System Instructions]');
    expect(serialized).toContain('Project Instructions: Neural Compression Lab');
    expect(serialized).toContain('[Conversation History]');
    expect(serialized).not.toContain('Project Memory');
    expect(serialized).not.toContain('Retrieved Knowledge Context');
  });
});
