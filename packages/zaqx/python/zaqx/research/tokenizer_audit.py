"""
ZaqX Research Cycle 01 & 02 - Tokenizer Audit Stage.
Audits the real ZaqXTokenizer against the corpus:
- Total tokens, train/val/test token budgets
- Unknown token frequency and rate
- Sequence length percentiles (P50, P95, P99, max)
- Context overflow rate (context length bounds)
- Compression ratio, tokens/char, tokens/word
- Special-token usage counts.
"""

from typing import List, Dict, Any, Union
from ..tokenizer import ZaqXTokenizer, SPECIAL_TOKEN_IDS

class TokenizerAuditStage:
    @staticmethod
    def audit(
        tokenizer: ZaqXTokenizer,
        records: List[Union[str, Dict[str, Any]]],
        train_count: int = None,
        val_count: int = None,
        test_count: int = None,
        context_length: int = 1024
    ) -> Dict[str, Any]:
        if not records:
            raise ValueError("Corpus cannot be empty for tokenizer audit.")

        raw_texts = []
        for r in records:
            if isinstance(r, dict):
                t = r.get("text", "").strip()
            else:
                t = str(r).strip()
            if t:
                raw_texts.append(t)

        seq_lengths = []
        total_tokens = 0
        unknown_count = 0
        overflow_count = 0
        total_chars = sum(len(r) for r in raw_texts)
        total_words = sum(len(r.split()) for r in raw_texts)
        special_usage = {k: 0 for k in SPECIAL_TOKEN_IDS.keys()}

        tokenized_samples = []
        for text in raw_texts:
            tokens = tokenizer.encode(text)
            len_tok = len(tokens)
            seq_lengths.append(len_tok)
            total_tokens += len_tok
            tokenized_samples.append(tokens)

            if len_tok > context_length:
                overflow_count += 1

            for t in tokens:
                if t == SPECIAL_TOKEN_IDS.get("UNK", 3):
                    unknown_count += 1
                for s_name, s_id in SPECIAL_TOKEN_IDS.items():
                    if t == s_id:
                        special_usage[s_name] += 1

        seq_lengths.sort()
        n = len(seq_lengths)

        p50 = seq_lengths[n // 2] if n > 0 else 0
        p95 = seq_lengths[int(n * 0.95)] if n > 1 else (seq_lengths[-1] if n > 0 else 0)
        p99 = seq_lengths[int(n * 0.99)] if n > 1 else (seq_lengths[-1] if n > 0 else 0)
        max_len = seq_lengths[-1] if n > 0 else 0
        avg_tokens = round(total_tokens / max(1, n), 2)
        unknown_rate = round((unknown_count / max(1, total_tokens)) * 100.0, 4)
        overflow_rate = round((overflow_count / max(1, n)) * 100.0, 2)
        compression_ratio = round(total_chars / max(1, total_tokens), 2)
        tokens_per_char = round(total_tokens / max(1, total_chars), 4)
        tokens_per_word = round(total_tokens / max(1, total_words), 2)

        # Compute split token budgets if split counts are provided
        if train_count is not None and val_count is not None:
            train_toks = sum(len(s) for s in tokenized_samples[:train_count])
            val_toks = sum(len(s) for s in tokenized_samples[train_count:train_count + val_count])
            test_toks = sum(len(s) for s in tokenized_samples[train_count + val_count:])
        else:
            n_tr = int(n * 0.8)
            n_va = int(n * 0.1)
            train_toks = sum(len(s) for s in tokenized_samples[:n_tr])
            val_toks = sum(len(s) for s in tokenized_samples[n_tr:n_tr + n_va])
            test_toks = sum(len(s) for s in tokenized_samples[n_tr + n_va:])

        tok_hash = f"tok-zaqx-v{tokenizer.version}-vsize{tokenizer.vocab_size}"

        report = {
            "tokenizerVersion": f"v{tokenizer.version}",
            "tokenizerHash": tok_hash,
            "vocabSize": tokenizer.vocab_size,
            "unknownTokenCount": unknown_count,
            "unknownTokenRatePercent": unknown_rate,
            "totalTokensAudited": total_tokens,
            "trainTokens": train_toks,
            "valTokens": val_toks,
            "testTokens": test_toks,
            "tokensPerChar": tokens_per_char,
            "tokensPerWord": tokens_per_word,
            "averageTokensPerSample": avg_tokens,
            "medianTokensPerSample": p50,
            "p50SeqLen": p50,
            "p95SeqLen": p95,
            "p99SeqLen": p99,
            "maxSeqLen": max_len,
            "contextOverflowRatePercent": overflow_rate,
            "compressionRatio": compression_ratio,
            "specialTokensUsage": special_usage,
            "qualityDecision": "SUITABLE FOR TRAINING" if unknown_rate < 1.0 else "RESEARCH BASELINE",
            "auditedAt": "2026-08-28T14:15:00Z",
        }

        return report
