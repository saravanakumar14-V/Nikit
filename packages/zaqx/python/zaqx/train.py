"""
PyTorch Training Engine for ZaqX Language Models.
Executes training loop and emits structured JSON event stream.
"""

import os
import sys
import json
import time
import argparse
from typing import List
import torch
import torch.optim as optim

from .config import ZaqXConfig
from .model import ZaqXForCausalLM
from .tokenizer import ZaqXTokenizer

def emit_event(event_type: str, run_id: str, **kwargs):
    payload = {
        "type": event_type,
        "runId": run_id,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **kwargs
    }
    print(json.dumps(payload), flush=True)

def train(
    run_id: str,
    config: ZaqXConfig,
    dataset_records: List[str],
    output_dir: str,
    max_steps: int = 10,
    batch_size: int = 2,
    gradient_accumulation_steps: int = 2,
    learning_rate: float = 1e-3,
    checkpoint_interval: int = 5,
    device: str = "cpu"
):
    emit_event("training_started", run_id, config=config.__dict__)

    os.makedirs(output_dir, exist_ok=True)
    device_obj = torch.device(device)

    tokenizer = ZaqXTokenizer(vocab_size=config.vocab_size)
    model = ZaqXForCausalLM(config).to(device_obj)
    model.train()

    optimizer = optim.AdamW(model.parameters(), lr=learning_rate, betas=(0.9, 0.95), eps=1e-8, weight_decay=0.01)

    # Tokenize records
    tokenized_data = []
    for text in dataset_records:
        tokens = tokenizer.encode(text)
        if len(tokens) >= 2:
            tokenized_data.append(tokens[:config.max_context_length])

    if not tokenized_data:
        tokenized_data = [[0, 10, 20, 30, 1], [0, 15, 25, 35, 1]]

    step = 0
    total_loss = 0.0
    optimizer.zero_grad()

    while step < max_steps:
        for item in tokenized_data:
            if step >= max_steps:
                break

            input_tensor = torch.tensor([item], dtype=torch.long, device=device_obj)
            _, loss = model(input_tensor, labels=input_tensor)

            loss_val = loss.item()
            loss = loss / gradient_accumulation_steps
            loss.backward()

            if (step + 1) % gradient_accumulation_steps == 0:
                optimizer.step()
                optimizer.zero_grad()

            step += 1
            total_loss += loss_val

            emit_event(
                "step_completed",
                run_id,
                step=step,
                loss=round(loss_val, 4),
                learningRate=learning_rate
            )

            # Checkpointing
            if step % checkpoint_interval == 0 or step == max_steps:
                ckpt_path = os.path.join(output_dir, f"zaqx-step-{step}.pt")
                torch.save({
                    "step": step,
                    "model_state_dict": model.state_dict(),
                    "config": config.__dict__,
                }, ckpt_path)
                emit_event("checkpoint_created", run_id, step=step, checkpointPath=ckpt_path)

    avg_loss = total_loss / max(1, step)
    emit_event("training_completed", run_id, totalSteps=step, averageLoss=round(avg_loss, 4))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", type=str, default="zaqx-dev-run")
    parser.add_argument("--max-steps", type=int, default=5)
    parser.add_argument("--output-dir", type=str, default="./checkpoints")
    args = parser.parse_args()

    cfg = ZaqXConfig(num_layers=2, hidden_size=64, num_attention_heads=2, num_key_value_heads=1, intermediate_size=128, vocab_size=512)
    sample_records = ["Hello world from ZaqX Transformer training.", "Attention is all you need for language modeling."]
    train(args.run_id, cfg, sample_records, args.output_dir, max_steps=args.max_steps)
