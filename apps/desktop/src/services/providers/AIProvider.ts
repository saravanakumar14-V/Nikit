import { GenerationRequest, GenerationEvent, ProviderType, ProviderHealth } from '@nikit/types';

/**
 * Provider-neutral Streaming Generation Contract.
 * Allows interchangeable inference engines (Mock, Ollama, llama.cpp, future ZaqX runtime).
 */
export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  readonly isSimulated: boolean;
  generate(request: GenerationRequest): AsyncIterable<GenerationEvent>;
  healthCheck(): Promise<ProviderHealth>;
}
