import {
  LlamaServerConfig,
  LlamaServerInfo,
  LlamaServerStatus,
  LlamaServerHealth,
} from './types';

export class LlamaCppProcess {
  private activeServer: LlamaServerInfo | null = null;
  private customExecutablePath: string | null = null;

  setCustomExecutablePath(path: string | null): void {
    this.customExecutablePath = path;
  }

  async findExecutable(): Promise<{ path: string; exists: boolean; isValid: boolean; version?: string }> {
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke('find_llama_executable', {
          customPath: this.customExecutablePath,
        });
      } catch {
        // Fall back
      }
    }

    return {
      path: this.customExecutablePath || 'llama-server.exe',
      exists: false,
      isValid: false,
      version: undefined,
    };
  }

  async start(config: LlamaServerConfig): Promise<LlamaServerInfo> {
    // 1. Stop any running instance
    await this.stop();

    // 2. Start native process
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      const { invoke } = await import('@tauri-apps/api/core');
      const startResult = await invoke<LlamaServerInfo>('start_llama_server', {
        executablePath: config.executablePath,
        modelPath: config.modelPath,
        port: config.port,
        ctxSize: config.contextSize || 2048,
        nGpuLayers: config.gpuLayers || 0,
        threads: config.threads || 4,
      });

      this.activeServer = startResult;
      return startResult;
    }

    // In non-Tauri / test environments, create mock server descriptor
    const mockInfo: LlamaServerInfo = {
      pid: 12345,
      host: '127.0.0.1',
      port: config.port || 8080,
      baseUrl: `http://127.0.0.1:${config.port || 8080}`,
      modelPath: config.modelPath,
    };
    this.activeServer = mockInfo;
    return mockInfo;
  }

  async stop(): Promise<void> {
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('stop_llama_server');
      } catch {
        // Ignore errors during stop
      }
    }
    this.activeServer = null;
  }

  async getStatus(): Promise<LlamaServerStatus> {
    if (typeof window !== 'undefined' && (window as unknown as { __TAURI__?: unknown }).__TAURI__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<LlamaServerStatus>('get_llama_server_status');
      } catch {
        // Fall back
      }
    }

    if (this.activeServer) {
      return {
        running: true,
        pid: this.activeServer.pid,
        host: this.activeServer.host,
        port: this.activeServer.port,
        baseUrl: this.activeServer.baseUrl,
        modelPath: this.activeServer.modelPath,
      };
    }

    return { running: false };
  }

  /**
   * Polls the server until readiness is confirmed or timeout expires.
   */
  async waitForReadiness(baseUrl: string, timeoutMs = 15000): Promise<LlamaServerHealth> {
    const startTime = Date.now();
    const intervalMs = 250;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
        if (res.ok) {
          const data = await res.json().catch(() => ({ status: 'ok' }));
          return {
            status: 'ready',
            slotsIdle: data.slots_idle,
            slotsProcessing: data.slots_processing,
            message: 'llama-server is ready and listening',
          };
        }
      } catch {
        // Connection refused while server is starting up - wait and retry
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(
      `llama-server failed to reach ready state within ${timeoutMs / 1000}s on ${baseUrl}`
    );
  }

  getActiveServer(): LlamaServerInfo | null {
    return this.activeServer;
  }
}

export const llamaCppProcess = new LlamaCppProcess();
