import { ContextBlock, ContextBudgetReport } from '@nikit/types';

export class ContextBudgetManager {
  /**
   * Deterministically allocates context budget across prioritized blocks.
   * Never silently drops required blocks (System, Current User, Project Instructions).
   */
  static allocate(
    blocks: ContextBlock[],
    contextLimit: number | null = null
  ): ContextBudgetReport {
    // If no context limit is defined, include all available blocks
    if (contextLimit === null || contextLimit <= 0) {
      const available = blocks.filter((b) => b.isAvailable && (b.enabled !== false));
      const omitted = blocks.filter((b) => !b.isAvailable || b.enabled === false);

      let totalEst: number | null = null;
      const hasEstimates = available.some((b) => b.tokenEstimate !== null && b.tokenEstimate !== undefined);
      if (hasEstimates) {
        totalEst = available.reduce((acc, b) => acc + (b.tokenEstimate || 0), 0);
      }

      return {
        contextLimit: null,
        totalTokensEstimated: totalEst,
        remainingTokens: null,
        includedBlocks: available,
        omittedBlocks: omitted,
        isConstrained: false,
        budgetApplied: false,
      };
    }

    // Sort available blocks by priority ascending (1 = highest priority)
    const available = blocks.filter((b) => b.isAvailable && (b.enabled !== false));
    const sorted = [...available].sort((a, b) => (a.priority || 5) - (b.priority || 5));

    const included: ContextBlock[] = [];
    const omitted: ContextBlock[] = [];
    let currentTokens = 0;
    let isConstrained = false;

    for (const block of sorted) {
      const est = block.tokenEstimate || 0;

      // Required blocks are always included
      if (block.required) {
        included.push(block);
        currentTokens += est;
        continue;
      }

      if (currentTokens + est <= contextLimit) {
        included.push(block);
        currentTokens += est;
      } else {
        isConstrained = true;
        const omittedBlock: ContextBlock = {
          ...block,
          exclusionReason: `Context limit exceeded (${currentTokens + est} > ${contextLimit} tokens). Trimmed by priority.`,
        };
        omitted.push(omittedBlock);
      }
    }

    // Add originally disabled/unavailable blocks to omitted list
    for (const b of blocks) {
      if (!b.isAvailable || b.enabled === false) {
        omitted.push({
          ...b,
          exclusionReason: !b.isAvailable ? 'Block unavailable or empty' : 'Disabled by user/policy',
        });
      }
    }

    const remainingTokens = Math.max(0, contextLimit - currentTokens);

    return {
      contextLimit,
      totalTokensEstimated: currentTokens,
      remainingTokens,
      includedBlocks: included,
      omittedBlocks: omitted,
      isConstrained,
      budgetApplied: true,
    };
  }

  /**
   * Estimates rough token count conservatively without calling characters tokens.
   * Returns null if text is empty or indeterminate.
   */
  static estimateTokens(text: string): number | null {
    if (!text || text.trim().length === 0) return 0;
    // Standard rule-of-thumb: ~4 characters per token in English
    return Math.ceil(text.length / 4);
  }
}
