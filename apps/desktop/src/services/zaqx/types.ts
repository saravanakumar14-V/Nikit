import {
  ZaqXConfig,
  ZaqXModelScale,
  ZaqXPromotionStatus,
} from '@nikit/types';

export interface ZaqXCandidateState {
  id: string;
  name: string;
  version: string;
  scale: ZaqXModelScale;
  config: ZaqXConfig;
  status: ZaqXPromotionStatus;
  activeCheckpointId?: string;
  isRunnableLocal: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ZAQX_CANDIDATES: ZaqXCandidateState[] = [
  {
    id: 'zaqx-dev-tiny-001',
    name: 'ZaqX 1.0 (Experimental Tiny ~10M)',
    version: '1.0-dev.001',
    scale: 'experimental-tiny',
    config: {
      name: 'ZaqX Experimental Tiny',
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
    status: 'experimental',
    isRunnableLocal: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
