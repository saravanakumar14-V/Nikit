import { describe, it, expect } from 'vitest';
import { MockProvider } from '../services/providers/MockProvider';
import { GenerationRequest, GenerationEvent } from '@nikit/types';

describe('MockProvider & Streaming Pipeline', () => {
  const provider = new MockProvider();

  it('should stream response chunks progressively and complete', async () => {
    const request: GenerationRequest = {
      conversationId: 'test-conv',
      modelId: 'zaqx-1.0',
      messages: [
        {
          id: 'u-1',
          conversationId: 'test-conv',
          role: 'user',
          status: 'completed',
          parts: [{ type: 'text', content: 'Explain latent attention mechanics' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const events: GenerationEvent[] = [];
    let accumulatedText = '';

    for await (const event of provider.generate(request)) {
      events.push(event);
      if (event.type === 'delta') {
        accumulatedText += event.textDelta;
      }
    }

    expect(events.length).toBeGreaterThan(2);
    expect(events[0].type).toBe('started');
    expect(events[events.length - 1].type).toBe('completed');

    const completedEvent = events[events.length - 1];
    if (completedEvent.type === 'completed') {
      expect(completedEvent.finalContent).toBe(accumulatedText);
      expect(completedEvent.telemetry?.isPrototypeData).toBe(true);
    }
  }, 15000);

  it('should support AbortSignal cancellation and preserve partial text', async () => {
    const abortController = new AbortController();
    const request: GenerationRequest = {
      conversationId: 'test-conv',
      modelId: 'zaqx-1.0',
      messages: [
        {
          id: 'u-1',
          conversationId: 'test-conv',
          role: 'user',
          status: 'completed',
          parts: [{ type: 'text', content: 'Write a long transformer architectural breakdown' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      abortSignal: abortController.signal,
    };

    const events: GenerationEvent[] = [];
    let deltaCount = 0;

    for await (const event of provider.generate(request)) {
      events.push(event);
      if (event.type === 'delta') {
        deltaCount++;
        // Cancel after receiving 3 deltas
        if (deltaCount === 3) {
          abortController.abort();
        }
      }
    }

    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('cancelled');
    if (lastEvent.type === 'cancelled') {
      expect(lastEvent.partialContent).toBeDefined();
      expect(lastEvent.partialContent!.length).toBeGreaterThan(0);
    }
  });

  it('should emit error event on simulated fault trigger', async () => {
    const request: GenerationRequest = {
      conversationId: 'test-conv',
      modelId: 'zaqx-1.0',
      messages: [
        {
          id: 'u-1',
          conversationId: 'test-conv',
          role: 'user',
          status: 'completed',
          parts: [{ type: 'text', content: 'Test prompt with [trigger-error] simulated fault' }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    const events: GenerationEvent[] = [];
    for await (const event of provider.generate(request)) {
      events.push(event);
    }

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    if (errorEvent && errorEvent.type === 'error') {
      expect(errorEvent.error.code).toBe('ERR_SIMULATED_PROVIDER_FAULT');
      expect(errorEvent.error.retryable).toBe(true);
    }
  });
});
