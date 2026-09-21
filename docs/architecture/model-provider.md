# Nikit Model & Provider Architecture (Phase 6)

## 1. Overview & Decoupling Principle

Nikit enforces strict decoupling between the user interface and the underlying inference runtimes. The UI, chat composer, and retrieval services never directly import, initialize, or execute provider SDKs (such as Ollama, llama.cpp, ZaqX runtime, OpenAI, Anthropic, or Gemini).

The 4-layer execution stack is:

```text
               ┌────────────────────────────────────────────────────────┐
               │                        Nikit UI                        │
               │            (ChatView, ModelsView, Settings)            │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │                      ModelService                      │
               │  - Evaluates 3-Tier Precedence (Conv → Proj → Workspace)│
               │  - Strict Resolution & No Silent Fallback Policy       │
               │  - Dispatches to Cached Provider Health Target         │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
       ┌───────────────────────────┐             ┌───────────────────────────┐
       │       ModelRegistry       │             │     ProviderRegistry      │
       │- Declared Model Metadata  │             │- Provider Lifecycle       │
       │- Capability Indexing      │             │- Cached Provider Health   │
       │- Immutable AIModel specs  │             │- Streaming Adapter Route  │
       └───────────────────────────┘             └─────────────┬─────────────┘
                                                               │
                                                               ▼
                                                 ┌───────────────────────────┐
                                                 │        AIProvider         │
                                                 │(generate Streaming Stream)│
                                                 └─────────────┬─────────────┘
                                                               │
                                                               ▼
                                                 ┌───────────────────────────┐
                                                 │       ModelRuntime        │
                                                 │(Hardware, Load/Unload,    │
                                                 │ Availability, Lifecycle)  │
                                                 └───────────────────────────┘
```

---

## 2. Declared Model Metadata vs. Ephemeral Runtime State

To preserve strict architectural hygiene, stable model definitions are separated from ephemeral runtime state:

1. **`AIModel` (Immutable Declared Metadata)**:
   - Model ID, Name, Family, Version, Provider ID.
   - Declared capabilities (`chat`, `streaming`, `vision`, `embeddings`, `toolCalling`, `reasoning`, `code`, `local`, etc.).
   - Structural specifications (`architecture`, `parameterCount`, `contextLength`, `precision`, `quantization`).
   - Flagged `prototype: boolean` and `local: boolean`.

2. **`RuntimeModelState` (Ephemeral Runtime State)**:
   - Current status (`unavailable`, `discovered`, `available`, `loading`, `ready`, `busy`, `error`, `unloading`, `prototype`).
   - `loaded: boolean`, `runtimeId`, `hardwareState`, and telemetry snapshots.
   - Mutating runtime status updates `RuntimeModelState` without altering the immutable `AIModel` metadata.

---

## 3. Provider vs. Runtime Ownership

- **Provider**:
  - Owns model discovery, model metadata mapping, provider-level health checking, and the `generate(request) -> AsyncIterable<GenerationEvent>` streaming contract.
- **Runtime**:
  - Owns process execution, model weight loading/unloading, GPU/CPU memory allocation, initialization, and device status.
  - Providers may wrap a local runtime internally, but the UI communicates solely through `ModelService` and `AIProvider`.

---

## 4. Cached Provider Health (Zero Per-Message Latency)

Provider health checks are asynchronous and non-blocking:
- Health states (`healthy`, `degraded`, `unavailable`, `unknown`) are cached in `ProviderRegistry`.
- Health checks execute at application startup, upon provider registration, on manual trigger, or after generation errors.
- Message generation reads the latest known cached health state with **0ms overhead**, ensuring local inference is never delayed by redundant synchronous pings.

---

## 5. Strict No-Fallback Resolution Policy

Nikit enforces explicit model selection. If a selected model or its provider is unavailable:
- `ModelResolutionService` throws a typed `ModelResolutionError` (e.g. `MODEL_UNAVAILABLE`, `PROVIDER_UNAVAILABLE`, `CAPABILITY_UNSUPPORTED`).
- The system does **NOT** silently switch to a mock model, ZaqX, or a different local model.
- The user is presented with a clear unavailable state and can explicitly select an alternative model.

### 3-Tier Precedence Hierarchy:
1. **Conversation Override**: `conversation.modelId` (if explicitly overridden).
2. **Project Default**: `project.modelConfig.defaultModel` (if inside an active project).
3. **Workspace Default**: `workspace.activeModelId` (application preference).

---

## 6. Honest Prototype Representation (ZaqX 1.0)

- `zaqx-1.0` is registered with status `prototype` / `unavailable` and `runtime: not_connected`.
- Unknown hardware specifications (parameter count, context length, VRAM, precision, quantization) are explicitly recorded as `null` / `unknown` / `TBD`.
- No fake benchmark scores, GPU detection, or fabricated token metrics are presented to the user.

---

## 7. Model Lifecycle Events

A typed observable event bus notifies subscribers of runtime transitions:
- `model_discovered`
- `model_loading`
- `model_ready`
- `model_busy`
- `model_unloaded`
- `model_error`
