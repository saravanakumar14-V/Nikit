import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { ModelDiscoveryService } from '../services/runtimes/llamacpp/ModelDiscoveryService';
import { ModelRuntimeService } from '../services/models/ModelRuntime';

describe('ModelDiscoveryService & Dynamic GGUF Registration', () => {
  let registry: ModelRegistry;
  let discoveryService: ModelDiscoveryService;

  beforeEach(() => {
    const runtime = new ModelRuntimeService();
    registry = new ModelRegistry(runtime);
    discoveryService = new ModelDiscoveryService(registry);
  });

  function createMockGgufBuffer(): ArrayBuffer {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);
    view.setUint8(0, 0x47);
    view.setUint8(1, 0x47);
    view.setUint8(2, 0x55);
    view.setUint8(3, 0x46);
    view.setUint32(4, 3, true);
    return buffer;
  }

  it('discovers and dynamically registers a GGUF model into ModelRegistry', async () => {
    const buffer = createMockGgufBuffer();
    const model = await discoveryService.registerGgufFile(
      'models/qwen2.5-0.5b-instruct-q4_k_m.gguf',
      buffer
    );

    expect(model.id).toBe('gguf-qwen2-5-0-5b-instruct-q4_k_m');
    expect(model.providerId).toBe('llamacpp');
    expect(model.local).toBe(true);
    expect(model.prototype).toBe(false);

    const fromRegistry = registry.get('gguf-qwen2-5-0-5b-instruct-q4_k_m');
    expect(fromRegistry).not.toBeNull();
    expect(fromRegistry?.name).toContain('Qwen2');
  });

  it('unregisters GGUF models cleanly without affecting other models', async () => {
    const buffer = createMockGgufBuffer();
    const model = await discoveryService.registerGgufFile('models/test-model.gguf', buffer);

    expect(registry.get(model.id)).not.toBeNull();

    discoveryService.unregisterGgufModel(model.id);
    expect(registry.get(model.id)).toBeNull();

    // Default mock model remains intact
    expect(registry.get('mock-dev')).not.toBeNull();
  });
});
