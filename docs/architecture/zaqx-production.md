# Nikit Phase 12 — ZaqX 1.0 Production Architecture & Development Lifecycle

## 1. Overview & Core Philosophy

**Phase 12** completes the end-to-end local model development and runtime lifecycle for the **ZaqX 1.0** neural model family.

```text
ZaqX Dataset (Corpus Validation & Hash)
      ↓
ZaqX Tokenizer (Validated Vocabulary, Special Tokens, Tokenizer Hash)
      ↓
ZaqX Configuration (Exact 0-Delta Parameter Match)
      ↓
PyTorch ZaqX Model (RoPE, RMSNorm, GQA, SwiGLU, Causal LM)
      ↓
Real PyTorch Training (Loss Decay, Non-Zero Gradients, Optimizer Steps)
      ↓
Real Checkpoint (Binary Weights on Disk, Checksum, Resume Metadata)
      ↓
Real GGUF Conversion (PyTorch → GGUF via gguf.GGUFWriter)
      ↓
GGUF Inspection & Validation (Magic, Version, Tensors, KV Pairs via gguf.GGUFReader)
      ↓
Artifact Manifest (zaqx-artifact.json with Provenance & Hashes)
      ↓
llama.cpp Runtime Integration (ModelDiscovery → ModelRegistry → LlamaCppRuntime)
      ↓
Nikit Chat (Real Local Inference, Streaming, Cancellation, Regeneration)
      ↓
Candidate Promotion Gate (experimental → candidate → validated → released)
```

---

## 2. Invariants & Guarantees

1. **Exact 0-Delta Parameter Equality**: Both TypeScript parameter calculator and PyTorch model tensor allocations evaluate to exact mathematical parity.
2. **Tokenizer Corpus Validation**: Factual coverage, unknown token frequency, sequence length percentiles (P50, P95, P99, max), and special token integrity.
3. **Model + Tokenizer Immutability**: Any alteration to vocabulary or tokenizer configuration increments the version and produces a new `tokenizerHash`.
4. **Real GGUF Export**: Produced via official `gguf.GGUFWriter` with all 57 tensors and architecture metadata verified by `gguf.GGUFReader`.
5. **No Fabricated Telemetry**: Step losses, gradient norms, throughput, and benchmarks reflect real measured values.
