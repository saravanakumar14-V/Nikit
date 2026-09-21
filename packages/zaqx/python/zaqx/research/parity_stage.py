"""
ZaqX Research Cycle 01 - Parity Stage.
Performs GGUF conversion, structural validation, and PyTorch <-> GGUF parity checks.
"""

from typing import Dict, Any, Tuple
from ..convert_to_gguf import convert_zaqx_checkpoint_to_gguf
from ..validate_gguf import validate_zaqx_gguf
from ..parity_test import run_parity_test

class ParityCheckStage:
    @staticmethod
    def run(
        checkpoint_path: str,
        output_gguf_path: str,
        test_prompt: str = "Attention is all you need"
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        # 1. Convert to GGUF
        convert_zaqx_checkpoint_to_gguf(checkpoint_path, output_gguf_path, architecture_name="zaqx")

        # 2. Structural GGUF Validation
        validation_report = validate_zaqx_gguf(output_gguf_path)

        # 3. Parity Check
        parity_result = run_parity_test(checkpoint_path, output_gguf_path, test_prompt)

        return validation_report, parity_result
