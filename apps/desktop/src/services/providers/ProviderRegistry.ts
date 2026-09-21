import { AIProvider } from './AIProvider';
import { defaultMockProvider } from './MockProvider';
import { llamaCppProvider } from '../runtimes/llamacpp/LlamaCppProvider';
import { ProviderHealth } from '@nikit/types';

export class ProviderRegistryService {
  private providers: Map<string, AIProvider> = new Map();
  private cachedHealth: Map<string, ProviderHealth> = new Map();

  constructor() {
    // 1. Register Mock Provider
    this.register(defaultMockProvider);

    // Also register alias 'mock'
    this.providers.set('mock', defaultMockProvider);
    this.cachedHealth.set('mock', {
      providerId: 'mock',
      status: 'healthy',
      checkedAt: new Date().toISOString(),
      latencyMs: 1,
      message: 'Development Mock Ready',
    });

    // 2. Register LlamaCpp Provider
    this.register(llamaCppProvider);

    // 3. Initialize Stub Placeholders for future providers (explicitly not connected)
    this.cachedHealth.set('zaqx', {
      providerId: 'zaqx',
      status: 'unavailable',
      checkedAt: new Date().toISOString(),
      message: 'ZaqX Runtime Not Connected (Prototype)',
    });

    this.cachedHealth.set('ollama', {
      providerId: 'ollama',
      status: 'unavailable',
      checkedAt: new Date().toISOString(),
      message: 'Ollama Runtime Not Configured',
    });
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
    this.cachedHealth.set(provider.id, {
      providerId: provider.id,
      status: 'healthy',
      checkedAt: new Date().toISOString(),
      message: `${provider.name} Registered`,
    });
  }

  unregister(providerId: string): void {
    this.providers.delete(providerId);
    this.cachedHealth.delete(providerId);
  }

  get(providerId: string): AIProvider | null {
    return this.providers.get(providerId) || null;
  }

  list(): AIProvider[] {
    return Array.from(new Set(this.providers.values()));
  }

  /**
   * Returns the cached provider health state without blocking on an async network or process check.
   */
  getCachedHealth(providerId: string): ProviderHealth {
    const cached = this.cachedHealth.get(providerId);
    if (cached) return cached;

    return {
      providerId,
      status: 'unknown',
      message: 'Provider health not yet evaluated',
    };
  }

  /**
   * Executes a fresh asynchronous health check for a provider and updates the cache.
   */
  async healthCheck(providerId: string): Promise<ProviderHealth> {
    const provider = this.get(providerId);
    if (!provider) {
      const health: ProviderHealth = {
        providerId,
        status: 'unavailable',
        checkedAt: new Date().toISOString(),
        message: 'Provider not registered',
      };
      this.cachedHealth.set(providerId, health);
      return health;
    }

    try {
      const health = await provider.healthCheck();
      this.cachedHealth.set(providerId, health);
      return health;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const health: ProviderHealth = {
        providerId,
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        message: errorMsg,
      };
      this.cachedHealth.set(providerId, health);
      return health;
    }
  }

  async healthCheckAll(): Promise<Map<string, ProviderHealth>> {
    for (const provider of this.list()) {
      await this.healthCheck(provider.id);
    }
    return new Map(this.cachedHealth);
  }

  getForModel(_modelId: string): AIProvider {
    // For backward-compatibility with Phase 3 until ModelService takes over completely
    return this.get('mock') || defaultMockProvider;
  }
}

export const providerRegistry = new ProviderRegistryService();
