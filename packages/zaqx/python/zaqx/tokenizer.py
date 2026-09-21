"""
ZaqX Dedicated Tokenizer.
"""

from typing import List

SPECIAL_TOKENS = {
    "BOS": "<|zaqx_bos|>",
    "EOS": "<|zaqx_eos|>",
    "PAD": "<|zaqx_pad|>",
    "UNK": "<|zaqx_unk|>",
}

SPECIAL_TOKEN_IDS = {
    SPECIAL_TOKENS["BOS"]: 0,
    SPECIAL_TOKENS["EOS"]: 1,
    SPECIAL_TOKENS["PAD"]: 2,
    SPECIAL_TOKENS["UNK"]: 3,
}

class ZaqXTokenizer:
    def __init__(self, vocab_size: int = 4096):
        self.version = "1.0.0"
        self.vocab = {}
        self.reverse_vocab = {}
        self._init_vocab(vocab_size)

    def _init_vocab(self, max_vocab: int):
        for token, token_id in SPECIAL_TOKEN_IDS.items():
            self.vocab[token] = token_id
            self.reverse_vocab[token_id] = token

        next_id = 4
        # ASCII characters
        for i in range(256):
            char = chr(i)
            if char not in self.vocab and next_id < max_vocab:
                self.vocab[char] = next_id
                self.reverse_vocab[next_id] = char
                next_id += 1

        # Common subwords
        common_words = [
            "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
            "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
            "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
            "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
            "function", "return", "import", "export", "const", "let", "var", "class",
            "def", "self", "torch", "tensor", "nn", "Module", "loss", "step", "model",
            "attention", "transformer", "zaqx", "layer", "hidden", "head", "kv"
        ]

        for w in common_words:
            if w not in self.vocab and next_id < max_vocab:
                self.vocab[w] = next_id
                self.reverse_vocab[next_id] = w
                next_id += 1
            w_space = f" {w}"
            if w_space not in self.vocab and next_id < max_vocab:
                self.vocab[w_space] = next_id
                self.reverse_vocab[next_id] = w_space
                next_id += 1

    @property
    def vocab_size(self) -> int:
        return len(self.vocab)

    def encode(self, text: str) -> List[int]:
        if not text:
            return []

        token_ids = []
        i = 0
        while i < len(text):
            # Check special tokens
            matched_special = False
            for s_tok, s_id in SPECIAL_TOKEN_IDS.items():
                if text.startswith(s_tok, i):
                    token_ids.append(s_id)
                    i += len(s_tok)
                    matched_special = True
                    break
            if matched_special:
                continue

            # Greedy subword match
            matched = False
            for length in range(min(20, len(text) - i), 0, -1):
                substr = text[i : i + length]
                if substr in self.vocab:
                    token_ids.append(self.vocab[substr])
                    i += length
                    matched = True
                    break

            if not matched:
                char = text[i]
                token_ids.append(self.vocab.get(char, SPECIAL_TOKEN_IDS[SPECIAL_TOKENS["UNK"]]))
                i += 1

        return token_ids

    def decode(self, token_ids: List[int]) -> str:
        pieces = []
        for tid in token_ids:
            tok = self.reverse_vocab.get(tid)
            if tok and tok not in [SPECIAL_TOKENS["BOS"], SPECIAL_TOKENS["EOS"], SPECIAL_TOKENS["PAD"]]:
                pieces.append(tok)
            elif not tok:
                pieces.append("\uFFFD")
        return "".join(pieces)
