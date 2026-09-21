import { zaqxTokenizer, ZaqXTokenizer, ZAQX_SPECIAL_TOKENS, ZAQX_SPECIAL_TOKEN_IDS } from '@nikit/zaqx';
import { tokenizerRegistry } from '../tokenization/TokenizerRegistry';

// Register ZaqX Native Tokenizer in global TokenizerRegistry
tokenizerRegistry.register(zaqxTokenizer);
tokenizerRegistry.bindModelToTokenizer('zaqx-1.0', zaqxTokenizer.id);
tokenizerRegistry.bindModelToTokenizer('zaqx-dev-tiny-001', zaqxTokenizer.id);

export {
  zaqxTokenizer,
  ZaqXTokenizer,
  ZAQX_SPECIAL_TOKENS,
  ZAQX_SPECIAL_TOKEN_IDS,
};
