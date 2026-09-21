"""
ZaqX Architectural Configuration & Parameter Calculator.
"""

from dataclasses import dataclass
from typing import Literal

@dataclass
class ZaqXConfig:
    name: str = "ZaqX 1.0 (Candidate Architecture)"
    scale: str = "experimental-tiny"
    hidden_size: int = 256
    num_layers: int = 6
    num_attention_heads: int = 4
    num_key_value_heads: int = 2
    intermediate_size: int = 688
    vocab_size: int = 4096
    max_context_length: int = 1024
    rope_theta: float = 10000.0
    norm_epsilon: float = 1e-5
    activation: Literal["swiglu", "gelu", "silu"] = "swiglu"
    norm_type: Literal["rmsnorm", "layernorm"] = "rmsnorm"
    use_gqa: bool = True
    use_rope: bool = True
    tie_word_embeddings: bool = True

    def __post_init__(self):
        if self.hidden_size % self.num_attention_heads != 0:
            raise ValueError(f"hidden_size ({self.hidden_size}) must be divisible by num_attention_heads ({self.num_attention_heads})")
        if self.use_gqa and self.num_attention_heads % self.num_key_value_heads != 0:
            raise ValueError(f"num_attention_heads ({self.num_attention_heads}) must be divisible by num_key_value_heads ({self.num_key_value_heads})")

    @property
    def head_dim(self) -> int:
        return self.hidden_size // self.num_attention_heads

    def calculate_total_params(self) -> int:
        """
        Calculates exact parameter count matching PyTorch tensor allocations.
        """
        H = self.hidden_size
        L = self.num_layers
        n_kv = self.num_key_value_heads
        d_head = self.head_dim
        I = self.intermediate_size
        V = self.vocab_size

        embed_params = V * H
        attn_per_layer = (H * H) + (H * n_kv * d_head) + (H * n_kv * d_head) + (H * H)
        mlp_per_layer = 3 * H * I
        norm_params = (2 * L + 1) * H
        lm_head_params = 0 if self.tie_word_embeddings else (H * V)

        return embed_params + (L * (attn_per_layer + mlp_per_layer)) + norm_params + lm_head_params
