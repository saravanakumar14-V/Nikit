import { Memory, MemoryPolicy } from '@nikit/types';

export interface MemoryStorageRecord {
  schemaVersion: 'v1';
  memories: Record<string, Memory>;
  policy: MemoryPolicy;
}

export const DEFAULT_MEMORY_POLICY: MemoryPolicy = {
  enabled: true,
  allowConversationMemory: true,
  allowProjectMemory: true,
  requireExplicitSave: true,
  maxUserMemories: 500,
  maxProjectMemories: 200,
};

export interface CreateMemoryParams {
  scope: 'user' | 'project';
  projectId?: string | null;
  content: string;
  title?: string;
  confidence?: 'explicit' | 'high' | 'medium' | 'low';
  source?: 'user_saved' | 'project_instruction' | 'conversation';
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  sourceProjectId?: string | null;
  originalText?: string;
}
