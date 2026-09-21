# Nikit Phase 10 — Tokenization & Evaluation Framework

## 1. Tokenization Architecture

```text
TokenizerRegistry
├── LlamaCppTokenizer (Authoritative Model Tokenizer: /tokenize & /detokenize)
└── HeuristicAnalyzer (Non-Authoritative Preview & Offline Testing)
```

### A. Authoritative vs Heuristic Separation
- **`LlamaCppTokenizer`**: The sole authoritative source for model token counts and token IDs, directly invoking `llama-server` `/tokenize` and `/detokenize` over local HTTP (127.0.0.1).
- **`HeuristicAnalyzer`**: Explicitly labeled `Heuristic Analysis (Not Model Tokenization)`. Used strictly for UI previews and offline testing; never claimed as authoritative model tokens or used for training preparation.

### B. Sequence Length & Packing Analysis
- **Sequence Length Distribution**: Computes min, max, mean, median, P95, P99 token counts, and percentage of samples within or exceeding context limits (e.g. 2048).
- **Sequence Packing Analysis**: Estimates packing efficiency, truncation rate, and wasted tokens for target sequence lengths.

---

## 2. Evaluation & Benchmark Suites

```text
EvaluationSuite (General QA, Code, Reasoning, Instruction Following, Safety, Custom)
        ↓
EvaluationCases (Prompt + Expected Output + System Prompt)
        ↓
EvaluationRunnerService
        ↓
ModelService / AIProvider.generate (Temperature = 0.1)
        ↓
EvaluationMetricsService (Exact Match, Token Match, Character Similarity)
        ↓
Reproducible EvaluationRun Record & Regression Matrix
```

### Metric Correctness & Invariants
1. **Exact Match**: Binary score (1.0 / 0.0) comparing normalized outputs.
2. **Character Similarity**: Dice coefficient / n-gram overlap between 0.0 and 1.0.
3. **Perplexity**: Only computed when the underlying model/runtime exposes token log-probabilities; otherwise marked `Unavailable`. Never approximated from generation latency or text length.
4. **Model Identity**: Every `EvaluationRun` preserves `modelId`, `modelVersion`, `modelFileHash`, `providerId`, `runtimeId`, `tokenizerId`, and `evaluationSuiteVersion`.
5. **Regression Matrix**: Generates direct delta comparisons between Candidate A and Candidate B on identical benchmark suites.
