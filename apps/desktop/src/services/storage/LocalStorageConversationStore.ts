import {
  Conversation,
  ConversationSummary,
  Message,
  ContextSnapshot,
} from '@nikit/types';
import {
  IConversationStore,
  CURRENT_STORAGE_SCHEMA_VERSION,
} from './types';

const KEYS = {
  INDEX: `nikit:conversations:${CURRENT_STORAGE_SCHEMA_VERSION}`,
  CONVERSATION_PREFIX: `nikit:conv:${CURRENT_STORAGE_SCHEMA_VERSION}:`,
  DRAFT_PREFIX: `nikit:draft:${CURRENT_STORAGE_SCHEMA_VERSION}:`,
  LEGACY_CONVERSATIONS: 'nikit:conversations',
};

const DEFAULT_CONTEXT_SNAPSHOT: ContextSnapshot = {
  modelTokens: null,
  systemTokens: null,
  projectTokens: null,
  memoryTokens: null,
  conversationTokens: null,
  fileTokens: null,
  toolTokens: null,
  userTokens: null,
  totalTokens: null,
  contextLimit: null,
  remainingTokens: null,
  isCalculated: false,
};

const INITIAL_SEED_CONVERSATION: Conversation = {
  id: 'conv-1',
  title: 'ZaqX Latent Attention Architecture (Design)',
  modelId: 'zaqx-1.0',
  modelName: 'ZaqX 1.0 (Prototype)',
  createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
  contextSnapshot: DEFAULT_CONTEXT_SNAPSHOT,
  messages: [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      status: 'completed',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      parts: [
        {
          type: 'text',
          content:
            'Explain the architectural principles behind the planned ZaqX 1.0 Multi-Head Latent Attention layer and show a conceptual forward pass in PyTorch.',
        },
      ],
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      status: 'completed',
      modelId: 'zaqx-1.0',
      modelName: 'ZaqX 1.0 (Prototype)',
      createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      telemetry: {
        isPrototypeData: true,
      },
      parts: [
        {
          type: 'text',
          content:
            'In the planned ZaqX 1.0 architecture, Multi-Head Latent Attention (MLA) compresses the Key-Value (KV) cache into a low-rank latent vector prior to attention projection. This dramatically reduces memory footprint during long-context autoregressive decoding.\n\nHere is a conceptual PyTorch implementation of the latent decompression and scaled dot-product attention forward pass:',
        },
        {
          type: 'code',
          language: 'python',
          filename: 'zaqx_latent_attention_forward.py',
          content: `import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiHeadLatentAttention(nn.Module):
    """
    Conceptual forward pass for low-rank latent KV compression.
    Targeted for ZaqX 1.0 long-context generation efficiency.
    """
    def __init__(self, d_model: int, n_heads: int, latent_dim: int):
        super().__init__()
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        self.latent_dim = latent_dim
        
        # Decompression matrix for cached latent KV state
        self.w_decomp = nn.Linear(latent_dim, 2 * d_model, bias=False)
        self.scale = 1.0 / (self.head_dim ** 0.5)

    def forward(self, q: torch.Tensor, kv_latent: torch.Tensor) -> torch.Tensor:
        # Decompress latent KV representation into Key and Value tensors
        kv_decomp = self.w_decomp(kv_latent)
        k, v = torch.chunk(kv_decomp, 2, dim=-1)
        
        # Reshape for multi-head attention
        b, seq_len, _ = q.shape
        q = q.view(b, seq_len, self.n_heads, self.head_dim).transpose(1, 2)
        k = k.view(b, -1, self.n_heads, self.head_dim).transpose(1, 2)
        v = v.view(b, -1, self.n_heads, self.head_dim).transpose(1, 2)
        
        # Compute scaled dot-product attention
        scores = torch.matmul(q, k.transpose(-2, -1)) * self.scale
        attn_weights = F.softmax(scores, dim=-1)
        output = torch.matmul(attn_weights, v)
        
        return output.transpose(1, 2).contiguous().view(b, seq_len, -1)`,
        },
        {
          type: 'text',
          content:
            'During decoding, only the compressed `kv_latent` vectors need to be retained in GPU memory, cutting standard KV-cache consumption by up to 75% without sacrificing model expressivity.',
        },
      ],
    },
  ],
};

export class LocalStorageConversationStore implements IConversationStore {
  private draftDebounceTimers: Map<string, number> = new Map();

