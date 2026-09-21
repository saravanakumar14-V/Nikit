import { AIModel } from '@nikit/types';
import { GgufMetadata } from './types';
import { GgufInspector } from './GgufInspector';
import { modelRegistry, ModelRegistry } from '../../models/ModelRegistry';

export class ModelDiscoveryService {
  private registry: ModelRegistry;
  private discoveredModels: Map<string, GgufMetadata> = new Map();
  private modelDirectory = 'models';

  constructor(registry: ModelRegistry = modelRegistry) {
    this.registry = registry;
  }

  setModelDirectory(dir: string): void {
    this.modelDirectory = dir;
  }

  getModelDirectory(): string {
    return this.modelDirectory;
  }

  /**
   * Scans configured directories and registers all found GGUF models.
   */
  async scanDirectory(customDir?: string): Promise<AIModel[]> {
    const dir = customDir || this.modelDirectory;
    const registered: AIModel[] = [];

    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const filePaths = await invoke<string[]>('list_models_directory', {
          customDir: dir,
        });

        for (const filePath of filePaths) {
          try {
            const model = await this.registerGgufFile(filePath);
            registered.push(model);
          } catch {
            // Continue scanning other models
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return registered;
  }

  /**
   * Registers a single GGUF model file into ModelRegistry with inspected metadata.
   */
  async registerGgufFile(filePath: string, buffer?: ArrayBuffer): Promise<AIModel> {
    const metadata = await GgufInspector.inspect(filePath, buffer);
    this.discoveredModels.set(filePath, metadata);

    const slugId =
      'gguf-' +
      metadata.fileName
        .toLowerCase()
        .replace(/\.gguf$/i, '')
        .replace(/[^a-z0-9_-]/g, '-');

    const cleanName = this.formatDisplayName(metadata.fileName, metadata);

    const aiModel: AIModel = {
      id: slugId,
      name: cleanName,
      family: metadata.architecture || 'GGUF',
      version: metadata.version ? `GGUF v${metadata.version}` : '1.0.0',
      providerId: 'llamacpp',
      provider: 'llamacpp',
      description: `Local GGUF model: ${metadata.fileName} (${metadata.quantization || 'Q4_K_M'}).`,
      capabilities: ['chat', 'streaming', 'code', 'local'],
      local: true,
      prototype: false,
      streaming: true,
      runtimeId: 'runtime-llamacpp',
      runtimeEngine: 'llama.cpp Server',
      architecture: metadata.architecture || 'Transformer',
      parameterCount: metadata.parameterCountEstimate || 'Unknown',
      contextLength: metadata.contextLength || 2048,
      quantization: metadata.quantization || 'Q4_K_M',
      specification: {
        parameterCount: metadata.parameterCountEstimate || 'Unknown',
        contextLength: metadata.contextLength ? `${metadata.contextLength.toLocaleString()} tokens` : '2,048 tokens',
        precision: metadata.quantization || 'Q4_K_M',
        quantization: metadata.quantization || 'Q4_K_M',
        estimatedVram: metadata.fileSizeBytes > 0 ? `${(metadata.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : 'TBD',
        status: metadata.discoveryStatus === 'available' ? 'ready' : 'uninitialized',
        isPrototype: false,
      },
    };

    this.registry.register(aiModel, metadata.discoveryStatus === 'available' ? 'ready' : 'unavailable');
    return aiModel;
  }

  /**
   * Unregisters a GGUF model from the registry.
   */
  unregisterGgufModel(modelId: string): void {
    this.registry.unregister(modelId);
  }

  getDiscoveredMetadata(filePath: string): GgufMetadata | null {
    return this.discoveredModels.get(filePath) || null;
  }

  listDiscovered(): GgufMetadata[] {
    return Array.from(this.discoveredModels.values());
  }

  private formatDisplayName(fileName: string, metadata: GgufMetadata): string {
    const base = fileName.replace(/\.gguf$/i, '');
    const parts = base.split(/[-_.]/);
    const capitalized = parts
      .map((p) => (p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
      .filter(Boolean)
      .join(' ');

    if (metadata.quantization && !capitalized.includes(metadata.quantization)) {
      return `${capitalized} (${metadata.quantization})`;
    }
    return capitalized;
  }
}

export const modelDiscoveryService = new ModelDiscoveryService();
