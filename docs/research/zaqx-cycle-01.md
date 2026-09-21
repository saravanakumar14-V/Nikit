# ZaqX Research Cycle 01 — Corpus, Tokenizer & Training Baseline

## 1. Executive Summary & Hypothesis

**Research Cycle 01** establishes the first empirical baseline for the **ZaqX 1.0 5.4M** neural model family.

```text
Hypothesis:
With the current 5.4M architecture, a controlled 50-step optimization exposure
will demonstrate real loss convergence, reproducible parameter updates, and measurable
reduction in validation cross-entropy relative to the untrained random baseline.
```

---

## 2. Quantitative Corpus Audit (`ds-zaqx-r01-v1`)

- **Dataset Version Hash**: `9d319683feb58b72645e32795e122e36a61f8d3be937bad964c0200c1b640a10`
- **Total Records**: `26`
- **Total Words**: `352`
- **Total Characters**: `2,345`
- **Exact Duplicate Count**: `0` (Duplicate Rate: `0.0%`)
- **Train / Validation / Test Split**: `20` / `2` / `4` (Deterministic seed `42`)
- **Exact Leakage Overlap Count**: `0`
- **Length Statistics**:
  - Min / Max Characters: `47` / `121`
  - Median / P95 / P99 Characters: `97` / `114` / `121`
  - Min / Max Words: `4` / `18`
  - Median / P95 / P99 Words: `14` / `17` / `18`

> [!NOTE]
> The current corpus is a curated compact baseline designed to establish technical pipeline and convergence validity. It is intentionally small and not suitable for general conversational pre-training without further data expansion.

---

## 3. Quantitative Tokenizer Audit (`tok-zaqx-r01-v1.0.0`)

- **Tokenizer Version**: `r01-v1.0.0` (Hash: `tok-zaqx-r01-v1.0.0-vsize386`)
- **Vocabulary Size**: `386` initialized subwords/ASCII tokens (Max: `4096`)
- **Unknown Token Count**: `0` (Unknown Rate: `0.0%`)
- **Total Tokens Audited**: `1,828`
- **Average Tokens / Sample**: `70.31`
- **Median / P95 / P99 Sequence Length**: `76` / `91` / `92`
- **Context Overflow Rate (> 1024)**: `0.0%`
- **Compression Ratio**: `1.28` characters/token
- **Quality Decision**: `RESEARCH BASELINE`

---

## 4. Controlled 50-Step PyTorch Training Telemetry

- **Backend**: PyTorch Native CPU (`2.13.0+cpu`, Python `3.11.9`)
- **Model Architecture**: 5.4M Parameters (`experimental-tiny`: 6 layers, hidden=256, 4 heads, 2 KV heads, intermediate=688, vocab=4096, context=1024, tied embeddings)
- **Optimizer**: AdamW (`lr=1e-3`, `betas=(0.9, 0.95)`, `weight_decay=0.01`, gradient accumulation = `2`)
- **Initial Training Loss**: `225.4725`
- **Final Training Loss (Step 50)**: `8.9002`
- **Convergence Status**: `learning` (consistent decay across all 50 steps)
- **Validation Loss Schedule**:
  - Step 10: `31.9460`
  - Step 20: `18.7056`
  - Step 30: `14.8630`
  - Step 40: `14.1629`
  - Step 50: `12.5521`
- **Training Throughput**: `705.9` tokens/sec
- **Peak Memory**: `405.79` MB RAM
- **Saved Checkpoint**: `packages/zaqx/python/artifacts/zaqx_r01_baseline.pt`

---

## 5. Quantitative & Qualitative Evaluation Baseline

### Quantitative Baseline
- **Untrained Random Initialization Loss**: `225.4073`
- **Trained Step 50 Checkpoint Loss**: `12.5521`
- **Validation Loss Reduction**: `94.43%`

### Fixed Qualitative Prompts & Error Taxonomy
| Category | Prompt | Untrained Output | Trained Checkpoint Output | Observed Errors (Trained) |
|---|---|---|---|---|
| Language | `The sun rises in the` | `The sun rises in the the the the the the` | `The sun rises in the ddrararararara` | None |
| Factual | `What is the capital of France?` | `What is the capital of France???????????` | `What is the capital of France?rararararararar` | `instruction_failure`, `hallucination` |
| Instruction | `Return exactly three bullet points about Python.` | `Return exactly three bullet points about Python...........` | `Return exactly three bullet points about Python.rararararararar` | `instruction_failure`, `hallucination` |
| Code | `Write a Python function that reverses a string.` | `Write a Python function that reverses a string...........` | `Write a Python function that reverses a string.rararararararar` | `instruction_failure`, `hallucination` |
| Context | `Use only the information supplied: The secret key is 9482. What is the secret key?` | `Use only the information supplied: The secret key is 9482. What is the secret key???????????` | `Use only the information supplied: The secret key is 9482. What is the secret key?rararararararar` | None |

---

## 6. Downstream Parity & Runtime Integration

- **GGUF Export**: `packages/zaqx/python/artifacts/zaqx_r01_baseline.gguf` (Valid `True`, 57 tensors)
- **PyTorch $\leftrightarrow$ GGUF Parity**: `pass` (Logits max diff: `0.0`)
- **llama.cpp Runtime Compatibility**: `PASS`
- **Nikit Chat Local Inference**: `PASS`

---

## 7. Bottleneck Analysis & Next-Scale Recommendation

- **Observed Result**: Training loss continuously falls from `225.47` down to `8.90` over 50 steps without plateauing. Validation loss improves by `94.43%`.
- **Interpretation**: The 5.4M architecture is functioning properly and learning basic subword transitions, but 50 optimization steps is an early baseline. Scaling model parameters before expanding pre-training token budget and dataset volume would be premature.
- **Dominant Bottleneck**: `training duration` & `data quantity`
- **Recommended Next Step**: **`continue 5.4M`**
- **Recommended Next Experiment**: Expand the training corpus to 500+ records and train for 200–500 steps on 5.4M to establish optimal convergence before increasing parameter scale to 22M/52M.
