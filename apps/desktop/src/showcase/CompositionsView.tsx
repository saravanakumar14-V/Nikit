import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  IconButton,
  Badge,
  Avatar,
  Divider,
  Popover,
  Tooltip,
} from '@nikit/ui';
import {
  Sparkles,
  Paperclip,
  Mic,
  ArrowUp,
  Terminal,
  Copy,
  RotateCcw,
  Check,
  Folder,
  FileText,
  Brain,
  ChevronDown,
  Code2,
} from 'lucide-react';
import styles from './Showcase.module.css';

export const CompositionsView: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [runtimePopoverOpen, setRuntimePopoverOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState({
    name: 'ZaqX 1.0',
    desc: 'Local · Balanced · 7B FP16',
  });
  const [composerText, setComposerText] = useState(
    'Can you explain how the multi-head latent attention mechanism works in ZaqX 1.0 compared to standard MHA?'
  );

  const handleCopy = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Compositions & Product Patterns</h2>
        <p className={styles.sectionSubtitle}>
          Realistic Nikit UI compositions built exclusively from the foundational primitives.
        </p>
      </div>

      <div className={styles.compositionsGrid}>
        {/* 1. Model Selector Pattern */}
        <Card variant="elevated" className={styles.patternCard}>
          <CardHeader
            title="1. Model Selector Popover"
            subtitle="Decoupled provider abstraction supporting ZaqX (Prototype), Local runtimes, and Cloud."
          />
          <CardContent>
            <div style={{ padding: 'var(--nikit-space-3) 0' }}>
              <Popover
                open={modelSelectorOpen}
                onOpenChange={setModelSelectorOpen}
                width={360}
                trigger={
                  <button type="button" className={styles.modelSelectorTrigger}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} className={styles.accentIcon} />
                      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--nikit-text-primary)' }}>
                          {selectedModel.name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--nikit-text-tertiary)' }}>
                          {selectedModel.desc}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge variant="warning" size="sm">
                        Prototype
                      </Badge>
                      <ChevronDown size={14} style={{ color: 'var(--nikit-text-tertiary)' }} />
                    </div>
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className={styles.popoverSectionHeader}>FUTURE & EXPERIMENTAL MODELS</div>
                  <div
                    className={`${styles.modelOptionItem} ${
                      selectedModel.name === 'ZaqX 1.0 (Prototype)' ? styles.modelOptionActive : ''
                    }`}
                    onClick={() => {
                      setSelectedModel({ name: 'ZaqX 1.0 (Prototype)', desc: 'Design Phase · Untrained Architecture' });
                      setModelSelectorOpen(false);
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--nikit-text-primary)' }}>
                          ZaqX 1.0 (Prototype)
                        </span>
                        <Badge variant="warning" size="sm">
                          Planned
                        </Badge>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--nikit-text-tertiary)' }}>
                        Proprietary future architecture · Specifications are prototype placeholders
                      </span>
                    </div>
                  </div>

                  <Divider />
                  <div className={styles.popoverSectionHeader}>LOCAL THIRD-PARTY MODELS</div>

                  <div
                    className={`${styles.modelOptionItem} ${
                      selectedModel.name === 'Llama 3 8B Instruct' ? styles.modelOptionActive : ''
                    }`}
                    onClick={() => {
                      setSelectedModel({ name: 'Llama 3 8B Instruct', desc: 'Local GGUF via Ollama / llama.cpp' });
                      setModelSelectorOpen(false);
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--nikit-text-primary)' }}>
                        Llama 3 8B Instruct
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--nikit-text-tertiary)' }}>
                        Q4_K_M · Ollama / llama.cpp runtime when connected
                      </span>
                    </div>
                  </div>
                </div>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* 2. Local Runtime Status Popover */}
        <Card variant="elevated" className={styles.patternCard}>
          <CardHeader
            title="2. Local Runtime Status Popover"
            subtitle="Live hardware detection and inference telemetry without cluttering chat."
          />
          <CardContent>
            <div style={{ padding: 'var(--nikit-space-3) 0' }}>
              <Popover
                open={runtimePopoverOpen}
                onOpenChange={setRuntimePopoverOpen}
                width={320}
                trigger={
                  <button type="button" className={styles.runtimeTriggerButton}>
                    <span className={styles.runtimeLivePulse} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--nikit-text-primary)' }}>
                      Local Hardware: Unknown
                    </span>
                    <Badge variant="default" size="sm">
                      Pending
                    </Badge>
                  </button>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Local System State</span>
                    <Badge variant="warning" size="sm">
                      Prototype Telemetry
                    </Badge>
                  </div>
                  <Divider />
                  <div className={styles.telemetryGrid}>
                    <div className={styles.telemetryItem}>
                      <span className={styles.telemetryLabel}>GPU / Device</span>
                      <span className={styles.telemetryVal}>Unknown (Detection Pending)</span>
                    </div>
                    <div className={styles.telemetryItem}>
                      <span className={styles.telemetryLabel}>VRAM Used</span>
                      <span className={styles.telemetryVal}>Unknown</span>
                    </div>
                    <div className={styles.telemetryItem}>
                      <span className={styles.telemetryLabel}>System RAM</span>
                      <span className={styles.telemetryVal}>Unknown</span>
                    </div>
                    <div className={styles.telemetryItem}>
                      <span className={styles.telemetryLabel}>Inference Speed</span>
                      <span className={styles.telemetryVal}>Uninitialized (Demo)</span>
                    </div>
                  </div>
                </div>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* 3. Global Composer Pattern */}
        <Card variant="elevated" className={styles.patternCard} style={{ gridColumn: '1 / -1' }}>
          <CardHeader
            title="3. Global Composer"
            subtitle="The central input engine: multi-line auto-expansion, attachment slots, tool picker, model badge, send button."
          />
          <CardContent>
            <div className={styles.composerWrapper}>
              <div className={styles.composerCard}>
                <textarea
                  className={styles.composerInput}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder="Ask anything or mention @files, @projects..."
                  rows={2}
                />

                <div className={styles.composerToolbar}>
                  <div className={styles.composerToolsLeft}>
                    <Tooltip content="Attach files or datasets">
                      <IconButton
                        icon={<Paperclip size={16} />}
                        aria-label="Attach files"
                        variant="ghost"
                        size="sm"
                      />
                    </Tooltip>
                    <Tooltip content="Code Interpreter & Tools">
                      <IconButton
                        icon={<Terminal size={16} />}
                        aria-label="Tools"
                        variant="ghost"
                        size="sm"
                      />
                    </Tooltip>
                    <Tooltip content="Voice Input (Placeholder)">
                      <IconButton
                        icon={<Mic size={16} />}
                        aria-label="Voice input"
                        variant="ghost"
                        size="sm"
                      />
                    </Tooltip>

                    <div className={styles.modelTagPill}>
                      <Sparkles size={12} className={styles.accentIcon} />
                      <span>ZaqX 1.0</span>
                    </div>
                  </div>

                  <div className={styles.composerToolsRight}>
                    <span className={styles.shortcutHint}>Enter to send</span>
                    <IconButton
                      icon={<ArrowUp size={16} />}
                      aria-label="Send message"
                      variant="primary"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Message Card Pattern */}
        <Card variant="elevated" className={styles.patternCard} style={{ gridColumn: '1 / -1' }}>
          <CardHeader
            title="4. Message Card with Markdown & Code Execution"
            subtitle="Contextual action bar, model attribution, and syntax formatting."
          />
          <CardContent>
            <div className={styles.messageContainer}>
              {/* Message Header */}
              <div className={styles.messageHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar name="ZaqX" size="sm" status="local" />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>ZaqX 1.0 (Prototype)</span>
                  <Badge variant="warning" size="sm">
                    Prototype
                  </Badge>
                  <span style={{ fontSize: '11px', color: 'var(--nikit-text-tertiary)' }}>
                    Demo Telemetry (Prototype)
                  </span>
                </div>

                <div className={styles.messageActions}>
                  <Tooltip content="Copy message">
                    <IconButton
                      icon={copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      aria-label="Copy message"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                    />
                  </Tooltip>
                  <Tooltip content="Regenerate with ZaqX 1.0 (Prototype)">
                    <IconButton
                      icon={<RotateCcw size={14} />}
                      aria-label="Regenerate"
                      variant="ghost"
                      size="sm"
                    />
                  </Tooltip>
                </div>
              </div>

              {/* Message Body */}
              <div className={styles.messageBody}>
                <p>
                  In the planned <strong>ZaqX 1.0</strong> architecture, Multi-Head Latent Attention (MLA)
                  is designed to compress Key-Value cache tensors into a low-rank latent vector prior to attention
                  projection. <em>(Note: ZaqX is an untrained future architecture; performance parameters are prototype placeholders).</em>
                </p>

                {/* Code Block Container */}
                <div className={styles.codeBlock}>
                  <div className={styles.codeHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code2 size={13} style={{ color: 'var(--nikit-text-tertiary)' }} />
                      <span>zaqx_latent_attention.py</span>
                    </div>
                    <button type="button" className={styles.codeCopyButton} onClick={handleCopy}>
                      {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className={styles.codeContent}>
{`class MultiHeadLatentAttention(nn.Module):
    def __init__(self, dim: int, num_heads: int, latent_dim: int):
        super().__init__()
        self.dim = dim
        self.num_heads = num_heads
        self.latent_dim = latent_dim
        
        # Compress KV projection into low-rank latent representation
        self.w_kv_compress = nn.Linear(dim, latent_dim, bias=False)
        self.w_kv_decompress = nn.Linear(latent_dim, dim * 2, bias=False)`}
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Project Card Pattern */}
        <Card variant="elevated" className={styles.patternCard}>
          <CardHeader
            title="5. AI Workspace / Project Card"
            subtitle="Persistent context workspace bundling chats, files, memory, and model."
          />
          <CardContent>
            <div className={styles.projectCardDemo}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className={styles.projectIcon}>
                    <Folder size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>LLM Research</h4>
                    <span style={{ fontSize: '11px', color: 'var(--nikit-text-tertiary)' }}>
                      Updated 2 hours ago
                    </span>
                  </div>
                </div>
                <Badge variant="accent" size="sm">
                  ZaqX 1.0
                </Badge>
              </div>

              <p style={{ margin: 0, fontSize: '12px', color: 'var(--nikit-text-secondary)' }}>
                Attention research, tokenizer optimization experiments, and PyTorch training run analysis.
              </p>

              <div className={styles.projectStatsRow}>
                <span className={styles.projectStat}>
                  <FileText size={12} /> 6 Files
                </span>
                <span className={styles.projectStat}>
                  <Terminal size={12} /> 14 Chats
                </span>
                <span className={styles.projectStat}>
                  <Brain size={12} /> 8 Memories
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
