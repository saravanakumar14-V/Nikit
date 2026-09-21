import {
  AIModel,
  LocalRuntimeInfo,
  ModelStatus,
} from '@nikit/types';

export type ApplicationSemanticStatus = 'READY' | 'DEGRADED' | 'ERROR';

export type RuntimeSemanticStatus =
  | 'ONLINE'
  | 'STANDBY'
  | 'DEV_SIMULATION'
  | 'ERROR'
  | 'OFFLINE';

export type ModelSemanticStatus =
  | 'LOADED'
  | 'DISCOVERED'
  | 'SPECIFICATION_ONLY'
  | 'SIMULATED_DEV_MODEL'
  | 'UNAVAILABLE';

export interface DerivedPlatformStatus {
  appStatus: ApplicationSemanticStatus;
  appStatusLabel: string;
  runtimeStatus: RuntimeSemanticStatus;
  runtimeStatusLabel: string;
  modelStatus: ModelSemanticStatus;
  modelStatusLabel: string;
  isHardwareOnline: boolean;
  hardwareSummary: string;
}

/**
 * Derives truthful platform status strictly from live state without hardcoding claims.
 */
export function derivePlatformStatus(params: {
  runtimeInfo: LocalRuntimeInfo;
  activeModel: AIModel;
  modelRuntimeStatus?: ModelStatus;
  isStorageHealthy?: boolean;
}): DerivedPlatformStatus {
  const {
    runtimeInfo,
    activeModel,
    modelRuntimeStatus,
    isStorageHealthy = true,
  } = params;

  // 1. Application Readiness
  let appStatus: ApplicationSemanticStatus = 'READY';
  let appStatusLabel = 'Production Engine · Ready';

  if (!isStorageHealthy) {
    appStatus = 'ERROR';
    appStatusLabel = 'Application Storage Fault';
  }

  // 2. Runtime Status
  let runtimeStatus: RuntimeSemanticStatus = 'OFFLINE';
  let runtimeStatusLabel = 'Local Runtime · Offline';
  let isHardwareOnline = false;

  const isLlamaServerRunning =
    runtimeInfo.status === 'connected' &&
    (runtimeInfo.engineName?.toLowerCase().includes('llama') || false);

  if (runtimeInfo.status === 'error') {
    runtimeStatus = 'ERROR';
    runtimeStatusLabel = 'Local Runtime · Error';
  } else if (isLlamaServerRunning && runtimeInfo.isRealHardwareDetected) {
    runtimeStatus = 'ONLINE';
    runtimeStatusLabel = 'Local Runtime · Online';
    isHardwareOnline = true;
  } else if (runtimeInfo.isRealHardwareDetected && runtimeInfo.status !== 'connected') {
    runtimeStatus = 'STANDBY';
    runtimeStatusLabel = 'Local Hardware · Standby';
  } else if (activeModel.providerId === 'mock' || activeModel.id === 'mock-dev') {
    runtimeStatus = 'DEV_SIMULATION';
    runtimeStatusLabel = 'Development Simulation · Active';
  } else if (runtimeInfo.status === 'initializing') {
    runtimeStatus = 'STANDBY';
    runtimeStatusLabel = 'Runtime · Initializing';
  } else {
    runtimeStatus = 'OFFLINE';
    runtimeStatusLabel = 'Local Runtime · Offline';
  }

  // 3. Model Status
  let modelStatus: ModelSemanticStatus = 'UNAVAILABLE';
  let modelStatusLabel = 'Model · Unavailable';

  const isZaqXSpec =
    activeModel.id.toLowerCase().includes('zaqx') ||
    activeModel.family?.toLowerCase() === 'zaqx';

  if (activeModel.id === 'mock-dev' || activeModel.providerId === 'mock') {
    modelStatus = 'SIMULATED_DEV_MODEL';
    modelStatusLabel = 'Simulated Dev Model';
  } else if (isZaqXSpec && (activeModel.prototype || activeModel.specification?.isPrototype)) {
    modelStatus = 'SPECIFICATION_ONLY';
    modelStatusLabel = 'Architecture Specification (Untrained)';
  } else if (modelRuntimeStatus === 'ready' || (isLlamaServerRunning && activeModel.providerId === 'llamacpp')) {
    modelStatus = 'LOADED';
    modelStatusLabel = 'Model · Loaded for Inference';
  } else if (modelRuntimeStatus === 'discovered' || activeModel.local) {
    modelStatus = 'DISCOVERED';
    modelStatusLabel = 'Model · Discovered (Unloaded)';
  } else {
    modelStatus = 'UNAVAILABLE';
    modelStatusLabel = 'Model · Unavailable';
  }

  // Hardware summary
  let hardwareSummary = 'CPU (Standard Execution)';
  if (runtimeInfo.isRealHardwareDetected && runtimeInfo.gpuName && runtimeInfo.gpuName !== 'Unknown') {
    const vram = runtimeInfo.vramTotalGb ? `${runtimeInfo.vramTotalGb}GB VRAM` : 'Hardware Detected';
    hardwareSummary = `${runtimeInfo.gpuName} · ${vram}`;
  }

  return {
    appStatus,
    appStatusLabel,
    runtimeStatus,
    runtimeStatusLabel,
    modelStatus,
    modelStatusLabel,
    isHardwareOnline,
    hardwareSummary,
  };
}
