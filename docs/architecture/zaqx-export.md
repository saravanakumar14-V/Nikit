# Nikit Phase 11 — ZaqX Export & Local Runtime Integration

## 1. Export Pipeline

```text
PyTorch Step Checkpoint (.pt)
        ↓
ZaqXExportService.exportCheckpoint()
        ↓
GGUF Model Artifact (.gguf)
        ↓
Metadata & Checksum Validation (Architecture: zaqx, KV pairs, tensor count)
        ↓
ModelRegistry Registration
        ↓
LlamaCppProvider / LlamaCppRuntime Load
        ↓
Nikit Local Chat Inference
```

---

## 2. Invariants & Promotion Gates

### A. Candidate Lifecycle
1. **`experimental`**: Active training or development checkpoint.
2. **`candidate`**: Exported and validated against evaluation benchmark suites.
3. **`validated`**: Tested with real local inference through llama.cpp.
4. **`released`**: Promoted to primary local model in Nikit Chat.

### B. No Fake GGUFs or Local Inference
- An export is only marked runnable if a verified GGUF artifact is created and passes structural inspection.
- If conversion tooling is unavailable: status remains `Prototype / Not Connected` with explicit `SKIPPED — reason`.
