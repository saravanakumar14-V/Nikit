# Nikit Phase 11 — ZaqX 1.0 Architecture & Model Family Specification

## 1. Overview & Core Philosophy

**ZaqX 1.0** is Nikit's proprietary neural language model family. Rather than assuming a single fixed model size, ZaqX is defined as a scalable decoder-only Transformer family supporting progressive scaling from tiny experimental models toward the largest model feasible on host hardware.

---

## 2. Architecture Diagram

```text
Embedding Layer (Vocab Size V × Hidden Size H)
        ↓
Rotary Position Embedding (RoPE)
        ↓
Transformer Block × L (Layers)
 ├── Pre-RMSNorm
 ├── Grouped-Query Attention (GQA)
 │    ├── Q Projection: H × H
 │    ├── K Projection: H × (numKVHeads × headDim)
 │    ├── V Projection: H × (numKVHeads × headDim)
 │    ├── RoPE Rotary Application
 │    ├── Lower-Triangular Causal Attention Mask
 │    └── Output Projection: H × H
 ├── Residual Connection
 ├── Pre-RMSNorm
 └── SwiGLU Feed-Forward Network (FFN)
      ├── Gate Projection: H × IntermediateSize I
      ├── Up Projection: H × IntermediateSize I
      ├── SiLU Gated Activation
      └── Down Projection: I × HiddenSize H
 └── Residual Connection
        ↓
Final RMSNorm Layer
        ↓
Causal LM Head (H × V, Tied/Untied Embeddings)
        ↓
Logits [Batch, Sequence, Vocab] & Causal Cross-Entropy Loss
```

---

## 3. Exact Deterministic Parameter Formula

The parameter calculator and PyTorch implementation share the exact same configuration specification:

$$\text{Embedding Parameters} = V \times H$$

$$\text{Attention per Layer} = H^2 + 2 \times H \times \left(n_{\text{KV}} \times \frac{H}{n_{\text{Heads}}}\right) + H^2$$

$$\text{SwiGLU FFN per Layer} = 3 \times H \times I$$

$$\text{RMSNorms} = (2 \times L + 1) \times H$$

$$\text{LM Head} = \begin{cases} 0 & \text{if tieWordEmbeddings = true} \\ H \times V & \text{if tieWordEmbeddings = false} \end{cases}$$

$$\text{Total Parameters} = \text{Embedding} + L \times (\text{Attention} + \text{FFN}) + \text{RMSNorms} + \text{LM Head}$$

---

## 4. Candidate Model Family Presets

| Scale | Layers ($L$) | Hidden ($H$) | Q Heads | KV Heads | Intermediate ($I$) | Vocab ($V$) | Context | Exact Params |
|---|---|---|---|---|---|---|---|---|
| **`experimental-tiny`** | 6 | 256 | 4 | 2 | 688 | 4,096 | 1,024 | **~5.40M** |
| **`experimental-small`** | 12 | 384 | 6 | 2 | 1024 | 8,192 | 2,048 | **~22.03M** |
| **`experimental-medium`** | 16 | 512 | 8 | 2 | 1376 | 16,384 | 2,048 | **~52.71M** |
| **`experimental-135m`** | 30 | 576 | 9 | 3 | 1536 | 49,152 | 2,048 | **~134.52M** |
| **`zaqx-1.0-candidate`** | 24 | 1024 | 16 | 4 | 2816 | 65,536 | 4,096 | **~404.80M** |
| **`custom`** | User | User | User | User | User | User | User | Exact Computed |
