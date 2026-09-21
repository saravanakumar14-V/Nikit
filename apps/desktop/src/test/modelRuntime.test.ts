import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRuntimeService, MockRuntimeAdapter } from '../services/models/ModelRuntime';
import { ModelLifecycleEvent } from '@nikit/types';

describe('ModelRuntime & Lifecycle Events', () => {
  let runtimeService: ModelRuntimeService;

  beforeEach(() => {
    runtimeService = new ModelRuntimeService();
  });

  it('manages runtime adapter registration and inspection', async () => {
    const adapter = new MockRuntimeAdapter();
    runtimeService.registerAdapter(adapter);

    const retrieved = runtimeService.getAdapter(adapter.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.type).toBe('mock');
    expect(retrieved?.getStatus()).toBe('ready');

    const info = await adapter.inspect('mock-dev');
    expect(info.hardwareDetected).toBe(false);
  });

  it('emits typed lifecycle events upon model state transitions', () => {
    const events: ModelLifecycleEvent[] = [];
    const unsubscribe = runtimeService.subscribe((e) => {
      events.push(e);
    });

    // 1. Transition: discovered -> loading
    runtimeService.setRuntimeState('test-model-1', {
      status: 'loading',
      runtimeId: 'runtime-mock-01',
    });

    // 2. Transition: loading -> ready
    runtimeService.setRuntimeState('test-model-1', {
      status: 'ready',
      loaded: true,
    });

    // 3. Transition: ready -> busy
    runtimeService.setRuntimeState('test-model-1', {
      status: 'busy',
    });

    // 4. Transition: busy -> ready
    runtimeService.setRuntimeState('test-model-1', {
      status: 'ready',
    });

    // 5. Transition: ready -> unavailable
    runtimeService.setRuntimeState('test-model-1', {
      status: 'unavailable',
      loaded: false,
    });

    expect(events.length).toBe(5);
    expect(events[0].type).toBe('model_loading');
    expect(events[1].type).toBe('model_ready');
    expect(events[2].type).toBe('model_busy');
    expect(events[3].type).toBe('model_ready');
    expect(events[4].type).toBe('model_unloaded');

    unsubscribe();

    // After unsubscribe, no further events received
    runtimeService.setRuntimeState('test-model-1', { status: 'error' });
    expect(events.length).toBe(5);
  });
});
