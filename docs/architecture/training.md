# Nikit Phase 10 — Training & Checkpoint Infrastructure

## 1. Overview & Core Philosophy

Phase 10 establishes the **training configuration, hardware feasibility, lifecycle abstraction, checkpoint management, and unified orchestration** architecture. It transforms Nikit into a future-ready model development environment while strictly adhering to hardware reality and never faking training progress.

---

## 2. Service Architecture & Orchestration

Services are kept **independently addressable** and coordinated through a higher-level `ModelDevelopmentService`:

```text
DatasetService ─────────────┐
TokenizerRegistry ──────────┤
EvaluationRunnerService ────┤
TrainingService ────────────┤
CheckpointService ──────────┤
                            ↓
                ModelDevelopmentService
```

This enables decoupled, flexible workflows:
- **`Dataset → Token Analysis`**: Inspect dataset token length distributions and packing efficiency.
- **`Dataset → Evaluation`**: Create evaluation suites from dataset splits.
- **`Model → Evaluation`**: Run benchmark suites directly against active models.
- **`Checkpoint → Evaluation`**: Run benchmark suites against saved model checkpoints.
- **`Dataset + Tokenizer → Training Config`**: Prepare training configurations with hardware feasibility analysis.
- **`Training Run → Checkpoint`**: Record step checkpoints and verify filesystem integrity.
- **`Checkpoint A vs Checkpoint B`**: Side-by-side regression comparison matrix.

---

## 3. Training Feasibility & Conservative Resource Bounds

Feasibility is **never** determined solely by raw model weight size or VRAM capacity. The `ResourceFeasibilityChecker` calculates composite memory requirements:

```text
Estimated Memory = Model Weights
                 + Gradients
                 + Optimizer State (AdamW: ~12 bytes/param)
                 + Activations (microBatchSize × contextLength × hiddenDim × layers × attentionHeads × precision × gradientCheckpointingFactor)
                 + Runtime/Framework Overhead (20% safety margin + 400 MB baseline CUDA runtime)
```

### Advisory Feasibility Categories
- **`likely_fit`**: Total conservative memory $\le 60\%$ of detected dedicated VRAM.
- **`possibly_constrained`**: Total memory is between $60\%$ and $95\%$ of detected VRAM (or running on large system RAM with CPU).
- **`likely_insufficient`**: Total memory exceeds detected VRAM/RAM boundaries.
- **`unknown`**: Model parameters or host memory metrics cannot be determined.

*The system does not autonomously alter user hyperparameters or make silent reductions.*

---

## 4. Training Engine Abstraction

```text
ITrainingEngine
├── DevelopmentTrainingEngine (Lifecycle, Config Validation & Simulation Stub)
├── [Future] PyTorchTrainingEngine
├── [Future] TransformersTrainingEngine
└── [Future] ZaqXTrainingEngine
```

- **`DevelopmentTrainingEngine`**: Tagged `Simulation / Development Only (Not a Real Training Run)`. Manages lifecycle states without fabricating loss numbers, optimizer steps, throughput, or GPU utilization.
- **`Training Execution Status`**: `SKIPPED — no verified training backend`.

---

## 5. Checkpoints & Verified Resume

- **Checkpoint Metadata**: Persisted in application storage (`id`, `trainingRunId`, `step`, `epoch`, `fileHash`, `metrics`).
- **Checkpoint Weights**: Stored on the local filesystem at designated user paths.
- **Verified Resume**: Resuming requires a verified `Checkpoint` record in `available` state and matching `datasetVersionId`, `tokenizerId`, `config`, and `seed`.
