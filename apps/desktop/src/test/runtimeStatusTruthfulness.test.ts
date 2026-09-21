import { describe, it, expect } from 'vitest';
import { derivePlatformStatus } from '../services/runtime/runtimeStatusResolver';
import { AIModel, LocalRuntimeInfo } from '@nikit/types';

describe('Runtime Status Truthfulness Engine', () => {
  const baseRuntimeInfo: LocalRuntimeInfo = {
    isRealHardwareDetected: false,
    deviceType: 'cpu',
    gpuName: 'Standard CPU',
    engineName: 'llama.cpp',
    status: 'not_connected',
    vramTotalGb: null,
    vramUsedGb: null,
    ramTotalGb: null,
    ramUsedGb: null,
    cudaStatus: 'unavailable',
    cudaVersion: null,
    driverVersion: null,
    lastCheckedAt: null,
  };

  const baseModel: AIModel = {
    id: 'smollm2-135m',
    name: 'SmolLM2 135M',
    family: 'smollm',
    version: '1.0',
    providerId: 'llamacpp',
    contextLength: 2048,
    capabilities: ['chat'],
    local: true,
    prototype: false,
  };

  it('reports STANDBY when hardware is detected but llama-server is not running/connected', () => {
    const status = derivePlatformStatus({
      runtimeInfo: {
        ...baseRuntimeInfo,
        isRealHardwareDetected: true,
        gpuName: 'NVIDIA RTX 4070',
        vramTotalGb: 12,
        status: 'not_connected', // not connected
      },
      activeModel: baseModel,
    });

    // Hardware detection alone MUST NOT produce ONLINE
    expect(status.runtimeStatus).toBe('STANDBY');
    expect(status.runtimeStatus).not.toBe('ONLINE');
    expect(status.runtimeStatusLabel).toContain('Standby');
  });

  it('reports ONLINE only when hardware is detected AND llama-server is connected', () => {
    const status = derivePlatformStatus({
      runtimeInfo: {
        ...baseRuntimeInfo,
        isRealHardwareDetected: true,
        gpuName: 'NVIDIA RTX 4070',
        vramTotalGb: 12,
        status: 'connected',
        engineName: 'llama.cpp',
      },
      activeModel: baseModel,
      modelRuntimeStatus: 'ready',
    });

    expect(status.runtimeStatus).toBe('ONLINE');
    expect(status.isHardwareOnline).toBe(true);
    expect(status.modelStatus).toBe('LOADED');
  });

  it('reports DEV_SIMULATION when mock development model/provider is active', () => {
    const mockModel: AIModel = {
      id: 'mock-dev',
      name: 'Mock Development Model',
      family: 'mock',
      version: '1.0',
      providerId: 'mock',
      contextLength: 4096,
      capabilities: ['chat'],
      local: true,
      prototype: true,
    };

    const status = derivePlatformStatus({
      runtimeInfo: {
        ...baseRuntimeInfo,
        status: 'not_connected',
      },
      activeModel: mockModel,
    });

    expect(status.runtimeStatus).toBe('DEV_SIMULATION');
    expect(status.modelStatus).toBe('SIMULATED_DEV_MODEL');
  });

  it('reports ERROR when runtime reports an error or crash', () => {
    const status = derivePlatformStatus({
      runtimeInfo: {
        ...baseRuntimeInfo,
        status: 'error',
      },
      activeModel: baseModel,
    });

    expect(status.runtimeStatus).toBe('ERROR');
    expect(status.runtimeStatusLabel).toContain('Error');
  });

  it('reports SPECIFICATION_ONLY for ZaqX research model specification without calling it trained or loaded', () => {
    const zaqxModel: AIModel = {
      id: 'zaqx-1.0',
      name: 'ZaqX 1.0 (Architecture)',
      family: 'zaqx',
      version: '1.0',
      providerId: 'llamacpp',
      contextLength: 8192,
      capabilities: ['chat'],
      local: true,
      prototype: true,
      specification: {
        isPrototype: true,
        parameterCount: 'TBD',
        contextLength: '8192',
        precision: 'FP16',
        status: 'prototype_placeholder',
      },
    };

    const status = derivePlatformStatus({
      runtimeInfo: {
        ...baseRuntimeInfo,
        status: 'not_connected',
      },
      activeModel: zaqxModel,
    });

    expect(status.modelStatus).toBe('SPECIFICATION_ONLY');
    expect(status.modelStatusLabel).toContain('Untrained');
    expect(status.modelStatus).not.toBe('LOADED');
  });

  it('reports DISCOVERED for un-loaded local models', () => {
    const status = derivePlatformStatus({
      runtimeInfo: {
        ...baseRuntimeInfo,
        status: 'not_connected',
      },
      activeModel: baseModel,
      modelRuntimeStatus: 'discovered',
    });

    expect(status.modelStatus).toBe('DISCOVERED');
    expect(status.modelStatusLabel).toContain('Discovered');
  });

  it('truthfully signals Application storage fault', () => {
    const status = derivePlatformStatus({
      runtimeInfo: baseRuntimeInfo,
      activeModel: baseModel,
      isStorageHealthy: false,
    });

    expect(status.appStatus).toBe('ERROR');
    expect(status.appStatusLabel).toContain('Storage Fault');
  });
});
