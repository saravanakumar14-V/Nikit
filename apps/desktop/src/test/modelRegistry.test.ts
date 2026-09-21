import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry } from '../services/models/ModelRegistry';
import { ModelRuntimeService } from '../services/models/ModelRuntime';
import { AIModel } from '@nikit/types';

describe('ModelRegistry & Capability Indexing', () => {
  let runtimeService: ModelRuntimeService;
  let registry: ModelRegistry;

  beforeEach(() => {
    runtimeService = new ModelRuntimeService();
    registry = new ModelRegistry(runtimeService);
  });

  const customModel: AIModel = {
    id: 'test-custom-1',
    name: 'Custom Vision Model',
    family: 'CustomFamily',
    version: '1.0.0',
    providerId: 'mock',
    capabilities: ['chat', 'vision', 'streaming'],
    local: true,
    prototype: false,
    architecture: 'Transformer-Vision',
  };

  it('registers, retrieves, and unregisters models cleanly', () => {
    registry.register(customModel, 'ready');

    const retrieved = registry.get('test-custom-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Custom Vision Model');
    expect(retrieved?.architecture).toBe('Transformer-Vision');

    const state = registry.getRuntimeState('test-custom-1');
    expect(state?.status).toBe('ready');
    expect(state?.loaded).toBe(true);

    registry.unregister('test-custom-1');
    expect(registry.get('test-custom-1')).toBeNull();
    expect(registry.getRuntimeState('test-custom-1')?.status).toBe('unavailable');
  });

  it('filters models by capability (e.g. vision, streaming)', () => {
    registry.register(customModel, 'ready');

    const visionModels = registry.listByCapability('vision');
    expect(visionModels.some((m) => m.id === 'test-custom-1')).toBe(true);
    expect(visionModels.some((m) => m.id === 'mock-dev')).toBe(false);

    const streamingModels = registry.listByCapability('streaming');
    expect(streamingModels.length).toBeGreaterThanOrEqual(2);
  });

  it('finds models by complex criteria (capability, search query, provider)', () => {
    registry.register(customModel, 'ready');

    const found = registry.find({
      capability: 'vision',
      search: 'Custom Vision',
      providerId: 'mock',
    });

    expect(found.length).toBe(1);
    expect(found[0].id).toBe('test-custom-1');
  });

  it('INVARIANT: Declared model metadata is separated from ephemeral runtime state', () => {
    registry.register(customModel, 'ready');

    // Mutate runtime state
    registry.setRuntimeState('test-custom-1', {
      status: 'busy',
      hardwareState: 'Allocating VRAM',
    });

    // Verify declared metadata remains unmodified
    const model = registry.get('test-custom-1');
    expect(model?.name).toBe('Custom Vision Model');
    expect(model?.architecture).toBe('Transformer-Vision');

    // Verify runtime state holds mutable state
    const state = registry.getRuntimeState('test-custom-1');
    expect(state?.status).toBe('busy');
    expect(state?.hardwareState).toBe('Allocating VRAM');
  });
});
