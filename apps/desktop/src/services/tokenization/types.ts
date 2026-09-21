import {
  ITokenizerProvider,
  TokenLengthDistribution,
  PackingAnalysisResult,
} from '@nikit/types';

export interface TokenizerResolutionParams {
  modelId?: string;
  explicitTokenizerId?: string;
}

export interface SequenceAnalysisOptions {
  contextLimit?: number; // default: 2048
}

export type {
  ITokenizerProvider,
  TokenLengthDistribution,
  PackingAnalysisResult,
};
