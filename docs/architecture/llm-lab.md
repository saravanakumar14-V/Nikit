# Nikit Phase 9 — LLM Lab & Model Playground Architecture

## 1. Overview & Objective

The **LLM Lab** transforms Nikit into a research-grade experimentation workbench for local language models. It provides prompt engineering, parameter calibration, factual telemetry, run persistence, and sequential model comparison without creating a second conversational chat engine.

The Lab is built directly upon the existing foundational abstractions:
```text
Lab UI (Playground, Experiments, Runs, Comparison, Diagnostics)
        ↓
LabService / ExperimentService
        ↓
ModelResolutionService / ModelService
        ↓
ContextService (honoring explicit lab context toggles)
        ↓
AIProvider (LlamaCppProvider / MockProvider)
        ↓
llama.cpp runtime (127.0.0.1 SSE Stream)
        ↓
Real Generation Events + Live Metrics
        ↓
RunRecord & LocalStorageLabStore (v1)
```

---

## 2. Core Architectural Invariants

### A. No Duplicate Generation Engine
The Playground does not fork or re-implement streaming. It invokes `modelService.resolveModel` and `provider.generate` using the standard `GenerationRequest` and `GenerationEvent` contracts with identical cancellation and streaming semantics as Chat.

### B. Bounded RunRecord Storage
To prevent large retrieval and persistent memory contexts from bloating local storage:
- `RunRecord` persists `contextConfig`, `includedBlockIds`, `omittedBlockIds`, `budgetReport`, and `tokenEstimate`.
- The full resolved text content (`rawFullContent`) is **omitted by default** and only captured when explicitly opted-in via Developer/Research mode.

### C. Single-Model Runtime Constraint & Sequential Comparison
The local `llama.cpp` process daemon supports one active model at a time. Model comparison executes **sequentially**:
```text
Model A → Load & Stream Run → Unload → Model B → Load & Stream Run
```
Dual model residency is not attempted.

### D. Factual Telemetry (No Fabricated Metrics)
- **TTFT** (Time to First Token) and **Duration** are measured from high-precision clock intervals during streaming.
- **Prompt / Completion Tokens** and **Tokens/Second** are extracted directly from runtime telemetry headers or client measurements.
- If a metric is unmeasured by the runtime, it remains `null` or `"Unknown"`.

### E. Explicit Opt-In Context Sources
In standard Chat, project instructions and memory are automatically bound to the active workspace. In the Lab:
- All context sources (`User Memory`, `Project Instructions`, `Project Memory`, `Retrieved Knowledge`, `Conversation History`) default to **OFF**.
- This ensures pure model evaluation without hidden prompt pollution.

### F. Honest ZaqX Representation
ZaqX 1.0 is clearly marked as `Prototype / Not Connected`. Execution is disabled in the UI until a real ZaqX backend is integrated.

### G. Export / Import Safety & Privacy
Export packages (`nikit-lab-v1`) contain experiment metadata, prompts, generation configs, and run metrics. They never export model weights, raw private document files, or full memory databases.

---

## 3. Domain Model & Contracts

### `RunRecord`
```ts
export interface RunRecord {
  id: string;
  experimentId?: string | null;
  name?: string;
  modelId: string;
  modelName: string;
  providerId: string;
  runtimeId?: string;
  systemPrompt: string;
  userPrompt: string;
  developerPrompt?: string;
  generationConfig: GenerationConfig;
  contextSummary?: RunContextSummary;
  reproducibility?: ReproducibilityMetadata;
  status: RunStatus;
  output?: string;
  metrics?: RunMetrics | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  schemaVersion: 'v1';
}
```

### `Experiment`
```ts
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  userPrompt: string;
  developerPrompt?: string;
  generationConfig: GenerationConfig;
  contextConfig: LabContextConfig;
  modelId?: string | null;
  runIds: string[];
  notes?: string;
  tags?: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 'v1';
}
```

---

## 4. Phase 10 Evaluation & Training Preparation

Lightweight evaluation contracts (`EvaluationTarget`, `EvaluationCase`, `EvaluationResult`) are established in `@nikit/types` and `EvaluationHooks.ts`. Phase 9 enables manual ratings and associating runs with evaluation cases. Formal benchmark runners and fine-tuning pipelines will be layered on in Phase 10.
