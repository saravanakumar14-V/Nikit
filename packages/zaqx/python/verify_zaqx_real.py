"""
Real ZaqX 1.0 PyTorch Smoke Test & Acceptance Verification Script.
Executes real forward pass, causal loss, backward pass, optimizer step,
checkpoint serialization, resume validation, and evaluation against genuine PyTorch tensors.
"""

import os
import sys
import json
import hashlib
import torch
import torch.nn.functional as F
import torch.optim as optim

# Add package directory to sys.path
pkg_dir = os.path.dirname(os.path.abspath(__file__))
if pkg_dir not in sys.path:
    sys.path.insert(0, pkg_dir)

from zaqx.config import ZaqXConfig
from zaqx.model import ZaqXForCausalLM
from zaqx.tokenizer import ZaqXTokenizer

def calculate_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

def run_real_zaqx_acceptance():
    print("=== NIKIT ZAQX 1.0 REAL PYTORCH SMOKE TEST ===")

    # 1. Configuration for Experimental Tiny (~5.4M parameters)
    config = ZaqXConfig(
        name="ZaqX Experimental Tiny",
        scale="experimental-tiny",
        hidden_size=256,
        num_layers=6,
        num_attention_heads=4,
        num_key_value_heads=2,
        intermediate_size=688,
        vocab_size=4096,
        max_context_length=1024,
        rope_theta=10000.0,
        norm_epsilon=1e-5,
        activation="swiglu",
        norm_type="rmsnorm",
        use_gqa=True,
        use_rope=True,
        tie_word_embeddings=True
    )

    # 2. Parameter Count Verification
    calculated_params = config.calculate_total_params()
    model = ZaqXForCausalLM(config)
    actual_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"1. Calculated Parameters: {calculated_params}")
    print(f"   Actual PyTorch Parameters: {actual_params}")
    assert calculated_params == actual_params, f"Mismatch: {calculated_params} != {actual_params}"
    assert actual_params == 5401856, f"Expected 5401856, got {actual_params}"

    # 3. Real ZaqX Tokenizer
    tokenizer = ZaqXTokenizer(vocab_size=config.vocab_size)
    sample_text = "<|zaqx_bos|>Attention is all you need for ZaqX language model.<|zaqx_eos|>"
    tokens = tokenizer.encode(sample_text)
    decoded = tokenizer.decode(tokens)
    print(f"2. Tokenizer Encode Token Count: {len(tokens)}")
    print(f"   Tokenizer Decoded: {decoded}")
    assert len(tokens) > 0, "Tokenizer produced empty token list"
    assert tokens[0] == 0, "BOS token must be ID 0"
    assert tokens[-1] == 1, "EOS token must be ID 1"

    # 4. Real Forward Pass & Logits Shape
    input_tensor = torch.tensor([tokens], dtype=torch.long) # [batch=1, seq_len]
    logits, _ = model(input_tensor)
    expected_shape = (1, len(tokens), config.vocab_size)
    print(f"3. Forward Pass Logits Shape: {list(logits.shape)} (Expected: {list(expected_shape)})")
    assert logits.shape == expected_shape, f"Logits shape mismatch: {logits.shape} vs {expected_shape}"

    # 5. Real Causal Loss Computation
    logits, causal_loss = model(input_tensor, labels=input_tensor)
    initial_loss_val = causal_loss.item()
    print(f"4. Initial Causal LM Loss: {initial_loss_val:.4f}")
    assert causal_loss is not None and initial_loss_val > 0.0, "Causal loss was not computed"

    # 6. Real Backward Pass & Non-Zero Gradient Flow
    model.zero_grad()
    causal_loss.backward()

    sample_grad = model.model.layers[0].self_attn.q_proj.weight.grad
    assert sample_grad is not None, "Gradient is None on trainable layer"
    grad_norm = sample_grad.norm().item()
    print(f"5. Layer 0 Attention Q Weight Gradient Norm: {grad_norm:.6f}")
    assert grad_norm > 0.0, "Gradient norm is zero"

    # 7. Real Optimizer Step
    optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
    old_weight = model.model.layers[0].self_attn.q_proj.weight.clone()
    optimizer.step()
    new_weight = model.model.layers[0].self_attn.q_proj.weight
    weight_delta = (new_weight - old_weight).norm().item()
    print(f"6. Optimizer Step Weight Delta: {weight_delta:.6f}")
    assert weight_delta > 0.0, "Optimizer step did not update weights"

    # 8. Real Small Training Loop (5 Steps on Dataset)
    dataset = [
        "<|zaqx_bos|>ZaqX is a modern decoder-only neural language model.<|zaqx_eos|>",
        "<|zaqx_bos|>Grouped-query attention reduces memory bandwidth.<|zaqx_eos|>",
        "<|zaqx_bos|>Rotary positional embeddings enable relative position encoding.<|zaqx_eos|>",
        "<|zaqx_bos|>SwiGLU activation replaces standard MLP in transformer blocks.<|zaqx_eos|>",
        "<|zaqx_bos|>Root mean square normalization stabilizes pre-training gradients.<|zaqx_eos|>"
    ]

    print("7. Running 5 Real Training Steps...")
    step_losses = []
    for step, text in enumerate(dataset, start=1):
        item_tokens = tokenizer.encode(text)
        item_tensor = torch.tensor([item_tokens], dtype=torch.long)
        optimizer.zero_grad()
        _, step_loss = model(item_tensor, labels=item_tensor)
        step_loss_val = step_loss.item()
        step_loss.backward()
        optimizer.step()
        step_losses.append(step_loss_val)
        print(f"   Step {step}: Loss = {step_loss_val:.4f}")

    final_loss_val = step_losses[-1]
    print(f"   Final Loss after 5 steps: {final_loss_val:.4f}")

    # 9. Real Checkpoint Creation & File Verification
    output_dir = os.path.join(pkg_dir, "artifacts")
    os.makedirs(output_dir, exist_ok=True)
    ckpt_path = os.path.join(output_dir, "zaqx_tiny_checkpoint.pt")

    torch.save({
        "step": 5,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "config": config.__dict__,
        "final_loss": final_loss_val,
    }, ckpt_path)

    assert os.path.exists(ckpt_path), f"Checkpoint file not created at {ckpt_path}"
    ckpt_size = os.path.getsize(ckpt_path)
    ckpt_hash = calculate_sha256(ckpt_path)
    print(f"8. Checkpoint Written: {ckpt_path}")
    print(f"   Checkpoint File Size: {ckpt_size} bytes ({ckpt_size / (1024*1024):.2f} MB)")
    print(f"   Checkpoint SHA256: {ckpt_hash}")

    # 10. Checkpoint Reload & Resume Verification
    resumed_model = ZaqXForCausalLM(config)
    checkpoint_data = torch.load(ckpt_path, map_location="cpu")
    resumed_model.load_state_dict(checkpoint_data["model_state_dict"])
    model.eval()
    with torch.no_grad():
        original_trained_logits, _ = model(input_tensor)
        resumed_logits, _ = resumed_model(input_tensor)
        diff = (resumed_logits - original_trained_logits).abs().max().item()
        print(f"9. Checkpoint Reload Output Diff: {diff:.8f}")
        assert diff < 1e-4, "Reloaded model state did not reproduce checkpoint logits"

    # 11. Real Evaluation against Trained Checkpoint
    eval_samples = [
        "Language models predict next token probabilities.",
        "Grouped query attention uses multiple query heads per key-value head."
    ]
    eval_losses = []
    with torch.no_grad():
        for e_text in eval_samples:
            e_tokens = tokenizer.encode(e_text)
            e_tensor = torch.tensor([e_tokens], dtype=torch.long)
            _, e_loss = resumed_model(e_tensor, labels=e_tensor)
            eval_losses.append(e_loss.item())

    avg_eval_loss = sum(eval_losses) / len(eval_losses)
    print(f"10. Real Evaluation Loss across {len(eval_samples)} test samples: {avg_eval_loss:.4f}")

    # 12. Hardware Report
    report = {
        "status": "PASS",
        "modelScale": config.scale,
        "calculatedParams": calculated_params,
        "actualPyTorchParams": actual_params,
        "pythonVersion": sys.version.split()[0],
        "pytorchVersion": torch.__version__,
        "initialLoss": round(initial_loss_val, 4),
        "finalLoss": round(final_loss_val, 4),
        "evaluationLoss": round(avg_eval_loss, 4),
        "checkpointPath": ckpt_path,
        "checkpointSizeBytes": ckpt_size,
        "checkpointHash": ckpt_hash,
        "cudaAvailable": torch.cuda.is_available(),
    }

    report_path = os.path.join(output_dir, "acceptance_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"=== ACCEPTANCE TEST SUCCESS: Report saved to {report_path} ===")

if __name__ == "__main__":
    run_real_zaqx_acceptance()
