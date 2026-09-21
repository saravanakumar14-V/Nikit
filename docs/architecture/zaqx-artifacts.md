# Nikit Phase 12 — ZaqX Artifact Manifest & Machine-Readable Provenance

## 1. Manifest Specification (`zaqx-artifact.json`)

```json
{
  "schemaVersion": "v1",
  "modelId": "zaqx-1.0-tiny-001",
  "modelVersion": "1.0.0",
  "architecture": "zaqx",
  "configHash": "a5db067335f23f6f...",
  "tokenizerHash": "tok-zaqx-v1-vsize4096",
  "datasetHash": "ds-zaqx-corpus-v1",
  "checkpointHash": "a5db067335f23f6f...",
  "ggufHash": "69ca4233d6382d0d...",
  "converterVersion": "gguf-0.19.0",
  "llamaCppVersion": "b4700",
  "quantization": "F32",
  "createdAt": "2026-08-27T16:20:00Z",
  "promotionStatus": "candidate",
  "metadata": {
    "totalParams": 5401856,
    "contextLength": 1024,
    "hiddenSize": 256,
    "layers": 6,
    "heads": 4,
    "kvHeads": 2,
    "vocabSize": 4096
  }
}
```

---

## 2. Promotion Policy Gates

```text
experimental  → Training checkpoint active, parameter equality verified.
     ↓
candidate     → Checkpoint exported to GGUF, verified with GGUFReader, manifest generated.
     ↓
validated     → Evaluation suites pass, PyTorch <-> GGUF parity test passes.
     ↓
released      → Verified local inference in Nikit Chat through llama.cpp.
```
