# Nikit

A local-first desktop AI studio and model development platform for offline LLM inference, structured context management, and custom model research.

---

## Overview

**Nikit** is an open-source, local-first desktop AI platform engineered for running, evaluating, and developing large language models directly on personal hardware.

Most contemporary AI interfaces rely entirely on proprietary cloud APIs and remote servers. Nikit is built on a different premise: users should have full ownership of their inference pipeline, personal documents, and context data. All model execution occurs on local hardware without mandatory cloud telemetry, accounts, or external dependencies.

Beyond being a local chat client, Nikit serves as the runtime platform and research environment for **ZaqX**, an ongoing custom neural language model research and development project. The platform provides end-to-end tooling spanning model discovery, hardware capability detection, context budgeting, hybrid retrieval (RAG), long-term memory, and model experimentation.

---

## Core Capabilities

### 1. Local LLM Inference & llama.cpp Integration
- **Direct Runtime Management**: Manages the lifecycle of local inference servers powered by `llama.cpp` (`llama-server`).
- **Loopback IPC**: All inference requests communicate strictly over `127.0.0.1` using dynamic ephemeral port allocation to avoid port collisions.
- **Server-Sent Events (SSE)**: Real-time streaming generation with token delta processing and response cancellation via `AbortController`.
- **Single Active Model Invariant**: Ensures only one local model resides in hardware memory at a time, performing clean graceful shutdowns before initializing a new model.

### 2. GGUF Inspection & Dynamic Model Discovery
- **Native Binary Header Parser**: Extracts GGUF metadata directly from file headers (magic bytes, version, tensor count, key-value counts, architecture, context length, quantization type, and byte size).
- **Filesystem Discovery**: Scans local directories for compatible `.gguf` weight files without manual configuration.

### 3. Context Attachments & Token Budgeting
- **Modal Context Attachment**: Attach indexed Knowledge Base documents, project workspace files, or raw code/markdown snippets directly to the prompt.
- **Token Budget Allocation**: `ContextBudgetManager` monitors context limits and deterministically trims lower-priority blocks to avoid context overflow.
- **Deterministic Assembly**: `ContextBuilder` organizes prompts into prioritized structured blocks: system instructions, user attachments, project instructions, project/user memory, retrieved knowledge, and conversation history.

### 4. Hybrid Retrieval (RAG)
- **Multi-Vector & Lexical Search**: Combines local vector embedding similarity (`LocalEmbeddingProvider`, `LocalVectorStore`) with lexical BM25 keyword matching (`LocalLexicalStore`).
- **Reciprocal Rank Fusion (RRF)**: Merges vector and lexical rankings with configurable top-K and score weighting.
- **Toggleable Execution**: RAG retrieval can be toggled on or off per message via the Composer tools popover.

### 5. Long-Term Scoped Memory
- **Multi-Tier Scoping**: Persists user preferences and project-specific facts (`MemoryService`, `LocalMemoryStore`).
- **Policy Enforcement**: Includes confidence scoring, deduplication, and automatic context injection.
- **User Control**: Memory injection can be toggled on or off per prompt.

### 6. File Ingestion & Format-Aware Chunking
- **Supported Formats**: Parses Markdown, Plain Text, Code files (TypeScript, Python, JavaScript, HTML, CSS, C/C++, Rust, etc.), JSON, and CSV documents.
- **Chunking Engine**: Format-specialized chunkers split content while preserving structural headings, indentation, and line provenance.

### 7. Hardware Detection & Memory Safety
- **Native Hardware Probing**: Queries GPU model name, total/free VRAM, system RAM, and CPU thread availability using native OS system interfaces.
- **MemoryGuard**: Analyzes model parameter footprint and context window size against detected physical memory to prevent out-of-memory crashes.

### 8. LLM Lab & Model Evaluation
- **Sequential Model Comparison**: Evaluates multiple local models sequentially on identical prompts without dual memory residency.
- **Reproducible Evaluation Runs**: Runs benchmark test suites, measures Time-to-First-Token (TTFT) and token generation speed, and generates regression comparison matrices.

