import React from 'react';
import { Cpu, Terminal, FileCode, Layers } from 'lucide-react';
import styles from './SuggestionCards.module.css';

export interface SuggestionItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

export interface SuggestionCardsProps {
  onSelect: (prompt: string) => void;
}

const SUGGESTIONS: SuggestionItem[] = [
  {
    id: 'kv-cache',
    icon: <Cpu size={16} />,
    title: 'Explain KV-Cache Optimization',
    description: 'Analyze latent compression vs standard MHA memory',
    prompt: 'Explain how Multi-Head Latent Attention compresses KV-cache tensors during long-context generation.',
  },
  {
    id: 'cuda-kernel',
    icon: <Terminal size={16} />,
    title: 'Write C++ Inference Kernel',
    description: 'SIMD tensor operators and memory layout',
    prompt: 'Show a C++ SIMD kernel pattern for low-rank matrix decompression in attention layers.',
  },
  {
    id: 'bpe-tokenizer',
    icon: <FileCode size={16} />,
    title: 'Inspect Tokenizer Merges',
    description: 'Evaluate byte-pair encoding vocabulary efficiency',
    prompt: 'Explain the tradeoff between larger BPE vocabularies (e.g. 100k) and embedding table memory size.',
  },
  {
    id: 'memory-sharding',
    icon: <Layers size={16} />,
    title: 'Distributed Tensor Parallelism',
    description: 'Configure pipeline sharding and attention head partitioning',
    prompt: 'Explain the principles of Megatron-style tensor parallelism for attention heads across multiple GPUs.',
  },
];

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({ onSelect }) => {
  return (
    <div className={styles.container} role="region" aria-label="Prompt Suggestions">
      {SUGGESTIONS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.card}
          onClick={() => onSelect(item.prompt)}
        >
          <div className={styles.iconBox}>{item.icon}</div>
          <div className={styles.content}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.description}>{item.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
};
