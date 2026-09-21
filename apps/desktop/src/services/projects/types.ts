import {
  Project,
  ProjectSummary,
  ConversationSummary,
} from '@nikit/types';

export const CURRENT_PROJECT_STORAGE_SCHEMA_VERSION = 'v1';

/**
 * Service Contract for Project persistence and workspace lifecycle.
 * Isolates project storage from React components and UI presentation layers.
 */
export interface IProjectStore {
  list(includeArchived?: boolean): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  create(initial?: Partial<Project>): Promise<Project>;
  update(id: string, updates: Partial<Project>): Promise<Project>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<Project>;
  restore(id: string): Promise<Project>;
  addConversation(projectId: string, conversationId: string): Promise<Project>;
  removeConversation(projectId: string, conversationId: string): Promise<Project>;
  getConversations(projectId: string): Promise<ConversationSummary[]>;
}