### 9. Truthful Runtime Status Engine
- **No Fabricated States**: Platform statuses are derived strictly from live hardware checks and process states (`runtimeStatusResolver`).
- **Transparent Classifications**:
  - *Runtime*: `ONLINE`, `STANDBY`, `DEV_SIMULATION`, `ERROR`, `OFFLINE`.
  - *Model*: `LOADED`, `DISCOVERED`, `SPECIFICATION_ONLY`, `SIMULATED_DEV_MODEL`, `UNAVAILABLE`.
  - *Application*: `READY`, `DEGRADED`, `ERROR`.

---

## Why Nikit

Nikit was started out of a commitment to three principles:

1. **Local Control & Privacy**: Running AI locally keeps your code, personal notes, and conversations on your local machine rather than routing them through external third-party APIs.
2. **Deep Architectural Understanding**: Building an AI platform from the runtime layer up—including GGUF parsing, process management, context budgeting, and retrieval—creates a deeper understanding of language model systems than merely consuming remote API endpoints.
3. **Foundation for Custom Models**: Nikit is designed not only to host existing open-weight models, but to serve as the development ground for custom neural architectures (ZaqX).

---

## Architecture

Nikit is organized as a modular monorepo cleanly separating native desktop operations, user interface, domain packages, and model research:

```text
┌─────────────────────────────────────────────────────────────┐
│                      Desktop Application                    │
│   React 19 · TypeScript · Custom Token/CSS Design System   │
│   ChatView · ModelsView · LabView · FilesView · Header      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Local Services Layer                    │
│   ContextBuilder · ContextBudgetManager · HybridRetriever   │
│   MemoryService · FileIngestionService · DatasetService     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│        Tauri / Rust         │ │         @nikit/zaqx         │
│  Child Process Lifecycle    │ │  ZaqX Model Specification   │
│  Ephemeral Port Allocation  │ │  Parameter Calculator       │
│  Hardware Probing (GPU/RAM) │ │  Tokenizer & Scaling Presets│
│  GGUF Binary Header Parser  │ │  Python/PyTorch Train Pipeline│
└──────────────┬──────────────┘ └─────────────────────────────┘
               │
               ▼
┌─────────────────────────────┐
│      llama-server.exe       │
│   HTTP / SSE (127.0.0.1)    │
│   GGUF Weight Inference     │
└─────────────────────────────┘
```

