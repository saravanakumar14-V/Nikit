# Nikit Phase 10 — Dataset & Data Infrastructure

## 1. Overview & Objective

The **Dataset & Data Infrastructure** layer turns Nikit into a reproducible dataset engineering and curation workstation. It supports local file ingestion, JSONL/text parsing, strict validation, duplicate detection, deterministic splitting, and exact-content leakage auditing.

---

## 2. Invariants & Architecture

```text
Raw Dataset File (JSONL / Plain Text)
        ↓
DatasetValidator.parseAndValidate()
        ↓
Deduplication & Issue Reporting (Errors / Warnings)
        ↓
Deterministic Split Generation (Train / Validation / Test with Seed)
        ↓
Exact-Content Leakage Audit
        ↓
Immutable DatasetVersion (Content Hash + Statistics + Partition Metadata)
        ↓
LocalStorageDataStore (v1 Indexed Metadata + Partitioned Record Storage)
```

### A. Strict System Separation
```text
Training Datasets ≠ Knowledge/RAG Corpus ≠ Conversation History ≠ Memory
```
- Ingesting a file into the Files/RAG view does not make it a training dataset.
- Ingesting a training dataset does not pollute conversational retrieval context.
- Conversion between subsystems must be explicit.

### B. File-Backed / Partitioned Storage
- Dataset metadata (versions, statistics, split ratios, content hashes) is stored in the application store.
- Massive raw dataset files remain file-backed.
- Processed records are partitioned by version ID with lazy-loading and paging.

### C. Immutability
Every change to content, normalization, schema, or split ratios produces a new `DatasetVersion` with its own `contentHash` and `versionNumber`. Historical versions remain fully reproducible and immutable.

### D. Deterministic Splitting
Splits are computed deterministically using a seed (default `42`) and linear congruential permutation. Reloading the same raw dataset with the same seed guarantees identical train/validation/test assignments.

### E. Exact-Content Leakage Protection
The system audits exact content overlap across:
- `train ↔ validation`
- `train ↔ test`
- `validation ↔ test`

Reports total leakage and lists duplicate content hashes to prevent synthetic overfitting.
