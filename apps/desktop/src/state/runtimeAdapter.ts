import { LocalRuntimeInfo, AIModel, ModelTelemetry } from '@nikit/types';

/**
 * Default Local Runtime Info.
 * All hardware values are initially 'Unknown' / 'Not connected' until a real
 * runtime detection adapter (e.g. Tauri IPC / Ollama / sysinfo) detects actual hardware.
 */
export const DEFAULT_RUNTIME_INFO: LocalRuntimeInfo = {
  status: 'not_connected',
  engineName: 'Not connected',
  deviceType: 'unknown',
  gpuName: 'Unknown',
  vramTotalGb: null,
  vramUsedGb: null,
  ramTotalGb: null,
  ramUsedGb: null,
  cudaStatus: 'unknown',
  cudaVersion: null,
  driverVersion: null,
  isRealHardwareDetected: false,
  lastCheckedAt: null,
};

/**
 * Initial registered models matching the central ModelRegistry.
 * ZaqX 1.0 is explicitly documented as a future model in planning/pre-training.
 * Development Mock Model is available for local streaming testing.
 * No fake open-source models (e.g. Llama 3) are seeded without a connected runtime.
 */
export const INITIAL_MODELS: AIModel[] = [
  {
    id: 'mock-dev',
    name: 'Mock Development Model',
    family: 'NikitMock',
    version: '1.0.0',
    providerId: 'mock',
    provider: 'mock',
    description:
      'Local development mock model providing progressive streaming, cancellation, and error simulation.',
    capabilities: ['chat', 'streaming', 'code', 'local'],
    local: true,
    prototype: true,
    streaming: true,
    runtimeId: 'runtime-mock-01',
    runtimeEngine: 'Mock Runtime',
    specification: {
      parameterCount: 'Development Mock',
      contextLength: '8,192 tokens',
      precision: 'Simulated',
      quantization: 'None',
      estimatedVram: '0 GB',
      status: 'ready',
      isPrototype: true,
    },
  },
  {
    id: 'zaqx-1.0',
    name: 'ZaqX 1.0 (Prototype)',
    family: 'ZaqX',
    version: '1.0 (Design Phase)',
    providerId: 'zaqx',
    provider: 'zaqx',
    description:
      'Proprietary future architecture in pre-training design. Hardware and performance specifications are prototype placeholders.',
    capabilities: ['chat', 'code', 'reasoning', 'streaming', 'local'],
    local: true,
    prototype: true,
    streaming: true,
    runtimeId: 'runtime-zaqx',
    runtimeEngine: 'Not connected (Awaiting Runtime)',
    specification: {
      parameterCount: 'Design Phase (TBD)',
      contextLength: 'Target: 32K (Unverified)',
      precision: 'Target: FP16 (Unset)',
      quantization: 'Unset',
      estimatedVram: 'TBD (Untrained)',
      status: 'prototype_placeholder',
      isPrototype: true,
    },
  },
];

/**
 * Formatting helper for VRAM display.
 */
export function formatVramDisplay(info: LocalRuntimeInfo): string {
  if (!info.isRealHardwareDetected || info.vramTotalGb === null) {
    return 'Unknown';
  }
  if (info.vramUsedGb !== null) {
    const pct = Math.round((info.vramUsedGb / info.vramTotalGb) * 100);
    return `${info.vramUsedGb.toFixed(1)} GB / ${info.vramTotalGb.toFixed(1)} GB (${pct}%)`;
  }
  return `${info.vramTotalGb.toFixed(1)} GB Total`;
}

/**
 * Formatting helper for System RAM display.
 */
export function formatRamDisplay(info: LocalRuntimeInfo): string {
  if (!info.isRealHardwareDetected || info.ramTotalGb === null) {
    return 'Unknown';
  }
  if (info.ramUsedGb !== null) {
    return `${info.ramUsedGb.toFixed(1)} GB / ${info.ramTotalGb.toFixed(1)} GB`;
  }
  return `${info.ramTotalGb.toFixed(1)} GB Total`;
}

/**
 * Formatting helper for Telemetry metrics tag.
 */
export function formatTelemetryBadge(telemetry?: ModelTelemetry | null): string | null {
  if (!telemetry) return null;
  if (telemetry.isPrototypeData) {
    return 'Demo Telemetry (Prototype)';
  }
  const parts: string[] = [];
  if (telemetry.tokensPerSecond) parts.push(`${telemetry.tokensPerSecond.toFixed(1)} tok/s`);
  if (telemetry.timeToFirstTokenMs) parts.push(`${telemetry.timeToFirstTokenMs}ms TTFT`);
  if (telemetry.vramUsedMb) parts.push(`${(telemetry.vramUsedMb / 1024).toFixed(1)} GB VRAM`);
  return parts.length > 0 ? parts.join(' · ') : null;
}
