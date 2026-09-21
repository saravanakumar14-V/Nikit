import { ZaqXConfig, ZaqXModelScale } from '@nikit/types';

export const ZAQX_DEFAULT_CONFIG: ZaqXConfig = {
  name: 'ZaqX 1.0 (Candidate Architecture)',
  scale: 'experimental-tiny',
  hiddenSize: 256,
  numLayers: 6,
  numAttentionHeads: 4,
  numKeyValueHeads: 2,
  intermediateSize: 688,
  vocabSize: 4096,
  maxContextLength: 1024,
  ropeTheta: 10000.0,
  normEpsilon: 1e-5,
  activation: 'swiglu',
  normType: 'rmsnorm',
  useGQA: true,
  useRoPE: true,
  tieWordEmbeddings: true,
};

export const ZAQX_SCALING_PRESETS: Record<ZaqXModelScale, ZaqXConfig> = {
  'experimental-tiny': {
    name: 'ZaqX Experimental Tiny (~10M Candidate)',
    scale: 'experimental-tiny',
    hiddenSize: 256,
    numLayers: 6,
    numAttentionHeads: 4,
    numKeyValueHeads: 2,
    intermediateSize: 688,
    vocabSize: 4096,
    maxContextLength: 1024,
    ropeTheta: 10000.0,
    normEpsilon: 1e-5,
    activation: 'swiglu',
    normType: 'rmsnorm',
    useGQA: true,
    useRoPE: true,
    tieWordEmbeddings: true,
  },
  'experimental-small': {
    name: 'ZaqX Experimental Small (~30M Candidate)',
    scale: 'experimental-small',
    hiddenSize: 384,
    numLayers: 12,
    numAttentionHeads: 6,
    numKeyValueHeads: 2,
    intermediateSize: 1024,
    vocabSize: 8192,
    maxContextLength: 2048,
    ropeTheta: 10000.0,
    normEpsilon: 1e-5,
    activation: 'swiglu',
    normType: 'rmsnorm',
    useGQA: true,
    useRoPE: true,
    tieWordEmbeddings: true,
  },
  'experimental-medium': {
    name: 'ZaqX Experimental Medium (~70M Candidate)',
    scale: 'experimental-medium',
    hiddenSize: 512,
    numLayers: 16,
    numAttentionHeads: 8,
    numKeyValueHeads: 2,
    intermediateSize: 1376,
    vocabSize: 16384,
    maxContextLength: 2048,
    ropeTheta: 10000.0,
    normEpsilon: 1e-5,
    activation: 'swiglu',
    normType: 'rmsnorm',
    useGQA: true,
    useRoPE: true,
    tieWordEmbeddings: true,
  },
  'experimental-135m': {
    name: 'ZaqX Experimental 135M (~135M Candidate)',
    scale: 'experimental-135m',
    hiddenSize: 576,
    numLayers: 30,
    numAttentionHeads: 9,
    numKeyValueHeads: 3,
    intermediateSize: 1536,
    vocabSize: 49152,
    maxContextLength: 2048,
    ropeTheta: 10000.0,
    normEpsilon: 1e-5,
    activation: 'swiglu',
    normType: 'rmsnorm',
    useGQA: true,
    useRoPE: true,
    tieWordEmbeddings: true,
  },
  'zaqx-1.0-candidate': {
    name: 'ZaqX 1.0 Candidate (~300M+ Architecture)',
    scale: 'zaqx-1.0-candidate',
    hiddenSize: 1024,
    numLayers: 24,
    numAttentionHeads: 16,
    numKeyValueHeads: 4,
    intermediateSize: 2816,
    vocabSize: 65536,
    maxContextLength: 4096,
    ropeTheta: 10000.0,
    normEpsilon: 1e-5,
    activation: 'swiglu',
    normType: 'rmsnorm',
    useGQA: true,
    useRoPE: true,
    tieWordEmbeddings: false,
  },
  custom: {
    name: 'ZaqX Custom Configuration',
    scale: 'custom',
    hiddenSize: 256,
    numLayers: 6,
    numAttentionHeads: 4,
    numKeyValueHeads: 2,
    intermediateSize: 688,
    vocabSize: 4096,
    maxContextLength: 1024,
    ropeTheta: 10000.0,
    normEpsilon: 1e-5,
    activation: 'swiglu',
    normType: 'rmsnorm',
    useGQA: true,
    useRoPE: true,
    tieWordEmbeddings: true,
  },
};

export function validateZaqXConfig(config: ZaqXConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.hiddenSize <= 0 || config.hiddenSize % 2 !== 0) {
    errors.push('hiddenSize must be a positive even integer.');
  }

  if (config.numLayers <= 0) {
    errors.push('numLayers must be at least 1.');
  }

  if (config.numAttentionHeads <= 0) {
    errors.push('numAttentionHeads must be at least 1.');
  }

  if (config.numKeyValueHeads <= 0) {
    errors.push('numKeyValueHeads must be at least 1.');
  }

  if (config.hiddenSize % config.numAttentionHeads !== 0) {
    errors.push(
      `hiddenSize (${config.hiddenSize}) must be evenly divisible by numAttentionHeads (${config.numAttentionHeads}).`
    );
  }

  if (config.useGQA && config.numAttentionHeads % config.numKeyValueHeads !== 0) {
    errors.push(
      `numAttentionHeads (${config.numAttentionHeads}) must be evenly divisible by numKeyValueHeads (${config.numKeyValueHeads}) for Grouped-Query Attention.`
    );
  }

  if (config.intermediateSize <= 0) {
    errors.push('intermediateSize must be at least 1.');
  }

  if (config.vocabSize < 256) {
    errors.push('vocabSize must be at least 256.');
  }

  if (config.maxContextLength < 64) {
    errors.push('maxContextLength must be at least 64.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
