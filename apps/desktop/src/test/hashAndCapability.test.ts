import { describe, it, expect } from 'vitest';
import { HashService } from '../services/files/HashService';
import { FileCapabilityService } from '../services/files/FileCapabilityService';
import { EncodingService } from '../services/files/EncodingService';
import { FILE_LIMITS } from '../services/files/config';

describe('Hashing, Encoding & Capability Services', () => {
  it('HashService: produces identical SHA-256 for same content and different for different content', async () => {
    const textA = 'Nikit AI Workspace Ingestion Text';
    const textB = 'Nikit AI Workspace Ingestion Text';
    const textC = 'Different payload completely';

    const hashA = await HashService.calculateHash(textA);
    const hashB = await HashService.calculateHash(textB);
    const hashC = await HashService.calculateHash(textC);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
    expect(hashA.length).toBe(64); // Standard SHA-256 hex string length
  });

  it('FileCapabilityService: correctly resolves supported formats and capability boundaries', () => {
    expect(FileCapabilityService.isSupported('notes.txt')).toBe(true);
    expect(FileCapabilityService.isSupported('architecture.md')).toBe(true);
    expect(FileCapabilityService.isSupported('model.py')).toBe(true);
    expect(FileCapabilityService.isSupported('data.json')).toBe(true);
    expect(FileCapabilityService.isSupported('dataset.csv')).toBe(true);
    expect(FileCapabilityService.isSupported('binary.exe')).toBe(false);
    expect(FileCapabilityService.isSupported('image.png')).toBe(false);

    expect(FileCapabilityService.canPreview('notes.txt')).toBe(true);
    expect(FileCapabilityService.canNormalize('model.py')).toBe(true);

    // Future boundaries remain unavailable in Phase 5A
    expect(FileCapabilityService.canChunk('notes.txt')).toBe(false);
    expect(FileCapabilityService.canEmbed('notes.txt')).toBe(false);
    expect(FileCapabilityService.canRetrieve('notes.txt')).toBe(false);
  });

  it('EncodingService: decodes UTF-8 text and handles buffers cleanly', () => {
    const utf8Str = 'Transformers & Multi-Head Latent Attention: 🚀';
    const res = EncodingService.decode(utf8Str);
    expect(res.text).toBe(utf8Str);
    expect(res.encoding).toBe('UTF-8');
    expect(res.isLossless).toBe(true);
  });

  it('FILE_LIMITS: contains defined limits for processing and preview', () => {
    expect(FILE_LIMITS.maxFileSizeBytes).toBeGreaterThan(0);
    expect(FILE_LIMITS.maxPreviewBytes).toBeLessThan(FILE_LIMITS.maxFileSizeBytes);
    expect(FILE_LIMITS.maxNormalizedCharacters).toBe(500_000);
  });
});
