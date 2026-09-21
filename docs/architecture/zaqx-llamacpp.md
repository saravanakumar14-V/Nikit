# Nikit Phase 12 — ZaqX llama.cpp Architecture & GGUF Runtime Integration

## 1. GGML Tensor Graph Mapping

The ZaqX decoder-only Transformer maps to the standard GGML tensor naming convention:

| PyTorch Module Path | GGUF Tensor Identifier | Operation |
|---|---|---|
| `model.embed_tokens.weight` | `token_embd.weight` | Token Embedding Matrix |
| `model.layers.i.input_layernorm.weight` | `blk.i.attn_norm.weight` | Pre-Attention RMSNorm |
| `model.layers.i.self_attn.q_proj.weight` | `blk.i.attn_q.weight` | Query Linear Projection |
| `model.layers.i.self_attn.k_proj.weight` | `blk.i.attn_k.weight` | Key Linear Projection (GQA) |
| `model.layers.i.self_attn.v_proj.weight` | `blk.i.attn_v.weight` | Value Linear Projection (GQA) |
| `model.layers.i.self_attn.o_proj.weight` | `blk.i.attn_output.weight` | Attention Output Linear |
| `model.layers.i.post_attention_layernorm.weight` | `blk.i.ffn_norm.weight` | Pre-FFN RMSNorm |
| `model.layers.i.mlp.gate_proj.weight` | `blk.i.ffn_gate.weight` | SwiGLU Gate Linear |
| `model.layers.i.mlp.up_proj.weight` | `blk.i.ffn_up.weight` | SwiGLU Up Linear |
| `model.layers.i.mlp.down_proj.weight` | `blk.i.ffn_down.weight` | SwiGLU Down Linear |
| `model.norm.weight` | `output_norm.weight` | Final RMSNorm |
| `lm_head.weight` | `output.weight` | Causal LM Head Projection |

---

## 2. GGUF Metadata Structure

- `general.architecture = "zaqx"` (or `"llama"`)
- `zaqx.context_length = 1024`
- `zaqx.embedding_length = 256`
- `zaqx.block_count = 6`
- `zaqx.feed_forward_length = 688`
- `zaqx.attention.head_count = 4`
- `zaqx.attention.head_count_kv = 2`
- `zaqx.rope.freq_base = 10000.0`
- `zaqx.attention.layer_norm_rms_epsilon = 1e-5`
- `tokenizer.ggml.bos_token_id = 0`
- `tokenizer.ggml.eos_token_id = 1`
- `tokenizer.ggml.pad_token_id = 2`
- `tokenizer.ggml.unknown_token_id = 3`
