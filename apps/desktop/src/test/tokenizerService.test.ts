import { describe, it, expect } from 'vitest';
import { HeuristicAnalyzer } from '../services/tokenization/HeuristicAnalyzer';
import { TokenizerRegistry } from '../services/tokenization/TokenizerRegistry';
import { TokenAnalysisService } from '../services/tokenization/TokenAnalysisService';
import { DatasetRecord } from '@nikit/types';

describe('Tokenizer Architecture & Sequence Analysis', () => {
  it('distinguishes heuristic analyzer from authoritative tokenizers', async () => {
    const analyzer = new HeuristicAnalyzer();
    expect(analyzer.isAuthoritative).toBe(false);
    expect(analyzer.name).toContain('Heuristic Analysis');

    const res = await analyzer.tokenize('Attention is all you need.');
    expect(res.tokens.length).toBeGreaterThan(0);
    expect(res.tokenIds.length).toBe(res.tokens.length);
    expect(res.isAuthoritative).toBe(false);
  });

  it('resolves tokenizers through TokenizerRegistry', () => {
    const registry = new TokenizerRegistry();
    const smollmTokenizer = registry.resolveForModel('smollm2');
    expect(smollmTokenizer.id).toBe('tokenizer-llamacpp');
    expect(smollmTokenizer.isAuthoritative).toBe(true);

    const unknownTokenizer = registry.resolveForModel('unknown-future-model');
    expect(unknownTokenizer.isAuthoritative).toBe(false);
  });

  it('computes sequence length distribution and context overflow metrics', async () => {
    const analyzer = new HeuristicAnalyzer();
    const records: DatasetRecord[] = [
      { id: '1', datasetVersionId: 'v1', split: 'train', text: 'Short sentence.', contentHash: 'h1' },
      { id: '2', datasetVersionId: 'v1', split: 'train', text: 'Another slightly longer sentence for token distribution calculation.', contentHash: 'h2' },
      { id: '3', datasetVersionId: 'v1', split: 'train', text: 'Very long sample with multiple words and clauses repeating token structures.', contentHash: 'h3' },
    ];

    const distribution = await TokenAnalysisService.analyzeSequenceLengths(records, analyzer, 10);
    expect(distribution.minTokens).toBeGreaterThan(0);
    expect(distribution.maxTokens).toBeGreaterThanOrEqual(distribution.minTokens);
    expect(distribution.meanTokens).toBeGreaterThan(0);
    expect(distribution.withinLimitPercentage + distribution.exceededPercentage).toBe(100);
  });

  it('analyzes sequence packing efficiency and truncation rate for target context lengths', async () => {
    const analyzer = new HeuristicAnalyzer();
    const records: DatasetRecord[] = [
      { id: '1', datasetVersionId: 'v1', split: 'train', text: 'Hello world', contentHash: 'h1' },
      { id: '2', datasetVersionId: 'v1', split: 'train', text: 'Nikit model development workstation', contentHash: 'h2' },
    ];

    const packing = await TokenAnalysisService.analyzePacking(records, analyzer, 2048);
    expect(packing.targetContextLength).toBe(2048);
    expect(packing.totalTokens).toBeGreaterThan(0);
    expect(packing.packingEfficiency).toBeGreaterThan(0);
    expect(packing.truncationRate).toBe(0);
  });
});
