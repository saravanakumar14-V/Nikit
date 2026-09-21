import { describe, it, expect, vi, afterEach } from 'vitest';
import { LlamaCppProtocol } from '../services/runtimes/llamacpp/LlamaCppProtocol';
import { GenerationRequest, GenerationEvent } from '@nikit/types';

describe('LlamaCppProtocol SSE Stream Parser', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function createMockSseResponse(sseEvents: string[]): Response {
    const stream = new ReadableStream({
      start(controller) {
        for (const event of sseEvents) {
          controller.enqueue(new TextEncoder().encode(event));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  it('parses SSE stream deltas and emits standard GenerationEvents', async () => {
    const sseLines = [
      'data: {"id":"chat-1","choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":" Nikit"}}]}\n\n',
      'data: {"id":"chat-1","choices":[{"delta":{"content":"!"}}],"usage":{"prompt_tokens":10,"completion_tokens":3}}\n\n',
      'data: [DONE]\n\n',
    ];

    globalThis.fetch = vi.fn().mockResolvedValue(createMockSseResponse(sseLines));

    const request: GenerationRequest = {
      conversationId: 'conv-1',
      modelId: 'gguf-qwen',
      messages: [{ id: 'm1', conversationId: 'conv-1', role: 'user', parts: [{ type: 'text', content: 'Hi' }], createdAt: '', updatedAt: '', status: 'completed' }],
    };

    const events: GenerationEvent[] = [];
    for await (const event of LlamaCppProtocol.streamChat('http://127.0.0.1:8080', request)) {
      events.push(event);
    }

    expect(events.length).toBe(5); // started, 3 deltas, completed
    expect(events[0].type).toBe('started');
    expect(events[1].type).toBe('delta');
    if (events[1].type === 'delta') expect(events[1].textDelta).toBe('Hello');
    if (events[2].type === 'delta') expect(events[2].textDelta).toBe(' Nikit');
    if (events[3].type === 'delta') expect(events[3].textDelta).toBe('!');

    const completed = events[4];
    expect(completed.type).toBe('completed');
    if (completed.type === 'completed') {
      expect(completed.finalContent).toBe('Hello Nikit!');
      expect(completed.telemetry?.completionTokens).toBe(3);
      expect(completed.telemetry?.promptTokens).toBe(10);
    }
  });

  it('handles request cancellation via AbortSignal cleanly', async () => {
    const abortController = new AbortController();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"id":"chat-1","choices":[{"delta":{"content":"Partial"}}]}\n\n'
          )
        );
        // Abort right after first delta
        abortController.abort();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));

    const request: GenerationRequest = {
      conversationId: 'conv-1',
      modelId: 'gguf-qwen',
      messages: [{ id: 'm1', conversationId: 'conv-1', role: 'user', parts: [{ type: 'text', content: 'Hi' }], createdAt: '', updatedAt: '', status: 'completed' }],
      abortSignal: abortController.signal,
    };

    const events: GenerationEvent[] = [];
    for await (const event of LlamaCppProtocol.streamChat('http://127.0.0.1:8080', request)) {
      events.push(event);
    }

    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('cancelled');
  });

  it('handles HTTP error responses gracefully without crashing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    const request: GenerationRequest = {
      conversationId: 'conv-1',
      modelId: 'gguf-qwen',
      messages: [{ id: 'm1', conversationId: 'conv-1', role: 'user', parts: [{ type: 'text', content: 'Hi' }], createdAt: '', updatedAt: '', status: 'completed' }],
    };

    const events: GenerationEvent[] = [];
    for await (const event of LlamaCppProtocol.streamChat('http://127.0.0.1:8080', request)) {
      events.push(event);
    }

    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('error');
    if (lastEvent.type === 'error') {
      expect(lastEvent.error?.code).toBe('LLAMACPP_STREAM_ERROR');
    }
  });
});
