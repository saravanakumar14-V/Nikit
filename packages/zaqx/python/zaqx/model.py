"""
ZaqX PyTorch Neural Network Implementation.
Decoder-Only Transformer with RoPE, RMSNorm, GQA, and SwiGLU.
"""

import math
from typing import Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F
from .config import ZaqXConfig

class RMSNorm(nn.Module):
    def __init__(self, dim: int, eps: float = 1e-5):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        variance = x.pow(2).mean(-1, keepdim=True)
        return x * torch.rsqrt(variance + self.eps) * self.weight

class RotaryEmbedding(nn.Module):
    def __init__(self, dim: int, max_seq_len: int = 4096, theta: float = 10000.0):
        super().__init__()
        self.dim = dim
        self.max_seq_len = max_seq_len
        self.theta = theta

        inv_freq = 1.0 / (theta ** (torch.arange(0, dim, 2).float() / dim))
        self.register_buffer("inv_freq", inv_freq, persistent=False)

    def forward(self, x: torch.Tensor, seq_len: int) -> Tuple[torch.Tensor, torch.Tensor]:
        t = torch.arange(seq_len, device=x.device, dtype=self.inv_freq.dtype)
        freqs = torch.outer(t, self.inv_freq)
        emb = torch.cat((freqs, freqs), dim=-1)
        return emb.cos(), emb.sin()

def rotate_half(x: torch.Tensor) -> torch.Tensor:
    x1 = x[..., : x.shape[-1] // 2]
    x2 = x[..., x.shape[-1] // 2 :]
    return torch.cat((-x2, x1), dim=-1)

def apply_rotary_pos_emb(q: torch.Tensor, k: torch.Tensor, cos: torch.Tensor, sin: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
    cos = cos.unsqueeze(0).unsqueeze(1) # [1, 1, seq_len, dim]
    sin = sin.unsqueeze(0).unsqueeze(1)
    q_embed = (q * cos) + (rotate_half(q) * sin)
    k_embed = (k * cos) + (rotate_half(k) * sin)
    return q_embed, k_embed

class ZaqXAttention(nn.Module):
    def __init__(self, config: ZaqXConfig):
        super().__init__()
        self.hidden_size = config.hidden_size
        self.num_heads = config.num_attention_heads
        self.num_kv_heads = config.num_key_value_heads
        self.head_dim = config.head_dim
        self.num_kv_groups = self.num_heads // self.num_kv_heads

        self.q_proj = nn.Linear(self.hidden_size, self.num_heads * self.head_dim, bias=False)
        self.k_proj = nn.Linear(self.hidden_size, self.num_kv_heads * self.head_dim, bias=False)
        self.v_proj = nn.Linear(self.hidden_size, self.num_kv_heads * self.head_dim, bias=False)
        self.o_proj = nn.Linear(self.num_heads * self.head_dim, self.hidden_size, bias=False)

    def forward(
        self,
        hidden_states: torch.Tensor,
        cos: torch.Tensor,
        sin: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        bsz, q_len, _ = hidden_states.size()

        q = self.q_proj(hidden_states).view(bsz, q_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(hidden_states).view(bsz, q_len, self.num_kv_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(hidden_states).view(bsz, q_len, self.num_kv_heads, self.head_dim).transpose(1, 2)

        q, k = apply_rotary_pos_emb(q, k, cos[:q_len], sin[:q_len])

        # GQA: Repeat KV heads if num_kv_groups > 1
        if self.num_kv_groups > 1:
            k = k.repeat_interleave(self.num_kv_groups, dim=1)
            v = v.repeat_interleave(self.num_kv_groups, dim=1)

        scores = torch.matmul(q, k.transpose(2, 3)) / math.sqrt(self.head_dim)

        if attention_mask is not None:
            scores = scores + attention_mask

        probs = F.softmax(scores, dim=-1, dtype=torch.float32).to(q.dtype)
        output = torch.matmul(probs, v)
        output = output.transpose(1, 2).contiguous().view(bsz, q_len, -1)
        return self.o_proj(output)

class ZaqXSwiGLU(nn.Module):
    def __init__(self, config: ZaqXConfig):
        super().__init__()
        self.gate_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
        self.up_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
        self.down_proj = nn.Linear(config.intermediate_size, config.hidden_size, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x))

class ZaqXBlock(nn.Module):
    def __init__(self, config: ZaqXConfig):
        super().__init__()
        self.input_layernorm = RMSNorm(config.hidden_size, eps=config.norm_epsilon)
        self.self_attn = ZaqXAttention(config)
        self.post_attention_layernorm = RMSNorm(config.hidden_size, eps=config.norm_epsilon)
        self.mlp = ZaqXSwiGLU(config)

    def forward(
        self,
        hidden_states: torch.Tensor,
        cos: torch.Tensor,
        sin: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
    ) -> torch.Tensor:
        residual = hidden_states
        hidden_states = self.input_layernorm(hidden_states)
        hidden_states = self.self_attn(hidden_states, cos, sin, attention_mask)
        hidden_states = residual + hidden_states

        residual = hidden_states
        hidden_states = self.post_attention_layernorm(hidden_states)
        hidden_states = self.mlp(hidden_states)
        hidden_states = residual + hidden_states
        return hidden_states

class ZaqXModel(nn.Module):
    def __init__(self, config: ZaqXConfig):
        super().__init__()
        self.config = config
        self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
        self.layers = nn.ModuleList([ZaqXBlock(config) for _ in range(config.num_layers)])
        self.norm = RMSNorm(config.hidden_size, eps=config.norm_epsilon)
        self.rotary_emb = RotaryEmbedding(config.head_dim, config.max_context_length, config.rope_theta)

    def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
        bsz, seq_len = input_ids.size()
        hidden_states = self.embed_tokens(input_ids)

        cos, sin = self.rotary_emb(hidden_states, seq_len)

        # Build causal mask
        causal_mask = torch.full((seq_len, seq_len), float("-inf"), device=input_ids.device)
        causal_mask = torch.triu(causal_mask, diagonal=1).unsqueeze(0).unsqueeze(1)

        for layer in self.layers:
            hidden_states = layer(hidden_states, cos, sin, causal_mask)

        hidden_states = self.norm(hidden_states)
        return hidden_states

class ZaqXForCausalLM(nn.Module):
    def __init__(self, config: ZaqXConfig):
        super().__init__()
        self.config = config
        self.model = ZaqXModel(config)
        self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)

        if config.tie_word_embeddings:
            self.lm_head.weight = self.model.embed_tokens.weight

    def forward(
        self,
        input_ids: torch.Tensor,
        labels: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, Optional[torch.Tensor]]:
        hidden_states = self.model(input_ids)
        logits = self.lm_head(hidden_states)

        loss = None
        if labels is not None:
            # Shift tokens for autoregressive loss
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            loss = F.cross_entropy(shift_logits.view(-1, self.config.vocab_size), shift_labels.view(-1))

        return logits, loss