  constructor() {
    this.migrateIfNeeded();
    this.ensureSeedData();
  }

  private migrateIfNeeded(): void {
    try {
      // Check if legacy unversioned index exists
      const legacyRaw = localStorage.getItem(KEYS.LEGACY_CONVERSATIONS);
      const versionedRaw = localStorage.getItem(KEYS.INDEX);

      if (legacyRaw && !versionedRaw) {
        const legacySummaries = JSON.parse(legacyRaw) as Array<{
          id: string;
          title: string;
          updatedAt: string;
          modelId: string;
          messageCount: number;
        }>;

        const migratedSummaries: ConversationSummary[] = legacySummaries.map((s) => ({
          id: s.id,
          title: s.title || 'Untitled Chat',
          updatedAt: s.updatedAt || 'Recently',
          modelId: s.modelId || 'zaqx-1.0',
          messageCount: s.messageCount || 0,
        }));

        localStorage.setItem(KEYS.INDEX, JSON.stringify(migratedSummaries));
      }
    } catch {
      // Ignore migration errors in restricted environments
    }
  }

  private ensureSeedData(): void {
    try {
      const raw = localStorage.getItem(KEYS.INDEX);
      if (!raw) {
        const initialSummaries: ConversationSummary[] = [
          {
            id: INITIAL_SEED_CONVERSATION.id,
            title: INITIAL_SEED_CONVERSATION.title,
            updatedAt: '10m ago',
            modelId: INITIAL_SEED_CONVERSATION.modelId,
            modelName: INITIAL_SEED_CONVERSATION.modelName,
            messageCount: INITIAL_SEED_CONVERSATION.messages.length,
          },
        ];
        localStorage.setItem(KEYS.INDEX, JSON.stringify(initialSummaries));
        localStorage.setItem(
          `${KEYS.CONVERSATION_PREFIX}${INITIAL_SEED_CONVERSATION.id}`,
          JSON.stringify(INITIAL_SEED_CONVERSATION)
        );
      } else {
        // If conv-1 doesn't have its full payload stored, initialize it
        const seedConvKey = `${KEYS.CONVERSATION_PREFIX}${INITIAL_SEED_CONVERSATION.id}`;
        if (!localStorage.getItem(seedConvKey)) {
          localStorage.setItem(seedConvKey, JSON.stringify(INITIAL_SEED_CONVERSATION));
        }
      }
    } catch {
      // Ignore localStorage exceptions
    }
  }

  async list(): Promise<ConversationSummary[]> {
    try {
      const raw = localStorage.getItem(KEYS.INDEX);
      if (!raw) return [];
      return JSON.parse(raw) as ConversationSummary[];
    } catch {
      return [];
    }
  }

  async get(id: string): Promise<Conversation | null> {
    try {
      const key = `${KEYS.CONVERSATION_PREFIX}${id}`;
      const raw = localStorage.getItem(key);
      if (!raw) {
        // If index has it but document not yet created, return empty stub
        const list = await this.list();
        const summary = list.find((s) => s.id === id);
        if (summary) {
          const stub: Conversation = {
            id: summary.id,
            title: summary.title,
            modelId: summary.modelId,
            modelName: summary.modelName || 'ZaqX 1.0 (Prototype)',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
            messages: [],
            contextSnapshot: DEFAULT_CONTEXT_SNAPSHOT,
          };
          localStorage.setItem(key, JSON.stringify(stub));
          return stub;
        }
        return null;
      }
      return JSON.parse(raw) as Conversation;
    } catch {
      return null;
    }
  }

  async create(initial?: Partial<Conversation>): Promise<Conversation> {
    const id = initial?.id || `conv-${Date.now()}`;
    const now = new Date().toISOString();
    const newConv: Conversation = {
      id,
      title: initial?.title || 'New Conversation',
      modelId: initial?.modelId || 'zaqx-1.0',
      modelName: initial?.modelName || 'ZaqX 1.0 (Prototype)',
      createdAt: initial?.createdAt || now,
      updatedAt: initial?.updatedAt || now,
      schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
      messages: initial?.messages || [],
      draft: initial?.draft || '',
      contextSnapshot: initial?.contextSnapshot || DEFAULT_CONTEXT_SNAPSHOT,
      pinned: initial?.pinned || false,
      projectId: initial?.projectId || null,
    };

    try {
      localStorage.setItem(`${KEYS.CONVERSATION_PREFIX}${id}`, JSON.stringify(newConv));

      const summaries = await this.list();
      const newSummary: ConversationSummary = {
        id,
        title: newConv.title,
        updatedAt: 'Just now',
        modelId: newConv.modelId,
        modelName: newConv.modelName,
        messageCount: newConv.messages.length,
        pinned: newConv.pinned,
        projectId: newConv.projectId,
      };

      const nextSummaries = [newSummary, ...summaries.filter((s) => s.id !== id)];
      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }

    return newConv;
  }

