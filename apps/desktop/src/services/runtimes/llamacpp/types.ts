export interface LlamaServerConfig {
  executablePath: string;
  modelPath: string;
  port?: number;
  contextSize?: number;
  gpuLayers?: number;
  threads?: number;
  host?: string; // strictly '127.0.0.1' by default
}

export interface LlamaServerInfo {
  pid: number;
  host: string;
  port: number;
  baseUrl: string;
  modelPath: string;
}

export interface LlamaServerStatus {
  running: boolean;
  pid?: number;
  host?: string;
  port?: number;
  baseUrl?: string;
  modelPath?: string;
}

export interface LlamaServerHealth {
  status: 'ready' | 'loading' | 'error' | 'stopped' | 'unavailable';
  model?: string;
  slotsIdle?: number;
  slotsProcessing?: number;
  message?: string;
}

export interface GgufMetadata {
  validGguf: boolean;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  version?: number;
  tensorCount?: number;
  kvCount?: number;
  architecture?: string;
  contextLength?: number;
  quantization?: string;
  parameterCountEstimate?: string;
  discoveryStatus: 'available' | 'invalid' | 'unsupported';
}

export interface HardwareMetrics {
  gpuName?: string;
  vramTotalMb?: number;
  vramFreeMb?: number;
  driverVersion?: string;
  cudaAvailable: boolean;
  cudaVersion?: string;
  totalRamMb?: number;
  freeRamMb?: number;
  cpuName?: string;
  cpuCores?: number;
  backend: 'cuda' | 'cpu' | 'unknown';
}

export type MemoryFeasibilityStatus =
  | 'likely_fit'
  | 'possibly_constrained'
  | 'likely_insufficient'
  | 'unknown';

export interface MemoryFeasibility {
  status: MemoryFeasibilityStatus;
  estimatedMemoryMb?: number;
  warning?: string;
  recommendedBackend: 'cuda' | 'cpu';
}

export interface LlamaCppTelemetryData {
  timeToFirstTokenMs?: number;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  tokensPerSecond?: number;
  contextUsageTokens?: number;
  backendUsed: 'cuda' | 'cpu' | 'unknown';
  modelLoadTimeMs?: number;
}
