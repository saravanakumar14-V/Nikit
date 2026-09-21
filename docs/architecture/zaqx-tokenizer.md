# Nikit Phase 11 — ZaqX Native Tokenizer

## 1. Overview & Vocabulary Architecture

**ZaqXTokenizer** provides an explicit, reproducible vocabulary structure for the ZaqX model family.

```text
Special Tokens (IDs 0–3)
 ├── <|zaqx_bos|>: ID 0 (Beginning of Sequence)
 ├── <|zaqx_eos|>: ID 1 (End of Sequence)
 ├── <|zaqx_pad|>: ID 2 (Padding)
 └── <|zaqx_unk|>: ID 3 (Unknown Token)
        ↓
Byte-Level ASCII Fallback (IDs 4–259)
        ↓
Subword & Code Tokens (IDs 260+)
```

---

## 2. Integration with Training Pipeline

```text
Phase 10 DatasetVersion
        ↓
ZaqXTokenizer.encode()
        ↓
Token IDs Sequence Truncation (≤ maxContextLength)
        ↓
Causal Shift (inputIds [0:N-1] vs targetIds [1:N])
        ↓
PyTorch Training Batches
```

- Authoritative tokenizer status: `isAuthoritative: true`.
- Deterministic round-trip: `decode(encode(text)) === text`.
