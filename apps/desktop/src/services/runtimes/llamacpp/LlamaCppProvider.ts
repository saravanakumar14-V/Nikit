import { GenerationRequest, GenerationEvent, ProviderHealth, ProviderType } from '@nikit/types';
import { AIProvider } from '../../providers/AIProvider';
import { LlamaCppRuntime, llamaCppRuntime } from './LlamaCppRuntime';

export class LlamaCppProvider implements AIProvider {
  readonly id = 'llamacpp';
  readonly name = 'llama.cpp Local Runtime';
  readonly type: ProviderType = 'local';
  readonly isSimulated = false;

  private runtime: LlamaCppRuntime;

  constructor(runtimeInst: LlamaCppRuntime = llamaCppRuntime) {
    this.runtime = runtimeInst;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const status = this.runtime.getStatus();
    const isHealthy = status === 'ready' || status === 'available' || status === 'busy';

    return {
      providerId: this.id,
      status: isHealthy ? 'healthy' : 'unavailable',
      checkedAt: new Date().toISOString(),
      latencyMs: isHealthy ? 2 : undefined,
      message:
        status === 'ready'
          ? `llama.cpp Server Active (Model: ${this.runtime.getCurrentModelId() || 'Loaded'})`
          : status === 'busy'
          ? 'llama.cpp Server Processing Inference'
          : 'llama.cpp Server Disconnected / Not Started',
    };
  }

  async *generate(request: GenerationRequest): AsyncIterable<GenerationEvent> {
    const stream = this.runtime.generate(request);
    for await (const event of stream) {
      yield event;
    }
  }
}

export const llamaCppProvider = new LlamaCppProvider();
