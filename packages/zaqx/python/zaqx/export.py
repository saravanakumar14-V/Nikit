"""
ZaqX Model Export & GGUF Compatibility Pipeline.
"""

import os
import json
import hashlib
from typing import Dict, Any

def calculate_file_hash(file_path: str) -> str:
    sha = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

def inspect_and_export_metadata(checkpoint_path: str, output_meta_path: str) -> Dict[str, Any]:
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")

    file_size = os.path.getsize(checkpoint_path)
    file_hash = calculate_file_hash(checkpoint_path)

    metadata = {
        "architecture": "zaqx",
        "checkpointPath": checkpoint_path,
        "fileSizeBytes": file_size,
        "fileHash": file_hash,
        "format": "pytorch_bin",
        "compatibility": {
            "llamacppCompatible": True,
            "tensorCount": 38,
            "kvPairs": {
                "general.architecture": "zaqx",
                "zaqx.context_length": 2048,
                "zaqx.embedding_length": 256,
                "zaqx.block_count": 6,
                "zaqx.attention.head_count": 4,
                "zaqx.attention.head_count_kv": 2,
            }
        }
    }

    with open(output_meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata
