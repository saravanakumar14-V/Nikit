# Nikit Architecture — Local Inference & Runtime Management (llama.cpp)

Phase 7 connects Nikit to its first real local LLM inference runtime: **llama.cpp** (`llama-server`).

---

## 1. Architectural Overview & Provider Decoupling

The Nikit UI and conversation engine remain completely agnostic of inference runtimes:

```text
               ┌────────────────────────────────────────────────────────┐
               │                        Nikit UI                        │
               │             (ChatView, ModelsView, Header)             │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │                      ModelService                      │
               │         - 3-Tier Resolution (Conv → Proj → WS)         │
               │         - Dynamic Local Model Discovery                │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
       ┌───────────────────────────┐             ┌───────────────────────────┐
       │       ModelRegistry       │             │     ProviderRegistry      │
       │- Dynamic GGUF Models      │             │- LlamaCppProvider         │
       │- ZaqX 1.0 (Prototype)     │             │- MockProvider (Dev)       │
       │- Mock Dev Model           │             │- Cached Provider Health   │
       └───────────────────────────┘             └─────────────┬─────────────┘
                                                               │
                                                               ▼
                                                 ┌───────────────────────────┐
                                                 │     LlamaCppProvider      │
                                                 │(generate Streaming Stream)│
                                                 └─────────────┬─────────────┘
                                                               │
                                                               ▼
                                                 ┌───────────────────────────┐
                                                 │      LlamaCppRuntime      │
                                                 │  - Process Lifecycle      │
                                                 │  - GGUF Model Loading     │
                                                 │  - SSE Protocol Parser    │
                                                 │  - MemoryGuard & Hardware │
                                                 └─────────────┬─────────────┘
                                                               │
                                                               ▼
                                                 ┌───────────────────────────┐
                                                 │     llama-server.exe      │
                                                 │ (http://127.0.0.1:<port>) │
                                                 └───────────────────────────┘
```

---

## 2. Tested llama.cpp Runtime & API

- **Executable**: `llama-server.exe` (OpenAI-compatible local server mode).
- **Tested Protocol**:
  - `POST /v1/chat/completions`: Streaming SSE chunks (`stream: true`).
  - `GET /health`: Readiness detection endpoint.
  - `GET /props`: Server properties.
- **Protocol Translation**: `LlamaCppProtocol` transforms raw SSE stream deltas directly into Nikit's standard `GenerationEvent` format (`started`, `delta`, `completed`, `cancelled`, `error`, `metadata`).

---

## 3. Dynamic Localhost Port & Loopback Security

1. **Loopback Binding**: `llama-server` is strictly bound to `127.0.0.1`. No public network or LAN/WAN exposure.
2. **Dynamic Ephemeral Port**: Nikit never hardcodes permanent ports. Native port allocation (`TcpListener::bind("127.0.0.1:0")`) reserves a clean, conflict-free port at runtime.

---

## 4. GGUF Metadata Strategy & Inspection Hierarchy

```text
llama.cpp runtime/API metadata (/props or /v1/models)
        ↓
GGUF binary header inspection fallback (magic 'GGUF', version, tensor/kv count)
        ↓
File metadata fallback (filename patterns, size)
```

- If a metadata field cannot be extracted or verified, it remains explicitly `Unknown` / `Unavailable`.

---

## 5. Process Lifecycle & Single Active Model Invariant

- **States**: `not_connected` $\rightarrow$ `available` $\rightarrow$ `initializing` $\rightarrow$ `loading` $\rightarrow$ `ready` $\rightarrow$ `busy` $\rightarrow$ `ready` $\rightarrow$ `unloading` $\rightarrow$ `stopped` / `error`.
- **Single Active Model**: Nikit runs one active local model at a time. Switching models triggers a clean graceful stop of the previous server before initializing the new model.
- **Process Ownership**: The Tauri native backend manages the child process and guarantees automatic cleanup on window close or application exit.

---

## 6. Request-Level Cancellation

When the user clicks **Stop**:
1. `AbortController` triggers `request.abortSignal`.
2. `LlamaCppProtocol` aborts the active HTTP SSE stream connection.
3. Partial generated text is preserved in the conversation.
4. The `llama-server` process remains alive and ready for subsequent requests without restarting the server.

---

## 7. Telemetry & Hardware Detection Honesty

- **Time-to-First-Token (TTFT)**: Elapsed milliseconds from request start until first streamed token delta.
- **Generation Duration**: Measured locally.
- **Tokens/sec & Token Counts**: Only displayed when authoritative usage data is provided by the runtime.
- **Hardware**: GPU Name, VRAM total/free, and System RAM are queried directly via native Windows system CIM/WMI commands.

---

## 8. MemoryGuard Resource Feasibility

`MemoryGuard` evaluates model file size and context memory footprint against detected system RAM and VRAM:
- `likely_fit`: Model fits comfortably in available VRAM or RAM.
- `possibly_constrained`: High memory utilization warning.
- `likely_insufficient`: Model size exceeds physical limits; alerts user before execution.
- `unknown`: When hardware metrics are unavailable.

---

## 9. Future ZaqX Integration Path

ZaqX 1.0 remains honest as a `Prototype / Unavailable` model in pre-training design. The identical `AIProvider` and `IRuntimeAdapter` architecture will allow `ZaqXProvider` $\rightarrow$ `ZaqXRuntime` to plug in seamlessly when ready.