### Component Breakdown
- **Native Host Layer (`apps/desktop/src-tauri`)**: Built with Tauri 2 and Rust. Handles child process spawning, port management, hardware queries, and low-level GGUF binary inspection.
- **Frontend Layer (`apps/desktop/src`)**: Built with React 19 and Vite. Implements the chat workspace, prompt composer, model selector, context attachment modal, and LLM Lab views.
- **UI Design System (`packages/ui`, `packages/tokens`)**: Component library with custom design tokens, accessible dialogs, cards, popovers, and status badges.
- **Type Definitions (`packages/types`)**: Shared TypeScript domain models covering messages, contexts, models, files, chunks, memories, and telemetry.
- **Model Research Package (`packages/zaqx`)**: Defines ZaqX model hyperparameters, parameter formulas, vocabulary tokenizers, and PyTorch training scripts.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | [Tauri 2](https://tauri.app/), [Rust](https://www.rust-lang.org/) (2021 edition) |
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/) |
| **Monorepo Management** | [pnpm](https://pnpm.io/) workspaces |
| **Icons & Styling** | [Lucide React](https://lucide.dev/), Vanilla CSS Modules, Custom Design Tokens |
| **Local Inference Runtime**| [llama.cpp](https://github.com/ggml-org/llama.cpp) (`llama-server`) |
| **Model Research & ML** | [Python 3](https://www.python.org/), [PyTorch](https://pytorch.org/), `gguf` Python library |
| **Testing** | [Vitest](https://vitest.dev/) |

---

## Project Structure

```text
nikit/
├── apps/
│   └── desktop/                 # Main Tauri desktop application
│       ├── src/                 # React frontend application
│       │   ├── components/      # UI components (chat, shell, attachments, etc.)
│       │   ├── services/        # Local services (context, files, retrieval, memory, runtimes)
│       │   ├── state/           # React contexts (conversation, project, file, workspace)
│       │   ├── views/           # Application views (Chat, Models, Lab, Files, Settings)
│       │   └── test/            # Vitest unit and integration suites
│       ├── src-tauri/           # Rust native backend (process management, hardware probe)
│       └── package.json
├── packages/
│   ├── tokens/                  # Design tokens (colors, typography, spacing, shadows)
│   ├── types/                   # Shared TypeScript interfaces & domain types
│   ├── ui/                      # Shared reusable UI component library
│   └── zaqx/                    # ZaqX architecture spec, parameter math, and PyTorch code
│       ├── src/                 # TypeScript model configuration & parameter calculator
│       └── python/              # PyTorch model definitions, training, and GGUF export
├── docs/                        # Architecture documentation and research cycle notes
│   ├── architecture/            # Detailed design documents for all subsystems
│   └── research/                # ZaqX research experiment and evaluation logs
├── bin/                         # Local runtime binary directory (e.g. llama-server.exe)
├── models/                      # Local GGUF models directory (excluded from git)
├── fetch_llama.ps1              # Windows PowerShell script to download llama.cpp binaries
├── package.json                 # Monorepo root scripts and package configuration
├── pnpm-workspace.yaml          # Monorepo workspace configuration
├── LICENSE                      # MIT License
└── README.md                    # Project documentation
```

---

## Requirements

### Development Prerequisites
- **Operating System**: Windows 10/11 (macOS / Linux support via standard Tauri toolchain)
- **Node.js**: v18.0.0 or higher (v20+ LTS recommended)
- **Package Manager**: `pnpm` (v9.0+ or v11+)
- **Rust Toolchain**: `rustc` and `cargo` (v1.77.2 or higher)
  - Windows: [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload.

### Optional (For ZaqX Model Research & Training)
- **Python**: 3.10 or higher
- **PyTorch**: 2.0+
- **GGUF Python Package**: `pip install gguf`

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/saravanakumar14-V/Nikit.git
   cd Nikit
   ```

2. **Install monorepo dependencies**:
   ```bash
   pnpm install
   ```

3. **Verify the installation**:
   ```bash
   pnpm typecheck
   ```

---

## Local Models

Nikit executes local GGUF models via `llama.cpp`. Large model weight files are intentionally **not** committed to the Git repository.

### 1. Setting up llama.cpp runtime
On Windows, you can download pre-compiled `llama.cpp` AVX2 binaries directly using the repository's setup script:

```powershell
powershell -ExecutionPolicy Bypass -File .\fetch_llama.ps1
```

This extracts `llama-server.exe` into the local `bin/` directory.

Alternatively, you can manually place your own `llama-server` (or `llama-server.exe`) into `bin/` or ensure it is accessible in your system `PATH`.

### 2. Supplying GGUF Models
Place any standard `.gguf` format model file (such as SmolLM2, Llama 3, Qwen 2.5, or Mistral) into the `models/` directory or select it through the desktop UI.

Nikit automatically inspects the GGUF header to extract architecture and context limits, evaluates hardware memory constraints via `MemoryGuard`, and presents the model in the **Models** view.

---

## Development

All standard development tasks are managed via root `pnpm` scripts:

```bash
# Start Vite development server (frontend only)
pnpm dev

# Launch full desktop application with Tauri
pnpm tauri:dev

# Run typechecking across all workspace packages
pnpm typecheck

# Run linter across all workspace packages
pnpm lint

# Run all test suites
pnpm test

# Build production web bundles
pnpm build

# Compile native desktop release
pnpm tauri:build
```

---

## ZaqX

**ZaqX** is an ongoing custom neural model research and development initiative created for Nikit. Rather than simply acting as a client for external checkpoints, Nikit includes the architecture specifications, parameter mathematics, tokenizer implementations, and training harnesses for developing custom models.

### Architecture Highlights
- **Model Type**: Decoder-only autoregressive Transformer.
- **Positional Encoding**: Rotary Position Embeddings (RoPE).
- **Normalization**: Root Mean Square Normalization (RMSNorm) with pre-normalization residual connections.
- **Attention**: Grouped-Query Attention (GQA) with causal lower-triangular masking.
- **Feed-Forward**: SwiGLU gated activation network.
- **Scalable Presets**: Configured from experimental tiny configurations (~10M parameters) up to larger targets.

### Status
ZaqX is an active research project. In the current production application, ZaqX is truthfully labeled as `Architecture Specification (Untrained)` / `SPECIFICATION_ONLY`. The codebase contains the full mathematical parameter formula in TypeScript (`@nikit/zaqx`), the complete PyTorch network implementation, GGUF conversion scripts, and experimental training stages (`docs/research/zaqx-cycle-01.md`, `docs/research/zaqx-cycle-02.md`). Trained production model weights will be released upon completion of training cycles.

---

## Windows Release

A standalone, distributable Windows `.exe` installer (via Tauri bundle targets) is **planned and in progress**. Currently, the application can be built directly from source using:

```bash
pnpm tauri:build
```

Packaged pre-built binary releases will be published under [GitHub Releases](https://github.com/saravanakumar14-V/Nikit/releases) as they become available.

---

## Privacy / Local-First

Nikit is designed with an offline, local-first architecture:

- **Local Inference**: Inference is performed on your machine via a local `llama-server` process bound to loopback `127.0.0.1`.
- **No Unsolicited Telemetry**: Prompts, completions, uploaded files, and embeddings are kept on-device without automatic cloud synchronization.
- **Explicit Offline Guard**: Tools that would require outbound internet access (such as Web Search) are visibly marked as disabled (`Unavailable · Offline Privacy Guard Active`) rather than fabricating responses or silently transmitting queries.
- **Local Persistence**: All chat histories, draft messages, project instructions, and indexed embeddings are stored locally in application storage.

---

## Testing

The platform maintains automated test coverage across the runtime, context pipeline, and model integrations:

```bash
pnpm test
```

**Current Test Suite State (71 test files, 194 tests passing as of the latest validation run)**:
- `contextAttachment.test.ts`: Attachment lifecycle, serialization, `ContextBuilder` inclusion, token budgeting, and deterministic ordering.
- `toolConfiguration.test.ts`: Tool toggling, selective RAG and memory suppression, and guard execution checks.
- `runtimeStatusTruthfulness.test.ts`: Truthful runtime and model state resolution, avoiding false-positive readiness or prototype badges.
- `llamaCppProtocol.test.ts` & `llamaCppRuntime.test.ts`: Server-Sent Events protocol parsing, delta streaming, and process lifecycle.
- `hybridRetriever.test.ts` & `vectorAndLexicalStore.test.ts`: Multi-source ranking, Reciprocal Rank Fusion, and BM25 lexical search.
- `contextBuilder.test.ts` & `contextBudgetManager.test.ts`: Token estimation, priority sorting, and budget constraint trimming.
- `memoryService.test.ts` & `memoryGuard.test.ts`: Scoped memory operations and hardware memory fit calculation.
- `zaqxArchitecture.test.ts`, `zaqxTokenizer.test.ts`, & `zaqxParity.test.ts`: Parameter formula consistency, vocabulary tokenization, and mathematical parity.

---

## Roadmap

- [ ] Complete ZaqX 1.0 pre-training cycles and export validated GGUF weights
- [ ] Publish standalone signed Windows `.exe` / MSI desktop installer releases
- [ ] Expand fine-tuning and LoRA parameter-efficient adaptation workflows within the LLM Lab
- [ ] Implement native container-isolated sandboxed code execution
- [ ] Add macOS (Apple Silicon / Metal) and Linux binary runtime packaging

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Author

**Saravana Kumar V**
- GitHub: [@saravanakumar14-V](https://github.com/saravanakumar14-V)
