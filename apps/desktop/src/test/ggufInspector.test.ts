import { describe, it, expect } from 'vitest';
import { GgufInspector } from '../services/runtimes/llamacpp/GgufInspector';

describe('GgufInspector & Binary Header Parsing', () => {
  function createMockGgufBuffer(version = 3, tensorCount = 290n, kvCount = 24n): ArrayBuffer {
    const buffer = new ArrayBuffer(32);
    const view = new DataView(buffer);

    // Magic: G G U F (0x47, 0x47, 0x55, 0x46)
    view.setUint8(0, 0x47);
    view.setUint8(1, 0x47);
    view.setUint8(2, 0x55);
    view.setUint8(3, 0x46);

    // Version uint32
    view.setUint32(4, version, true);

    // Tensor count uint64
    view.setBigUint64(8, tensorCount, true);

    // KV count uint64
    view.setBigUint64(16, kvCount, true);

    return buffer;
  }

  it('parses a valid GGUF binary header correctly', async () => {
    const buffer = createMockGgufBuffer(3, 290n, 24n);
    const metadata = await GgufInspector.inspect('models/qwen2.5-0.5b-instruct-q4_k_m.gguf', buffer);

    expect(metadata.validGguf).toBe(true);
    expect(metadata.version).toBe(3);
    expect(metadata.tensorCount).toBe(290);
    expect(metadata.kvCount).toBe(24);
    expect(metadata.architecture).toBe('Qwen');
    expect(metadata.quantization).toBe('Q4_K_M');
    expect(metadata.parameterCountEstimate).toBe('0.5B');
    expect(metadata.discoveryStatus).toBe('available');
  });

  it('detects invalid magic bytes and marks file as invalid', async () => {
    const invalidBuffer = new ArrayBuffer(32);
    const view = new DataView(invalidBuffer);
    view.setUint8(0, 0x50); // 'P' 'K' (Zip file magic)
    view.setUint8(1, 0x4b);

    const metadata = await GgufInspector.inspect('corrupted.gguf', invalidBuffer);
    expect(metadata.validGguf).toBe(false);
    expect(metadata.discoveryStatus).toBe('invalid');
  });

  it('infers architecture and quantization from various standard model filenames', async () => {
    const llamaMeta = await GgufInspector.inspect('Meta-Llama-3-8B-Instruct-Q5_K_M.gguf');
    expect(llamaMeta.architecture).toBe('Llama-3');
    expect(llamaMeta.quantization).toBe('Q5_K_M');
    expect(llamaMeta.parameterCountEstimate).toBe('8B');

    const mistralMeta = await GgufInspector.inspect('Mistral-7B-v0.3-Q4_0.gguf');
    expect(mistralMeta.architecture).toBe('Mistral');
    expect(mistralMeta.quantization).toBe('Q4_0');
    expect(mistralMeta.parameterCountEstimate).toBe('7B');
  });
});
