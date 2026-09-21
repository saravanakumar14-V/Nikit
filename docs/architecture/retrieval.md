# Nikit Retrieval Architecture (Phase 5C)

## 1. Overview & Core Philosophy

Nikit Phase 5C establishes a local-first, replaceable, inspectable hybrid retrieval layer that connects persistent document chunks with retrieval scoring and structured context assembly.

The core pipeline is:

```text
User Query
    │
    ├─────────────────────────────┬─────────────────────────────┐
    ▼                             ▼                             ▼
Lexical Store                 Vector Store              Future Semantic Store
(Keyword / Token Matching)    (In-Process Cosine Search) (Trained Embeddings)
    │                             │                             │
    └─────────────────────────────┼─────────────────────────────┘
                                  ▼
                        Hybrid Ranker (RRF)
                                  │
                                  ▼
                          RetrievedChunk[]
                                  │
                                  ▼
                         Retrieval Inspector
                                  │
                      (StructuredContext Boundary)
```

---

## 2. Embedding Model Classification & Transparency

Nikit strictly differentiates between prototype vector baselines and real trained semantic embedding models.

### A. Local Vector Baseline (`local-deterministic-v1`)
- **Type**: Prototype Vector Baseline (Deterministic Character & Subword Hashing Projection).
- **Dimensions**: 384 dimensions.
- **Unit Hypersphere Projection**: Vectors are normalized in cosine space ($\|v\|_2 = 1$).
- **Characteristics**:
  - Runs in microseconds completely in-process within Tauri on Windows.
  - Zero external network calls, zero daemon requirements, zero model download footprint.
  - Generates stable, deterministic vector similarity scores for identical and overlapping lexical/subword patterns.
  - **Honest Limitation**: It is **NOT** a trained neural semantic model. It does not understand deep cross-lingual semantic analogies or conceptual synonyms that share no lexical/subword roots.
  - **Terminology Rule**: The UI and engine label these scores as **Vector Score** and **Prototype Vector Similarity**, never claiming "semantic understanding".

### B. Future Trained Semantic Models
- The `IEmbeddingProvider` interface is designed to support real local transformer embedding models (e.g., `bge-small-en-v1.5`, `all-MiniLM-L6-v2`, or custom ZaqX embedding weights) as drop-in providers.
- Dimensions are dynamically defined on the model metadata (e.g., 384, 768, 1024) rather than hardcoded globally.

---

## 3. Storage Architecture & Migration Boundary

To prevent browser `localStorage` bloat as knowledge bases grow:

```text
               ┌────────────────────────────────────────────────────────┐
               │              Persistent Storage Boundary               │
               │             (IEmbeddingStore, IChunkStore)             │
               └──────────────────────────┬─────────────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     Embedded Persistent Store                       Future SQLite Vector / LanceDB
(File-backed Persistent Store / IndexedDB)            (Tauri Native Rust Sidecar)
```

1. **Storage Decoupling**: All retrieval and vector index operations interface with `IEmbeddingStore` and `IVectorStore`. Neither the UI nor `ContextBuilder` touches storage directly.
2. **Derived Vector Index**: The vector search index is **derived state**. If the index is cleared or corrupted, it can be 100% reconstructed on demand from persistent chunks and embedding records.
3. **Stale Invalidation Invariant**: An embedding record is flagged as stale and automatically rebuilt if any of the following change:
   - `inputHash` (chunk text changed)
   - `modelId` (embedding model switched)
   - `modelVersion` (model updated)
   - `dimensions` (dimension mismatch)

---

## 4. In-Process Exact Vector Search

- **Cosine Similarity**: For unit-normalized vectors, cosine similarity is computed as the dot product:
  $$\text{sim}(u, v) = \sum_{i=1}^d u_i v_i$$
- Normalized output is clamped to $[0, 1]$ via $\frac{\text{sim} + 1}{2}$.
- Exact vector search operates over active in-memory candidates filtered by `projectId`, `fileId`, or `documentId`.

---

## 5. Lexical Retrieval Engine

- Evaluates exact term matching, normalized token overlap (Jaccard-weighted), and heading ancestry relevance.
- Heading matches (e.g. section title `# Transformer > ## Attention`) are prioritized with higher structural weights than body paragraphs.

---

## 6. Hybrid Ranking Strategies

Nikit supports two configurable hybrid fusion strategies:

### A. Reciprocal Rank Fusion (RRF) — Primary Default
Combines rank positions rather than arbitrary raw scores:
$$\text{RRF Score}(d) = \frac{w_{\text{vector}}}{k + \text{rank}_{\text{vector}}(d)} + \frac{w_{\text{lexical}}}{k + \text{rank}_{\text{lexical}}(d)}$$
Where $k = 60$ is the standard smoothing parameter. RRF is immune to score distribution skew and scale differences between vector cosine similarity and lexical token frequencies.

### B. Min-Max Normalized Weighted Fusion
$$\text{Score}(d) = w_{\text{vector}} \cdot \tilde{S}_{\text{vector}}(d) + w_{\text{lexical}} \cdot \tilde{S}_{\text{lexical}}(d)$$
Where each candidate set's scores are strictly min-max normalized to $[0, 1]$ prior to weighting.

---

## 7. Context Boundary & Strict Chat Generation Isolation

- **Retrieval $\neq$ Generation**: Retrieval produces `RetrievedChunk[]`, which is converted to structured context references only when explicitly requested.
- **Zero Automatic RAG in Chat**: Normal conversation turns do **NOT** automatically inject retrieval results into the model context in Phase 5C.
- **Manual / Developer Surface**: Retrieval is inspected via the dedicated **Retrieval Inspector** in the Files & Knowledge workspace and through the `Search Knowledge` developer action.

---

## 8. Privacy & Security Model

- **100% Local-First**: All tokenization, vector projection, lexical indexing, and ranking execute in-process on the user's machine.
- Zero network traffic, zero external API keys required, and zero telemetry data leakage.
- Project deletion preserves knowledge chunks and embeddings globally by detaching `projectId` to `null`.
