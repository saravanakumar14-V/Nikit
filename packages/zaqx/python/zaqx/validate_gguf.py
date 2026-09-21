"""
ZaqX GGUF Structural Validator.
Uses gguf.GGUFReader to inspect and validate converted GGUF model files.
"""

import os
import sys
import json
import hashlib
from typing import Dict, Any
import gguf

def calculate_sha256(filepath: str) -> str:
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha.update(chunk)
    return sha.hexdigest()

def validate_zaqx_gguf(gguf_path: str) -> Dict[str, Any]:
    if not os.path.exists(gguf_path):
        raise FileNotFoundError(f"GGUF file not found at: {gguf_path}")

    file_size = os.path.getsize(gguf_path)
    file_hash = calculate_sha256(gguf_path)

    reader = gguf.GGUFReader(gguf_path)

    # 1. Inspect KV Metadata
    kv_data: Dict[str, Any] = {}
    for field in reader.fields.values():
        key = field.name
        try:
            if field.types and field.types[0] == gguf.GGUFValueType.STRING:
                val = bytes(field.parts[field.data[0]]).decode("utf-8", errors="replace")
            elif field.types and field.types[0] == gguf.GGUFValueType.ARRAY:
                val = f"[array of {len(field.data)} items]"
            elif len(field.data) > 0 and field.data[0] < len(field.parts):
                part = field.parts[field.data[0]]
                if hasattr(part, "__len__") and len(part) == 1:
                    val = part[0].item() if hasattr(part[0], "item") else part[0]
                elif isinstance(part, (bytes, bytearray)):
                    val = part.decode("utf-8", errors="replace")
                else:
                    val = part.item() if hasattr(part, "item") else str(part)
            else:
                val = str(field)
        except Exception:
            val = str(field)
        kv_data[key] = val

    # 2. Inspect Tensors
    tensors_info = []
    for tensor in reader.tensors:
        tensors_info.append({
            "name": tensor.name,
            "shape": list(tensor.shape),
            "dtype": str(tensor.tensor_type),
            "sizeBytes": tensor.n_bytes,
        })

    # 3. Check Core Integrity Constraints
    arch = str(kv_data.get("general.architecture", ""))
    has_valid_arch = arch in ["zaqx", "llama"]
    has_tensors = len(reader.tensors) >= 10
    has_embedding = any(t.name == "token_embd.weight" for t in reader.tensors)
    has_output = any(t.name in ["output.weight", "output_norm.weight"] for t in reader.tensors)

    is_valid = bool(has_valid_arch and has_tensors and has_embedding and has_output)

    report = {
        "isValid": is_valid,
        "filePath": gguf_path,
        "fileSizeBytes": file_size,
        "fileHash": file_hash,
        "architecture": arch,
        "tensorCount": len(reader.tensors),
        "fieldsCount": len(reader.fields),
        "kvMetadata": {
            "general.architecture": arch,
            "context_length": kv_data.get(f"{arch}.context_length", kv_data.get("llama.context_length", "N/A")),
            "embedding_length": kv_data.get(f"{arch}.embedding_length", kv_data.get("llama.embedding_length", "N/A")),
            "block_count": kv_data.get(f"{arch}.block_count", kv_data.get("llama.block_count", "N/A")),
            "head_count": kv_data.get(f"{arch}.attention.head_count", kv_data.get("llama.attention.head_count", "N/A")),
            "head_count_kv": kv_data.get(f"{arch}.attention.head_count_kv", kv_data.get("llama.attention.head_count_kv", "N/A")),
        },
        "tensors": tensors_info,
    }

    return report

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_gguf.py <model.gguf>")
        sys.exit(1)

    res = validate_zaqx_gguf(sys.argv[1])
    print(json.dumps(res, indent=2))
