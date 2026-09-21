import {
  GenerationRequest,
  GenerationEvent,
  Message,
  ProviderHealth,
} from '@nikit/types';
import { AIProvider } from './AIProvider';

/**
 * Helper to split text into incremental text chunks of varying size
 * to ensure streaming is chunk-based and not token-dependent.
 */
function createTextChunks(fullText: string): string[] {
  const words = fullText.split(' ');
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    // Variable chunk sizes between 1 and 4 words
    const chunkSize = Math.min(words.length - i, 1 + Math.floor(Math.random() * 4));
    const slice = words.slice(i, i + chunkSize);
    const chunkText = (i === 0 ? '' : ' ') + slice.join(' ');
    chunks.push(chunkText);
    i += chunkSize;
  }

  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateSimulatedResponse(prompt: string, modelId: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('attention') || p.includes('zaqx') || p.includes('layer') || p.includes('transformer')) {
    return `### Architectural Breakdown: Multi-Head Latent Attention

In modern LLM designs (such as our planned **ZaqX 1.0** architecture), Multi-Head Latent Attention compresses Key and Value projections into a shared low-rank subspace before caching.

Key architectural characteristics:
1. **Low-Rank Latent KV Compression**: Compresses standard high-dimensional KV tensors into a compact latent vector $\\mathbf{c}_{kv}$.
2. **Reduced KV Cache Memory Footprint**: Decreases memory bandwidth requirements during batch autoregressive decoding by up to 70%.
3. **Decoupled Positional Embeddings**: Maintains RoPE representations along separate query and key projection paths.

\`\`\`python
# zaqx_latent_attention.py
import torch
import torch.nn as nn
import torch.nn.functional as F

class LatentAttentionCore(nn.Module):
    def __init__(self, hidden_dim: int, num_heads: int, latent_dim: int):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = hidden_dim // num_heads
        self.latent_dim = latent_dim
        
        # Projections
        self.q_proj = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.kv_latent_proj = nn.Linear(hidden_dim, latent_dim, bias=False)
        self.kv_decomp = nn.Linear(latent_dim, 2 * hidden_dim, bias=False)
        self.out_proj = nn.Linear(hidden_dim, hidden_dim, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, s, _ = x.shape
        q = self.q_proj(x).view(b, s, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Compress and decompress latent KV
        latent_kv = self.kv_latent_proj(x)
        kv = self.kv_decomp(latent_kv)
        k, v = torch.chunk(kv, 2, dim=-1)
        
        k = k.view(b, s, self.num_heads, self.head_dim).transpose(1, 2)
        v = v.view(b, s, self.num_heads, self.head_dim).transpose(1, 2)
        
        # Scaled dot-product attention
        scores = torch.matmul(q, k.transpose(-2, -1)) / (self.head_dim ** 0.5)
        attn = F.softmax(scores, dim=-1)
        out = torch.matmul(attn, v).transpose(1, 2).contiguous().view(b, s, -1)
        return self.out_proj(out)
\`\`\`

During subsequent inference steps, the cache only stores the compressed \`latent_kv\` tensor rather than full dimensional multi-head Key-Value states.`;
  }

  if (p.includes('code') || p.includes('function') || p.includes('typescript') || p.includes('react') || p.includes('rust')) {
    return `Here is a clean implementation tailored for your requirement:

\`\`\`typescript
// asyncEventPipeline.ts
export interface EventEnvelope<T> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
}

export class AsyncStreamPipeline<T> {
  private queue: EventEnvelope<T>[] = [];
  private listeners: ((event: EventEnvelope<T>) => void)[] = [];

  public emit(topic: string, payload: T): void {
    const envelope: EventEnvelope<T> = {
      id: crypto.randomUUID(),
      topic,
      payload,
      timestamp: Date.now(),
    };
    this.queue.push(envelope);
    this.listeners.forEach((fn) => fn(envelope));
  }

  public subscribe(handler: (event: EventEnvelope<T>) => void): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }
}
\`\`\`

### Key Features:
- **Strictly Typed Envelopes**: Guarantees typed payload delivery.
- **Unsubscribe Cleanup**: Returned cleanup closure removes active subscriptions immediately.
- **Microsecond Timestamping**: Ensures deterministic sequential ordering.`;
  }

  return `I have processed your request for: "${prompt}".

### Overview
This response is streamed through Nikit's **Phase 3 Provider-Neutral Streaming Engine**. The engine uses chunk-based incremental delta aggregation, full abort signal support, and structured markdown message parts.

### What happens next?
- **Streaming Pipeline**: Chunks arrive progressively and assemble into rich message parts.
- **Cancellation**: You can click the Stop button at any moment to cancel without losing partial generated text.
- **Regeneration**: If you want a different response, use the Regenerate button on this message.
- **Editing**: You can edit your prompt at any time to branch the conversation deterministically.

*(Note: Active Model is \`${modelId}\`. All generated text is delivered via the development Mock Provider).*`;
}

export class MockProvider implements AIProvider {
  readonly id = 'mock-provider';
  readonly name = 'Mock Streaming Provider';
  readonly type = 'mock' as const;
  readonly isSimulated = true;

  async healthCheck(): Promise<ProviderHealth> {
    return {
      providerId: this.id,
      status: 'healthy',
      checkedAt: new Date().toISOString(),
      latencyMs: 1,
      message: 'Development Mock Provider Ready',
    };
  }

  async *generate(request: GenerationRequest): AsyncIterable<GenerationEvent> {
    const lastUserMessage: Message | undefined = [...request.messages]
      .reverse()
      .find((m) => m.role === 'user');

    const prompt =
      lastUserMessage?.parts.find((p) => p.type === 'text')?.content || 'Hello Nikit';
    const messageId = `msg-resp-${Date.now()}`;

    // 1. Started Event
    yield {
      type: 'started',
      messageId,
      modelId: request.modelId,
    };

    // Test error simulation trigger if prompt contains [trigger-error]
    if (prompt.includes('[trigger-error]')) {
      await delay(100);
      yield {
        type: 'error',
        messageId,
        error: {
          message: 'Simulated provider connection timeout or execution failure.',
          code: 'ERR_SIMULATED_PROVIDER_FAULT',
          details: 'Demonstration of error recovery and retry flow in Phase 3 conversation engine.',
          retryable: true,
        },
      };
      return;
    }

    const fullResponse = generateSimulatedResponse(prompt, request.modelId);
    const chunks = createTextChunks(fullResponse);
    let accumulated = '';

    // 2. Incremental Delta Stream (Chunk-based, not token-dependent)
    for (let i = 0; i < chunks.length; i++) {
      if (request.abortSignal?.aborted) {
        // Yield cancelled event and exit cleanly
        yield {
          type: 'cancelled',
          messageId,
          partialContent: accumulated,
        };
        return;
      }

      const chunk = chunks[i];
      accumulated += chunk;

      yield {
        type: 'delta',
        messageId,
        textDelta: chunk,
      };

      // Realistic cadence: 25-45ms delay per chunk
      await delay(25 + Math.floor(Math.random() * 20));
    }

    // Check once more for cancellation before completing
    if (request.abortSignal?.aborted) {
      yield {
        type: 'cancelled',
        messageId,
        partialContent: accumulated,
      };
      return;
    }

    // 3. Completed Event
    yield {
      type: 'completed',
      messageId,
      finalContent: accumulated,
      telemetry: {
        isPrototypeData: true,
      },
    };
  }
}

export const defaultMockProvider = new MockProvider();
