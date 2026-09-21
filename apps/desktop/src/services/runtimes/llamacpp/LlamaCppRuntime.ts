import { RuntimeStatus, RuntimeType, ModelStatus, GenerationRequest, GenerationEvent } from '@nikit/types';
import { IRuntimeAdapter, modelRuntimeService } from '../../models/ModelRuntime';
import { LlamaCppProcess, llamaCppProcess } from './LlamaCppProcess';
import { LlamaCppProtocol } from './LlamaCppProtocol';
import { hardwareDetectionService } from './HardwareDetectionService';
import { LlamaServerConfig } from './types';

export class LlamaCppRuntime implements IRuntimeAdapter {
  readonly id = 'runtime-llamacpp';
  readonly type: RuntimeType = 'llamacpp';

  private status: RuntimeStatus = 'not_connected';
  private process: LlamaCppProcess;
  private currentModelId: string | null = null;
  private currentModelPath: string | null = null;
  private isGenerating = false;

  constructor(processInst: LlamaCppProcess = llamaCppProcess) {
    this.process = processInst;
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  getCurrentModelId(): string | null {
    return this.currentModelId;
  }

  getBaseUrl(): string | null {
    return this.process.getActiveServer()?.baseUrl || null;
  }

  /**
   * Loads a local GGUF model by starting the llama-server and confirming readiness.
   */
  async loadModel(
    modelId: string,
    modelPath?: string,
    config?: Partial<LlamaServerConfig>
  ): Promise<void> {
    if (this.isGenerating) {
      throw new Error('Cannot load or switch model while inference generation is active.');
    }

    // 1. Unload any existing model first (single active model invariant)
    if (this.currentModelId && this.currentModelId !== modelId) {
      await this.unloadModel(this.currentModelId);
    }

    this.setStatus('initializing', modelId);

    // 2. Discover / validate executable
    const execInfo = await this.process.findExecutable();
    const executablePath = config?.executablePath || execInfo.path;

    const resolvedModelPath = modelPath || config?.modelPath || this.currentModelPath;
    if (!resolvedModelPath) {
      this.setStatus('error', modelId, 'Model file path is required to start llama.cpp server.');
      throw new Error('Model file path is required to start llama.cpp server.');
    }

    this.setStatus('loading', modelId);

    try {
      // 3. Start server process
      const serverInfo = await this.process.start({
        executablePath,
        modelPath: resolvedModelPath,
        port: config?.port,
        contextSize: config?.contextSize || 2048,
        gpuLayers: config?.gpuLayers || 0,
        threads: config?.threads || 4,
      });

      // 4. Wait for /health readiness check
      await this.process.waitForReadiness(serverInfo.baseUrl);

      this.currentModelId = modelId;
      this.currentModelPath = resolvedModelPath;
      this.setStatus('ready', modelId);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setStatus('error', modelId, errorMsg);
      throw err;
    }
  }

  /**
   * Unloads model and cleanly shuts down the llama-server process.
   */
  async unloadModel(modelId: string): Promise<void> {
    this.setStatus('stopped', modelId);
    await this.process.stop();
    this.currentModelId = null;
    this.currentModelPath = null;
    this.setStatus('available', modelId);
  }

  /**
   * Generates streaming text events with single-active-generation constraint.
   */
  async *generate(request: GenerationRequest): AsyncIterable<GenerationEvent> {
    if (this.isGenerating) {
      yield {
        type: 'error',
        messageId: `msg-err-${Date.now()}`,
        error: {
          code: 'CONCURRENT_GENERATION_ERROR',
          message: 'Inference generation already in progress. Nikit allows one active generation at a time.',
        },
      };
      return;
    }

    const activeServer = this.process.getActiveServer();
    if (!activeServer || this.status !== 'ready') {
      yield {
        type: 'error',
        messageId: `msg-err-${Date.now()}`,
        error: {
          code: 'RUNTIME_NOT_READY',
          message: 'llama.cpp runtime is not ready. Please activate and load a local model.',
        },
      };
      return;
    }

    this.isGenerating = true;
    this.setStatus('busy', request.modelId);

    try {
      const stream = LlamaCppProtocol.streamChat(activeServer.baseUrl, request);
      for await (const event of stream) {
        yield event;
      }
    } finally {
      this.isGenerating = false;
      this.setStatus('ready', request.modelId);
    }
  }

  async inspect(_modelId: string): Promise<Record<string, unknown>> {
    const hw = await hardwareDetectionService.detectHardware();
    const server = this.process.getActiveServer();

    return {
      runtime: 'llama.cpp Server',
      status: this.status,
      activeModelId: this.currentModelId,
      modelPath: this.currentModelPath,
      serverHost: server?.host || '127.0.0.1',
      serverPort: server?.port || null,
      serverPid: server?.pid || null,
      detectedGpu: hw.gpuName || 'Unknown',
      vramMb: hw.vramTotalMb || 'Unknown',
      cudaAvailable: hw.cudaAvailable,
      backend: hw.backend,
    };
  }

  private setStatus(status: RuntimeStatus, modelId: string, error?: string): void {
    this.status = status;
    const modelStatus: ModelStatus =
      status === 'ready'
        ? 'ready'
        : status === 'busy'
        ? 'busy'
        : status === 'loading' || status === 'initializing'
        ? 'loading'
        : status === 'error'
        ? 'error'
        : 'unavailable';

    modelRuntimeService.setRuntimeState(modelId, {
      modelId,
      status: modelStatus,
      loaded: status === 'ready' || status === 'busy',
      runtimeId: this.id,
      lastError: error,
    });
  }
}

export const llamaCppRuntime = new LlamaCppRuntime();
