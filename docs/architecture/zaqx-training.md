# Nikit Phase 11 — ZaqX PyTorch Training Engine & Checkpoint Management

## 1. Overview & Process Boundary

ZaqX model training operates via a dedicated **PyTorch training runtime** (`packages/zaqx/python/zaqx/` and `ZaqXTrainingEngine`) running outside the React main thread.

```text
Tauri / Desktop Client
        ↓
ZaqXTrainingEngine
        ↓
PyTorch Worker Subprocess (zaqx_train.py)
        ↓
AdamW Optimizer + Cosine Annealing + Gradient Accumulation
        ↓
Structured Event Stream (JSON Lines)
 ├── training_started
 ├── step_completed (real loss, learning rate)
 ├── checkpoint_created
 └── training_completed
```

---

## 2. Invariants & Invariants Enforced

### A. Separation of Training vs Inference Runtimes
- **Training Runtime**: PyTorch.
- **Inference Runtime**: llama.cpp.
- llama.cpp is not used as a model training backend.

### B. No Fake Training Telemetry
- Training loss, optimizer step counts, throughput, and learning rate are exclusively recorded from real PyTorch executions.
- If a training run is cancelled or unsupported, status is honestly displayed as `cancelled` or `SKIPPED`.

### C. Checkpoints as Filesystem Artifacts
- **Binary Weights**: Stored at designated filesystem paths (e.g. `D:/Nikit/models/zaqx/zaqx-step-N.pt`).
- **Metadata**: Indexed in application persistence via `CheckpointService` with content hashes and resume metadata.
