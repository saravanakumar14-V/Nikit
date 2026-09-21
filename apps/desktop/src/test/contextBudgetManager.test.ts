import { describe, it, expect } from 'vitest';
import { ContextBudgetManager } from '../services/context/ContextBudgetManager';
import { ContextBlock } from '@nikit/types';

describe('ContextBudgetManager & Priority-Based Trimming', () => {
  it('includes all available blocks when contextLimit is null', () => {
    const blocks: ContextBlock[] = [
      {
        id: 'sys',
        type: 'system',
        title: 'System',
        content: 'System instructions',
        priority: 1,
        required: true,
        isAvailable: true,
        tokenEstimate: 50,
      },
      {
        id: 'user_mem',
        type: 'user_memory',
        title: 'User Memory',
        content: 'User memory content',
        priority: 5,
        required: false,
        isAvailable: true,
        tokenEstimate: 30,
      },
    ];

    const report = ContextBudgetManager.allocate(blocks, null);
    expect(report.isConstrained).toBe(false);
    expect(report.budgetApplied).toBe(false);
    expect(report.includedBlocks.length).toBe(2);
    expect(report.totalTokensEstimated).toBe(80);
  });

  it('preserves required blocks and trims lower-priority blocks when budget is constrained', () => {
    const blocks: ContextBlock[] = [
      {
        id: 'sys',
        type: 'system',
        title: 'System',
        content: 'System prompt',
        priority: 1,
        required: true,
        isAvailable: true,
        tokenEstimate: 100,
      },
      {
        id: 'user_msg',
        type: 'current_user',
        title: 'Current User Turn',
        content: 'User prompt',
        priority: 2,
        required: true,
        isAvailable: true,
        tokenEstimate: 50,
      },
      {
        id: 'proj_mem',
        type: 'project_memory',
        title: 'Project Memory',
        content: 'Project memory',
        priority: 4,
        required: false,
        isAvailable: true,
        tokenEstimate: 40,
      },
      {
        id: 'retrieved',
        type: 'retrieved_knowledge',
        title: 'Retrieved Knowledge',
        content: 'Large retrieved chunk...',
        priority: 6,
        required: false,
        isAvailable: true,
        tokenEstimate: 150,
      },
    ];

    // Total = 100 + 50 + 40 + 150 = 340 tokens
    // Set limit = 200 tokens
    // Included: sys (100) + user_msg (50) + proj_mem (40) = 190 <= 200
    // Omitted: retrieved (150) -> exceeds 200
    const report = ContextBudgetManager.allocate(blocks, 200);

    expect(report.budgetApplied).toBe(true);
    expect(report.isConstrained).toBe(true);
    expect(report.totalTokensEstimated).toBe(190);
    expect(report.remainingTokens).toBe(10);
    expect(report.includedBlocks.map((b) => b.id)).toEqual(['sys', 'user_msg', 'proj_mem']);
    expect(report.omittedBlocks.some((b) => b.id === 'retrieved')).toBe(true);
  });

  it('estimates tokens accurately via 4-chars-per-token heuristic without calling chars tokens', () => {
    expect(ContextBudgetManager.estimateTokens('')).toBe(0);
    expect(ContextBudgetManager.estimateTokens('1234')).toBe(1);
    expect(ContextBudgetManager.estimateTokens('12345678')).toBe(2);
  });
});
