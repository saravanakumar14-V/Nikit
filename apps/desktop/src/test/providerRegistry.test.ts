import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistryService } from '../services/providers/ProviderRegistry';
import { AIProvider } from '../services/providers/AIProvider';
import { GenerationRequest, GenerationEvent, ProviderHealth } from '@nikit/types';

describe('ProviderRegistry & Cached Health Checks', () => {
  let registry: ProviderRegistryService;

  beforeEach(() => {
    registry = new ProviderRegistryService();
  });

  const customProvider: AIProvider = {
    id: 'test-local-provider',
    name: 'Custom Local Provider',
    type: 'local',
    isSimulated: false,
    async healthCheck(): Promise<ProviderHealth> {
      return {
        providerId: 'test-local-provider',
        status: 'healthy',
        latencyMs: 5,
        message: 'Local Engine Healthy',
      };
    },
    async *generate(_request: GenerationRequest): AsyncIterable<GenerationEvent> {
      yield { type: 'started', messageId: 'msg-1', modelId: 'test-model' };
    },
  };

  it('registers and retrieves providers', () => {
    registry.register(customProvider);
    expect(registry.get('test-local-provider')).toBe(customProvider);
    expect(registry.list().some((p) => p.id === 'test-local-provider')).toBe(true);
  });

  it('INVARIANT: Reads cached provider health with 0ms blocking latency', () => {
    registry.register(customProvider);

    // Immediate synchronous access to cached health
    const health = registry.getCachedHealth('test-local-provider');
    expect(health.status).toBe('healthy');
    expect(health.providerId).toBe('test-local-provider');
  });

  it('executes async health checks and updates cached state', async () => {
    registry.register(customProvider);

    const updatedHealth = await registry.healthCheck('test-local-provider');
    expect(updatedHealth.status).toBe('healthy');
    expect(updatedHealth.latencyMs).toBe(5);

    const cached = registry.getCachedHealth('test-local-provider');
    expect(cached.latencyMs).toBe(5);
  });

  it('returns unavailable status for unconfigured stub providers without throwing', () => {
    const zaqxHealth = registry.getCachedHealth('zaqx');
    expect(zaqxHealth.status).toBe('unavailable');

    const ollamaHealth = registry.getCachedHealth('ollama');
    expect(ollamaHealth.status).toBe('unavailable');
  });
});
