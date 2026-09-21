import {
  Conversation,
  ConversationSummary,
  Message,
} from '@nikit/types';

export const CURRENT_STORAGE_SCHEMA_VERSION = 'v1';

/**
 * Normalized entities representing future relational / SQLite table schemas.
 * 
 * TABLE conversations (id, title, model_id, model_name, created_at, updated_at, pinned, schema_version)
 * TABLE messages (id, conversation_id, role, status, model_id, model_name, created_at, updated_at, telemetry, error, parent_id)
 * TABLE message_parts (id, message_id, part_type, content, metadata_json, sort_order)
 */
export interface StoredConversationRow {
  id: string;
  title: string;
  modelId: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  schemaVersion: string;
}

export interface StoredMessageRow {
  id: string;
  conversationId: string;
  role: string;
  status: string;
  modelId?: string;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
  telemetryJson?: string | null;
  errorJson?: string | null;
  parentId?: string | null;
}

/**
 * Service Contract for Conversation & Message persistence.
 * Kept strictly inside the desktop storage service layer.
 */
export interface IConversationStore {
  list(): Promise<ConversationSummary[]>;
  get(id: string): Promise<Conversation | null>;
  create(initial?: Partial<Conversation>): Promise<Conversation>;
  update(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  delete(id: string): Promise<void>;
  appendMessage(conversationId: string, message: Message): Promise<Conversation>;
  updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<Conversation>;
  truncateDownstreamMessages(
    conversationId: string,
    targetMessageId: string
  ): Promise<Conversation>;
  saveDraft(conversationId: string, draft: string): Promise<void>;
  getDraft(conversationId: string): Promise<string>;
}
