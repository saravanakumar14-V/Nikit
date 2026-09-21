import {
  GenerationConfig,
  LabContextConfig,
  RunRecord,
  Experiment,
  AIModel,
} from '@nikit/types';

export const CURRENT_LAB_STORAGE_SCHEMA_VERSION = 'v1';

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 1024,
};

export const DEFAULT_LAB_CONTEXT_CONFIG: LabContextConfig = {
  includeUserMemory: false,
  includeProjectInstructions: false,
  includeProjectMemory: false,
  includeRetrievedKnowledge: false,
  includeConversationHistory: false,
  projectId: null,
};

export const GENERATION_CONFIG_BOUNDS = {
  temperature: { min: 0.0, max: 2.0, step: 0.05, label: 'Temperature (Sampling Entropy)' },
  topP: { min: 0.0, max: 1.0, step: 0.05, label: 'Top-P (Nucleus Sampling)' },
  topK: { min: 1, max: 100, step: 1, label: 'Top-K (Candidate Pool)' },
  maxTokens: { min: 1, max: 8192, step: 16, label: 'Max Tokens (Output Limit)' },
};

export interface LabStorageRecord {
  schemaVersion: 'v1';
  runs: Record<string, RunRecord>;
  experiments: Record<string, Experiment>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates generation parameters against numeric boundaries and model capabilities.
 */
export function validateGenerationConfig(
  config: GenerationConfig,
  model?: AIModel | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof config.temperature !== 'number' || isNaN(config.temperature)) {
    errors.push('Temperature must be a valid number.');
  } else if (
    config.temperature < GENERATION_CONFIG_BOUNDS.temperature.min ||
    config.temperature > GENERATION_CONFIG_BOUNDS.temperature.max
  ) {
    errors.push(
      `Temperature must be between ${GENERATION_CONFIG_BOUNDS.temperature.min} and ${GENERATION_CONFIG_BOUNDS.temperature.max}.`
    );
  }

  if (typeof config.topP !== 'number' || isNaN(config.topP)) {
    errors.push('Top-P must be a valid number.');
  } else if (
    config.topP < GENERATION_CONFIG_BOUNDS.topP.min ||
    config.topP > GENERATION_CONFIG_BOUNDS.topP.max
  ) {
    errors.push(
      `Top-P must be between ${GENERATION_CONFIG_BOUNDS.topP.min} and ${GENERATION_CONFIG_BOUNDS.topP.max}.`
    );
  }

  if (config.topK !== undefined && config.topK !== null) {
    if (typeof config.topK !== 'number' || isNaN(config.topK)) {
      errors.push('Top-K must be a valid number if specified.');
    } else if (
      config.topK < GENERATION_CONFIG_BOUNDS.topK.min ||
      config.topK > GENERATION_CONFIG_BOUNDS.topK.max
    ) {
      errors.push(
        `Top-K must be between ${GENERATION_CONFIG_BOUNDS.topK.min} and ${GENERATION_CONFIG_BOUNDS.topK.max}.`
      );
    }
  }

  if (config.maxTokens !== undefined && config.maxTokens !== null) {
    if (typeof config.maxTokens !== 'number' || isNaN(config.maxTokens) || config.maxTokens < 1) {
      errors.push('Max Tokens must be a positive integer.');
    } else if (config.maxTokens > GENERATION_CONFIG_BOUNDS.maxTokens.max) {
      errors.push(`Max Tokens cannot exceed ${GENERATION_CONFIG_BOUNDS.maxTokens.max}.`);
    }

    if (model?.contextLength && config.maxTokens > model.contextLength) {
      warnings.push(
        `Requested maxTokens (${config.maxTokens}) exceeds model context window (${model.contextLength}).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
