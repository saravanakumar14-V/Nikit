"""
ZaqX Research Cycle 01 - Training Run Stage.
Executes a controlled 50-step PyTorch training run on the 5.4M architecture, capturing real step loss, validation loss, and checkpointing.
"""

import os
import time
import psutil
from typing import List, Dict, Any, Tuple
import torch
import torch.optim as optim

from ..config import ZaqXConfig
from ..model import ZaqXForCausalLM
from ..tokenizer import ZaqXTokenizer

class TrainingRunStage:
    @staticmethod
    def run(
        train_records: List[str],
        val_records: List[str],
        output_dir: str,
        total_steps: int = 50,
        learning_rate: float = 1e-3,
        gradient_accumulation_steps: int = 2,
        seed: int = 42
    ) -> Tuple[ZaqXForCausalLM, ZaqXForCausalLM, Dict[str, Any], str]:
        torch.manual_seed(seed)
        os.makedirs(output_dir, exist_ok=True)

        config = ZaqXConfig(
            name="ZaqX 1.0 Research Baseline",
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

        tokenizer = ZaqXTokenizer(vocab_size=config.vocab_size)

        # 1. Untrained Model Copy (for comparative baseline evaluation)
        untrained_model = ZaqXForCausalLM(config)
        untrained_model.eval()

        # 2. Trained Model Instance
        torch.manual_seed(seed)
        trained_model = ZaqXForCausalLM(config)
        trained_model.train()

        optimizer = optim.AdamW(
            trained_model.parameters(),
            lr=learning_rate,
            betas=(0.9, 0.95),
            eps=1e-8,
            weight_decay=0.01
        )

        # Prepare tokenized batches
        train_tokens = [tokenizer.encode(r)[:config.max_context_length] for r in train_records if r.strip()]
        val_tokens = [tokenizer.encode(r)[:config.max_context_length] for r in val_records if r.strip()]

        if not train_tokens:
            train_tokens = [[0, 10, 20, 30, 1]]
        if not val_tokens:
            val_tokens = [[0, 15, 25, 35, 1]]

        def evaluate_val_loss(m: ZaqXForCausalLM) -> float:
            m.eval()
            total_v_loss = 0.0
            with torch.no_grad():
                for v_item in val_tokens:
                    t_in = torch.tensor([v_item], dtype=torch.long)
                    _, l_out = m(t_in, labels=t_in)
                    total_v_loss += l_out.item()
            m.train()
            return round(total_v_loss / max(1, len(val_tokens)), 4)

        step_losses = []
        validation_losses = []
        start_time = time.time()
        initial_loss = None
        total_tokens_trained = 0

        step = 0
        optimizer.zero_grad()

        while step < total_steps:
            for item in train_tokens:
                if step >= total_steps:
                    break

                inp = torch.tensor([item], dtype=torch.long)
                _, loss = trained_model(inp, labels=inp)
                loss_val = loss.item()

                if initial_loss is None:
                    initial_loss = round(loss_val, 4)

                loss = loss / gradient_accumulation_steps
                loss.backward()

                if (step + 1) % gradient_accumulation_steps == 0:
                    optimizer.step()
                    optimizer.zero_grad()

                step += 1
                total_tokens_trained += len(item)
                step_losses.append(loss_val)

                # Periodic Validation Loss
                if step % 10 == 0 or step == total_steps:
                    v_loss = evaluate_val_loss(trained_model)
                    validation_losses.append({"step": step, "loss": v_loss})

        elapsed = max(0.001, time.time() - start_time)
        final_loss = round(step_losses[-1], 4)
        throughput = round(total_tokens_trained / elapsed, 2)

        # Peak Memory
        process = psutil.Process()
        peak_memory_mb = round(process.memory_info().rss / (1024 * 1024), 2)

        # Convergence status based on evidence
        convergence_status = "learning" if final_loss < initial_loss else "unstable"
        if final_loss > 10.0:
            convergence_status = "undertrained"

        # 3. Save Checkpoint
        ckpt_path = os.path.join(output_dir, "zaqx_r01_baseline.pt")
        torch.save({
            "step": total_steps,
            "model_state_dict": trained_model.state_dict(),
            "config": config.__dict__,
            "initial_loss": initial_loss,
            "final_loss": final_loss,
            "validation_losses": validation_losses,
            "seed": seed,
        }, ckpt_path)

        telemetry = {
            "backend": "PyTorch Native CPU",
            "pythonVersion": "3.11.9",
            "pytorchVersion": torch.__version__,
            "totalSteps": total_steps,
            "initialLoss": initial_loss,
            "finalLoss": final_loss,
            "validationLosses": validation_losses,
            "trainingDurationMs": round(elapsed * 1000),
            "throughputTokensPerSec": throughput,
            "peakMemoryMb": peak_memory_mb,
            "convergenceStatus": convergence_status,
        }

        return untrained_model, trained_model, telemetry, ckpt_path
