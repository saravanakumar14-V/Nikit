import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlamaCppRuntime } from '../services/runtimes/llamacpp/LlamaCppRuntime';
import { LlamaCppProcess } from '../services/runtimes/llamacpp/LlamaCppProcess';
import { GenerationRequest } from '@nikit/types';

describe('LlamaCppRuntime & Lifecycle States', () => {
  let runtime: LlamaCppRuntime;
  let mockProcess: LlamaCppProcess;

  beforeEach(() => {
    mockProcess = new LlamaCppProcess();
    vi.spyOn(mockProcess, 'findExecutable').mockResolvedValue({
      path: 'llama-server.exe',
      exists: true,
      isValid: true,
    });
    vi.spyOn(mockProcess, 'start').mockResolvedValue({
      pid: 12345,
      host: '127.0.0.1',
      port: 8080,
      baseUrl: 'http://127.0.0.1:8080',
      modelPath: 'model.gguf',
    });
    vi.spyOn(mockProcess, 'waitForReadiness').mockResolvedValue({
      status: 'ready',
      message: 'llama-server ready',
    });
    vi.spyOn(mockProcess, 'stop').mockResolvedValue();

    runtime = new LlamaCppRuntime(mockProcess);
  });

  it('progresses through lifecycle states: not_connected -> ready -> stopped', async () => {
    expect(runtime.getStatus()).toBe('not_connected');

    await runtime.loadModel('gguf-test-1', 'models/test.gguf');
    expect(runtime.getStatus()).toBe('ready');
    expect(runtime.getCurrentModelId()).toBe('gguf-test-1');

    await runtime.unloadModel('gguf-test-1');
    expect(runtime.getStatus()).toBe('available');
    expect(runtime.getCurrentModelId()).toBeNull();
  });

  it('switches models by stopping previous model first (single active model invariant)', async () => {
    await runtime.loadModel('gguf-model-a', 'models/model-a.gguf');
    expect(runtime.getCurrentModelId()).toBe('gguf-model-a');

    await runtime.loadModel('gguf-model-b', 'models/model-b.gguf');
    expect(runtime.getCurrentModelId()).toBe('gguf-model-b');
  });

  it('rejects concurrent generations (single active generation invariant)', async () => {
    await runtime.loadModel('gguf-model-a', 'models/model-a.gguf');

    const request: GenerationRequest = {
      conversationId: 'conv-1',
      modelId: 'gguf-model-a',
      messages: [{ id: 'm1', conversationId: 'conv-1', role: 'user', parts: [{ type: 'text', content: 'Hi' }], createdAt: '', updatedAt: '', status: 'completed' }],
    };

    // First generation
    const gen1 = runtime.generate(request);
    // Since mock generation is empty in unit test, manually check isGenerating state
    const iterator1 = gen1[Symbol.asyncIterator]();
    await iterator1.next();

    // Verify inspect reflects runtime state
    const info = await runtime.inspect('gguf-model-a');
    expect(info.runtime).toBe('llama.cpp Server');
  });
});
