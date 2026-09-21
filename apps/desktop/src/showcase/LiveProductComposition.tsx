import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Badge,
  Avatar,
  Divider,
  Popover,
  Tooltip,
  CommandSurface,
} from '@nikit/ui';
import {
  Sparkles,
  Search,
  Plus,
  MessageSquare,
  Folder,
  Cpu,
  Settings,
  Paperclip,
  Terminal,
  Mic,
  ArrowUp,
  Copy,
  RotateCcw,
  Check,
  Code2,
  ChevronDown,
  Layers,
} from 'lucide-react';
import styles from './LiveProduct.module.css';

export const LiveProductComposition: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [activeNav, setActiveNav] = useState('chat');

  const handleCopy = () => {
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const sampleCommands = [
    {
      id: 'new-chat',
      title: 'New Conversation',
      category: 'Chat',
      shortcut: ['⌘', 'N'],
      action: () => alert('New Conversation started'),
    },
    {
      id: 'switch-model',
      title: 'Switch Model (ZaqX 1.0)',
      category: 'Models',
      shortcut: ['⌘', 'M'],
      action: () => alert('Model switcher activated'),
    },
    {
      id: 'open-lab',
      title: 'Model Laboratory (Overview / Tokenizer / Training)',
      category: 'Navigation',
      shortcut: ['⌘', 'L'],
      action: () => alert('Navigating to Lab'),
    },
  ];

  return (
    <div className={styles.appShell}>
      {/* GLOBAL HEADER BAR */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.brandTitle}>
            <span className={styles.brandName}>Nikit</span>
            <span className={styles.brandDivider}>/</span>
            <span className={styles.brandSubtitle}>AI Platform</span>
          </div>

          <Popover
            open={modelPopoverOpen}
            onOpenChange={setModelPopoverOpen}
            trigger={
              <button type="button" className={styles.modelHeaderTrigger}>
                <Sparkles size={14} className={styles.accentIcon} />
                <span className={styles.modelNameText}>ZaqX 1.0 (Prototype)</span>
                <Badge variant="warning" size="sm">
                  Prototype
                </Badge>
                <ChevronDown size={12} className={styles.chevronIcon} />
              </button>
            }
          >
            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--nikit-text-tertiary)' }}>
                ACTIVE MODEL FAMILY
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--nikit-text-primary)' }}>
                  ZaqX 1.0 (Prototype)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--nikit-text-secondary)' }}>
                  Design Phase · Untrained Architecture · Specifications are prototype placeholders
                </span>
              </div>
            </div>
          </Popover>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.searchShortcutButton}
            onClick={() => setCmdOpen(true)}
          >
            <Search size={14} />
            <span>Search Nikit...</span>
            <kbd className={styles.kbdKey}>⌘K</kbd>
          </button>

          <Tooltip content="Settings & Profile">
            <Avatar name="Nikit User" size="sm" status="local" />
          </Tooltip>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY */}
      <div className={styles.mainLayout}>
        {/* SIDEBAR NAVIGATION */}
        <aside className={styles.sidebar}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={14} />}
            fullWidth
            onClick={() => setPromptText('')}
          >
            New Chat
          </Button>

          <div className={styles.sidebarNav}>
            <button
              type="button"
              className={`${styles.navItem} ${activeNav === 'chat' ? styles.navItemActive : ''}`}
              onClick={() => setActiveNav('chat')}
            >
              <MessageSquare size={16} />
              <span>Chat</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeNav === 'projects' ? styles.navItemActive : ''}`}
              onClick={() => setActiveNav('projects')}
            >
              <Folder size={16} />
              <span>Projects</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeNav === 'models' ? styles.navItemActive : ''}`}
              onClick={() => setActiveNav('models')}
            >
              <Cpu size={16} />
              <span>Models</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeNav === 'lab' ? styles.navItemActive : ''}`}
              onClick={() => setActiveNav('lab')}
            >
              <Layers size={16} />
              <span>Lab</span>
              <Badge variant="accent" size="sm" style={{ marginLeft: 'auto' }}>
                ZaqX
              </Badge>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${activeNav === 'settings' ? styles.navItemActive : ''}`}
              onClick={() => setActiveNav('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>

          <div className={styles.sidebarHistory}>
            <span className={styles.historyLabel}>Recent Chats</span>
            <div className={styles.historyItem}>ZaqX Latent Attention Kernel</div>
            <div className={styles.historyItem}>BPE Tokenizer Compression Ratio</div>
            <div className={styles.historyItem}>PyTorch Multi-GPU Sharding</div>
          </div>
        </aside>

        {/* CENTRAL CHAT & COMPOSER AREA (Constrained Reading Width) */}
        <main className={styles.chatArea}>
          <div className={styles.chatScrollContent}>
            {/* 1. Prompt Greeting / Empty Chat State */}
            <div className={styles.greetingHeader}>
              <div className={styles.greetingBadge}>
                <Sparkles size={14} className={styles.accentIcon} />
                <span>ZaqX 1.0 Architecture Engine</span>
              </div>
              <h1 className={styles.greetingTitle}>What can I help you with?</h1>
              <p className={styles.greetingSubtitle}>
                Ask technical questions, analyze tensor code, test tokenizer distributions, or inspect local runtime memory.
              </p>
            </div>

            {/* 2. Suggestion Cards */}
            <div className={styles.suggestionCardsRow}>
              <div
                className={styles.suggestionCard}
                onClick={() =>
                  setPromptText('Explain how ZaqX 1.0 optimizes KV-cache memory during inference.')
                }
              >
                <div className={styles.suggestionIconBox}>
                  <Cpu size={16} />
                </div>
                <div className={styles.suggestionTextBox}>
                  <span className={styles.suggestionTitle}>Explain KV-Cache Optimization</span>
                  <span className={styles.suggestionDesc}>Analyze latent compression vs standard MHA</span>
                </div>
              </div>

              <div
                className={styles.suggestionCard}
                onClick={() =>
                  setPromptText('Write a high-performance C++ inference kernel for ZaqX 1.0.')
                }
              >
                <div className={styles.suggestionIconBox}>
                  <Terminal size={16} />
                </div>
                <div className={styles.suggestionTextBox}>
                  <span className={styles.suggestionTitle}>Write C++ Inference Kernel</span>
                  <span className={styles.suggestionDesc}>Custom tensor operators for consumer GPUs</span>
                </div>
              </div>
            </div>

            <Divider>Active Conversation</Divider>

            {/* 3. Message Card with Code & Model Attribution */}
            <div className={styles.messageCardWrapper}>
              <div className={styles.messageMeta}>
                <Avatar name="ZaqX" size="sm" status="local" />
                <span className={styles.modelTag}>ZaqX 1.0 (Prototype)</span>
                <Badge variant="warning" size="sm">
                  Prototype
                </Badge>
                <span className={styles.telemetryTag}>Demo Telemetry (Prototype)</span>

                <div className={styles.messageActionsRight}>
                  <Tooltip content="Copy response">
                    <IconButton
                      icon={copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      aria-label="Copy"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                    />
                  </Tooltip>
                  <Tooltip content="Regenerate">
                    <IconButton
                      icon={<RotateCcw size={14} />}
                      aria-label="Regenerate"
                      variant="ghost"
                      size="sm"
                    />
                  </Tooltip>
                </div>
              </div>

              <div className={styles.messageContent}>
                <p>
                  Here is the optimized forward pass implementation for the <strong>ZaqX 1.0</strong>{' '}
                  Multi-Head Latent Attention layer. It projects input activations into a compressed latent
                  dimension before unrolling query and key-value projections.
                </p>

                <div className={styles.codeContainer}>
                  <div className={styles.codeBar}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code2 size={13} style={{ color: 'var(--nikit-text-tertiary)' }} />
                      <span>zaqx_forward.py</span>
                    </div>
                    <button type="button" className={styles.copyCodeBtn} onClick={handleCopy}>
                      {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className={styles.codeSnippet}>
{`def forward_latent_attention(q, kv_latent, w_decomp, scale):
    # Decompress latent KV cache vector
    kv = torch.matmul(kv_latent, w_decomp)
    k, v = torch.chunk(kv, 2, dim=-1)
    
    # Compute scaled dot-product attention
    scores = torch.matmul(q, k.transpose(-2, -1)) * scale
    attn = torch.softmax(scores, dim=-1)
    return torch.matmul(attn, v)`}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Global Composer Surface */}
          <div className={styles.composerFixedBottom}>
            <div className={styles.composerBox}>
              <textarea
                className={styles.composerField}
                placeholder="Ask ZaqX 1.0 anything... (Shift+Enter for newline)"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={promptText.length > 50 ? 3 : 1}
              />

              <div className={styles.composerControls}>
                <div className={styles.controlsLeft}>
                  <Tooltip content="Attach files, datasets, or code">
                    <IconButton
                      icon={<Paperclip size={16} />}
                      aria-label="Attach"
                      variant="ghost"
                      size="sm"
                    />
                  </Tooltip>
                  <Tooltip content="Tool execution & parameters">
                    <IconButton
                      icon={<Terminal size={16} />}
                      aria-label="Tools"
                      variant="ghost"
                      size="sm"
                    />
                  </Tooltip>
                  <Tooltip content="Voice placeholder">
                    <IconButton
                      icon={<Mic size={16} />}
                      aria-label="Voice"
                      variant="ghost"
                      size="sm"
                    />
                  </Tooltip>

                  <div className={styles.activeModelChip}>
                    <Sparkles size={12} className={styles.accentIcon} />
                    <span>ZaqX 1.0 · Local</span>
                  </div>
                </div>

                <div className={styles.controlsRight}>
                  <IconButton
                    icon={<ArrowUp size={16} />}
                    aria-label="Send prompt"
                    variant="primary"
                    size="sm"
                    disabled={!promptText.trim()}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <CommandSurface
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={sampleCommands}
      />
    </div>
  );
};
