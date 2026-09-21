import {
  Project,
  ProjectSummary,
  ProjectContext,
  ConversationSummary,
} from '@nikit/types';
import {
  IProjectStore,
  CURRENT_PROJECT_STORAGE_SCHEMA_VERSION,
} from './types';
import { conversationStore } from '../storage';
import { fileStore } from '../files/LocalStorageFileStore';
import { chunkStore } from '../knowledge/LocalStorageChunkStore';
import { embeddingStore } from '../retrieval/embedding/LocalStorageEmbeddingStore';
import { memoryService } from '../memory';

const KEYS = {
  INDEX: `nikit:projects:${CURRENT_PROJECT_STORAGE_SCHEMA_VERSION}`,
  PROJECT_PREFIX: `nikit:project:${CURRENT_PROJECT_STORAGE_SCHEMA_VERSION}:`,
};

const DEFAULT_PROJECT_CONTEXT: ProjectContext = {
  fileReferences: [],
  memoryReferences: [],
  knowledgeReferences: [],
  toolReferences: [],
};

export class LocalStorageProjectStore implements IProjectStore {
  async list(includeArchived = false): Promise<ProjectSummary[]> {
    try {
      const raw = localStorage.getItem(KEYS.INDEX);
      if (!raw) return [];
      const summaries = JSON.parse(raw) as ProjectSummary[];
      if (includeArchived) return summaries;
      return summaries.filter((p) => !p.archived);
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<Project | null> {
    try {
      const key = `${KEYS.PROJECT_PREFIX}${id}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as Project;
    } catch {
      return null;
    }
  }

  async create(initial?: Partial<Project>): Promise<Project> {
    const id = initial?.id || `proj-${Date.now()}`;
    const now = new Date().toISOString();
    const newProject: Project = {
      id,
      name: initial?.name || 'Untitled Workspace',
      description: initial?.description || '',
      icon: initial?.icon || 'Folder',
      accent: initial?.accent || 'var(--nikit-accent-base)',
      createdAt: initial?.createdAt || now,
      updatedAt: initial?.updatedAt || now,
      defaultModelId: initial?.defaultModelId || 'zaqx-1.0',
      defaultModelName: initial?.defaultModelName || 'ZaqX 1.0 (Prototype)',
      instructions: initial?.instructions || '',
      context: initial?.context || {
        ...DEFAULT_PROJECT_CONTEXT,
        instructions: initial?.instructions || '',
      },
      conversationIds: initial?.conversationIds || [],
      archived: initial?.archived || false,
      schemaVersion: CURRENT_PROJECT_STORAGE_SCHEMA_VERSION,
    };

    try {
      localStorage.setItem(`${KEYS.PROJECT_PREFIX}${id}`, JSON.stringify(newProject));

      const summaries = await this.list(true);
      const newSummary: ProjectSummary = {
        id,
        name: newProject.name,
        description: newProject.description,
        icon: newProject.icon,
        accent: newProject.accent,
        updatedAt: 'Just now',
        defaultModelId: newProject.defaultModelId,
        defaultModelName: newProject.defaultModelName,
        conversationCount: newProject.conversationIds.length,
        archived: newProject.archived,
      };

      const nextSummaries = [newSummary, ...summaries.filter((s) => s.id !== id)];
      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }

    return newProject;
  }

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Project ${id} not found.`);
    }

    const updatedProject: Project = {
      ...existing,
      ...updates,
      context: {
        ...existing.context,
        ...(updates.context || {}),
        instructions: updates.instructions !== undefined ? updates.instructions : existing.instructions,
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`${KEYS.PROJECT_PREFIX}${id}`, JSON.stringify(updatedProject));

      const summaries = await this.list(true);
      const nextSummaries = summaries.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            name: updatedProject.name,
            description: updatedProject.description,
            icon: updatedProject.icon,
            accent: updatedProject.accent,
            defaultModelId: updatedProject.defaultModelId,
            defaultModelName: updatedProject.defaultModelName,
            conversationCount: updatedProject.conversationIds.length,
            archived: updatedProject.archived,
            updatedAt: 'Just now',
          };
        }
        return s;
      });

      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }

    return updatedProject;
  }

  async delete(id: string): Promise<void> {
    try {
      // Invariant: Deleting a project detaches conversations (conversation.projectId = null)
      // and detaches files (file.projectId = null), but does NOT delete them.
      const allConversations = await conversationStore.list();
      const projectConversations = allConversations.filter((c) => c.projectId === id);

      for (const conv of projectConversations) {
        await conversationStore.update(conv.id, { projectId: null });
      }

      // Detach project files safely
      const allFiles = await fileStore.list();
      const projectFiles = allFiles.filter((f) => f.projectId === id);
      for (const file of projectFiles) {
        await fileStore.update(file.id, { projectId: null });
      }

      // Detach project chunks safely (preserves user knowledge chunks globally)
      await chunkStore.detachChunksFromProject(id);

      // Detach project embeddings safely
      await embeddingStore.detachFromProject(id);

      // Invariant (Phase 8): Project memories are deleted with the project
      await memoryService.deleteProjectMemories(id);

      localStorage.removeItem(`${KEYS.PROJECT_PREFIX}${id}`);

      const summaries = await this.list(true);
      const nextSummaries = summaries.filter((s) => s.id !== id);
      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }
  }

  async archive(id: string): Promise<Project> {
    return this.update(id, { archived: true });
  }

  async restore(id: string): Promise<Project> {
    return this.update(id, { archived: false });
  }

  async addConversation(projectId: string, conversationId: string): Promise<Project> {
    const project = await this.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Set conversation.projectId = projectId (Authoritative relationship)
    await conversationStore.update(conversationId, { projectId });

    const existingIds = new Set(project.conversationIds);
    existingIds.add(conversationId);

    return this.update(projectId, {
      conversationIds: Array.from(existingIds),
    });
  }

  async removeConversation(projectId: string, conversationId: string): Promise<Project> {
    const project = await this.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Set conversation.projectId = null (Authoritative relationship)
    await conversationStore.update(conversationId, { projectId: null });

    const filteredIds = project.conversationIds.filter((id) => id !== conversationId);

    return this.update(projectId, {
      conversationIds: filteredIds,
    });
  }

  async getConversations(projectId: string): Promise<ConversationSummary[]> {
    // Authoritative lookup via Conversation.projectId
    const all = await conversationStore.list();
    return all.filter((c) => c.projectId === projectId);
  }

  /**
   * Isolated development / showcase demo helper.
   * Only invoked when explicitly requested in demo / showcase scenarios.
   */
  async seedDemoProject(): Promise<Project> {
    const demoProject: Partial<Project> = {
      id: 'proj-demo-llm',
      name: 'LLM Research & Architecture',
      description: 'Personal workspace for latent attention, KV-cache dynamics, and tokenizer experiments.',
      icon: 'Cpu',
      accent: '#3b82f6',
      defaultModelId: 'zaqx-1.0',
      defaultModelName: 'ZaqX 1.0 (Prototype)',
      instructions: `You are assisting me with research and development of custom LLM architectures (ZaqX 1.0).

Priorities:
1. Emphasize low-rank latent attention projections and KV-cache memory dynamics.
2. Provide clean, modular PyTorch forward passes and tensor shape comments.
3. Keep explanations rigorous, concise, and production-oriented.`,
      conversationIds: ['conv-1'],
    };

    // Attach conv-1 to demo project if conv-1 exists
    try {
      const conv1 = await conversationStore.get('conv-1');
      if (conv1) {
        await conversationStore.update('conv-1', { projectId: 'proj-demo-llm' });
      }
    } catch {
      // Ignore
    }

    return this.create(demoProject);
  }
}

export const projectStore = new LocalStorageProjectStore();