  async update(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Conversation ${id} not found.`);
    }

    const updatedConv: Conversation = {
      ...existing,
      ...updates,
      projectId: updates.projectId !== undefined ? updates.projectId : existing.projectId,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`${KEYS.CONVERSATION_PREFIX}${id}`, JSON.stringify(updatedConv));

      // Update summary index
      const summaries = await this.list();
      const nextSummaries = summaries.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            title: updatedConv.title,
            modelId: updatedConv.modelId,
            modelName: updatedConv.modelName,
            messageCount: updatedConv.messages.length,
            pinned: updatedConv.pinned,
            projectId: updatedConv.projectId,
            updatedAt: 'Just now',
          };
        }
        return s;
      });

      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }

    return updatedConv;
  }

  async delete(id: string): Promise<void> {
    try {
      localStorage.removeItem(`${KEYS.CONVERSATION_PREFIX}${id}`);
      localStorage.removeItem(`${KEYS.DRAFT_PREFIX}${id}`);

      const summaries = await this.list();
      const nextSummaries = summaries.filter((s) => s.id !== id);
      localStorage.setItem(KEYS.INDEX, JSON.stringify(nextSummaries));
    } catch {
      // Ignore
    }
  }

  async appendMessage(conversationId: string, message: Message): Promise<Conversation> {
    const conv = await this.get(conversationId);
    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // If first user message, generate title from content if title is still default
    let title = conv.title;
    if (conv.title === 'New Conversation' && message.role === 'user') {
      const firstTextPart = message.parts.find((p) => p.type === 'text');
      if (firstTextPart && firstTextPart.content.trim()) {
        title =
          firstTextPart.content.trim().slice(0, 48) +
          (firstTextPart.content.trim().length > 48 ? '...' : '');
      }
    }

    const updatedMessages = [...conv.messages.filter((m) => m.id !== message.id), message];
    return this.update(conversationId, {
      title,
      messages: updatedMessages,
    });
  }

  async updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>
  ): Promise<Conversation> {
    const conv = await this.get(conversationId);
    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const updatedMessages = conv.messages.map((m) => {
      if (m.id === messageId) {
        return {
          ...m,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    return this.update(conversationId, { messages: updatedMessages });
  }

  async truncateDownstreamMessages(
    conversationId: string,
    targetMessageId: string
  ): Promise<Conversation> {
    const conv = await this.get(conversationId);
    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const targetIdx = conv.messages.findIndex((m) => m.id === targetMessageId);
    if (targetIdx === -1) {
      return conv;
    }

    // Keep messages up to targetIdx (inclusive)
    const truncatedMessages = conv.messages.slice(0, targetIdx + 1);
    return this.update(conversationId, { messages: truncatedMessages });
  }

  async saveDraft(conversationId: string, draft: string): Promise<void> {
    // Clear any existing debounce timer for this conversation
    const existingTimer = this.draftDebounceTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce write by 250ms to keep UI snappy
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        try {
          if (draft.trim()) {
            localStorage.setItem(`${KEYS.DRAFT_PREFIX}${conversationId}`, draft);
          } else {
            localStorage.removeItem(`${KEYS.DRAFT_PREFIX}${conversationId}`);
          }
        } catch {
          // Ignore
        }
        this.draftDebounceTimers.delete(conversationId);
        resolve();
      }, 250) as unknown as number;

      this.draftDebounceTimers.set(conversationId, timer);
    });
  }

  async getDraft(conversationId: string): Promise<string> {
    try {
      return localStorage.getItem(`${KEYS.DRAFT_PREFIX}${conversationId}`) || '';
    } catch {
      return '';
    }
  }
}

// Singleton conversation store instance
export const conversationStore = new LocalStorageConversationStore();
