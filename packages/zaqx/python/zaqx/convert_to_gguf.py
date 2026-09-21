"""
ZaqX PyTorch Checkpoint to GGUF Converter.
Uses gguf.GGUFWriter to produce a binary GGUF model with accurate tensor mappings and architecture metadata.
"""

import os
import sys
import numpy as np
import torch
import gguf

from .config import ZaqXConfig
from .tokenizer import ZaqXTokenizer, SPECIAL_TOKEN_IDS

def convert_zaqx_checkpoint_to_gguf(
    checkpoint_path: str,
    output_gguf_path: str,
    architecture_name: str = "zaqx"
) -> str:
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

    # 1. Load Checkpoint
    checkpoint_data = torch.load(checkpoint_path, map_location="cpu")
    state_dict = checkpoint_data.get("model_state_dict", checkpoint_data)
    config_dict = checkpoint_data.get("config", {})

    hidden_size = config_dict.get("hidden_size", 256)
    num_layers = config_dict.get("num_layers", 6)
    num_attention_heads = config_dict.get("num_attention_heads", 4)
    num_key_value_heads = config_dict.get("num_key_value_heads", 2)
    intermediate_size = config_dict.get("intermediate_size", 688)
    vocab_size = config_dict.get("vocab_size", 4096)
    max_context_length = config_dict.get("max_context_length", 1024)
    rope_theta = config_dict.get("rope_theta", 10000.0)
    norm_epsilon = config_dict.get("norm_epsilon", 1e-5)
    model_name = config_dict.get("name", "ZaqX 1.0 Candidate")

    # 2. Setup GGUF Writer
    writer = gguf.GGUFWriter(output_gguf_path, architecture_name)

    # 3. Model Metadata
    writer.add_name(model_name)
    writer.add_context_length(max_context_length)
    writer.add_embedding_length(hidden_size)
    writer.add_block_count(num_layers)
    writer.add_feed_forward_length(intermediate_size)
    writer.add_head_count(num_attention_heads)
    writer.add_head_count_kv(num_key_value_heads)
    writer.add_rope_freq_base(rope_theta)
    writer.add_layer_norm_rms_eps(norm_epsilon)

    # 4. Tokenizer Metadata
    tokenizer = ZaqXTokenizer(vocab_size=vocab_size)
    tokens_list = []
    scores_list = []
    tok_types_list = []

    for i in range(vocab_size):
        tok_str = tokenizer.reverse_vocab.get(i, f"<token_{i}>")
        tokens_list.append(tok_str)
        scores_list.append(0.0)
        # Type 1 = normal, 2 = unknown, 3 = control
        if i in SPECIAL_TOKEN_IDS.values():
            tok_types_list.append(3) # Control token
        else:
            tok_types_list.append(1) # Normal token

    writer.add_tokenizer_model("gpt2")
    writer.add_token_list(tokens_list)
    writer.add_token_scores(scores_list)
    writer.add_token_types(tok_types_list)
    writer.add_bos_token_id(0)
    writer.add_eos_token_id(1)
    writer.add_pad_token_id(2)
    writer.add_unk_token_id(3)

    # 5. Tensor Mapping: PyTorch -> GGML / GGUF standard tensor naming
    tensor_map = {
        "model.embed_tokens.weight": "token_embd.weight",
        "model.norm.weight": "output_norm.weight",
    }

    if "lm_head.weight" in state_dict:
        tensor_map["lm_head.weight"] = "output.weight"
    elif "model.embed_tokens.weight" in state_dict:
        # Tied embeddings
        tensor_map["model.embed_tokens.weight_tied_head"] = "output.weight"

    for i in range(num_layers):
        tensor_map[f"model.layers.{i}.input_layernorm.weight"] = f"blk.{i}.attn_norm.weight"
        tensor_map[f"model.layers.{i}.self_attn.q_proj.weight"] = f"blk.{i}.attn_q.weight"
        tensor_map[f"model.layers.{i}.self_attn.k_proj.weight"] = f"blk.{i}.attn_k.weight"
        tensor_map[f"model.layers.{i}.self_attn.v_proj.weight"] = f"blk.{i}.attn_v.weight"
        tensor_map[f"model.layers.{i}.self_attn.o_proj.weight"] = f"blk.{i}.attn_output.weight"
        tensor_map[f"model.layers.{i}.post_attention_layernorm.weight"] = f"blk.{i}.ffn_norm.weight"
        tensor_map[f"model.layers.{i}.mlp.gate_proj.weight"] = f"blk.{i}.ffn_gate.weight"
        tensor_map[f"model.layers.{i}.mlp.up_proj.weight"] = f"blk.{i}.ffn_up.weight"
        tensor_map[f"model.layers.{i}.mlp.down_proj.weight"] = f"blk.{i}.ffn_down.weight"

    # 6. Add Tensors to GGUF Writer (FP16 or FP32)
    for pt_name, gguf_name in tensor_map.items():
        if pt_name == "model.embed_tokens.weight_tied_head":
            tensor_data = state_dict["model.embed_tokens.weight"].detach().cpu().numpy().astype(np.float32)
        elif pt_name in state_dict:
            tensor_data = state_dict[pt_name].detach().cpu().numpy().astype(np.float32)
        else:
            continue

        writer.add_tensor(gguf_name, tensor_data)

    # 7. Finalize and Write File
    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file()
    writer.close()

    return output_gguf_path

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert_to_gguf.py <checkpoint.pt> <output.gguf>")
        sys.exit(1)

    ckpt_path = sys.argv[1]
    gguf_path = sys.argv[2]
    out = convert_zaqx_checkpoint_to_gguf(ckpt_path, gguf_path)
    print(f"GGUF Export Complete: {out}")
