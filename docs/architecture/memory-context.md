# Phase 8 — Memory & Context Intelligence Architecture

## 1. Overview & Core Philosophy

Nikit maintains a strict distinction across all knowledge and context layers:

```text
System Instructions (Behavioral Foundation)
        +
Current User Turn (Immediate Intent)
        +
Project Instructions (Project-level Behavioral Style)
        +
Project Memory (Project-scoped Persistent Facts & Decisions)
        +
User Memory (Global User Preferences & Facts)
        +
Retrieved Knowledge (Dynamic Lexical & Vector Chunks)
        +
Conversation History (Recent Context Turns)
```

---

## 2. Core Invariants

1. **`Conversation History != Persistent Memory`**:
   - Conversation history is transient session state.
   - Persistent memory is deliberately retained for future conversations.
   - Raw conversation content is **never** silently converted into permanent memory without explicit user approval.

2. **`Project Instructions != Project Memory`**:
   - **Project Instructions**: Persistent behavioral directives (e.g. *"Write clean TypeScript with strict types"*).
   - **Project Memory**: Persistent facts, decisions, and domain knowledge (e.g. *"Production database is PostgreSQL 16 on port 5432"*).
   - They are never collapsed into a single amorphous text field.

3. **`Memory != Retrieved Knowledge`**:
   - **Memory**: Scoped, persistent, stateful entity.
   - **Retrieved Knowledge**: Dynamically searched, scored evidence chunks from ingested documents.

4. **Honest Token Accounting**:
   - Estimated token counts are conservatively calculated or reported as `null` when no real tokenizer is bound. Characters are never misleadingly labeled as "tokens".

5. **Scope Isolation & Project Lifecycle**:
   - Project-scoped memories never leak into unrelated projects or global conversations.
   - When a project is deleted, its project-scoped memories are permanently purged with explicit confirmation. User-scoped memories remain intact.

---

## 3. Priority Order & Budget Allocation

Context blocks are assembled in strict deterministic order:

| Priority | Block Type | Required | Description |
|---|---|---|---|
| **1** | `system` | Yes | Global assistant identity & guidelines |
| **2** | `current_user` | Yes | Active user message prompt |
| **3** | `project_instructions` | Yes (if active) | Active project behavioral instructions |
| **4** | `project_memory` | No | Project-scoped persistent facts & state |
| **5** | `user_memory` | No | Global user preferences |
| **6** | `retrieved_knowledge` | No | Dynamically matched RAG chunks |
| **7** | `conversation_history` | No | Prior conversation turns (trimmed first when budget applies) |
| **8** | `tools` | No | Tool manifests |

---

## 4. Conflict Auditing & Policy Control

- **Conflict Detection**: MemoryService audits active memories for contradictory polarity patterns (e.g. `prefers X` vs `avoids X`) and surfaces them directly in the UI for transparent resolution.
- **Policy Management**: Global memory enablement, explicit-save enforcement, and scope permissions are controllable in Settings and the Memory Manager view.
