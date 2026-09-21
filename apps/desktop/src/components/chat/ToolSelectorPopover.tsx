import React from 'react';
import { Database, Brain, Terminal, Globe } from 'lucide-react';
import { Popover, Badge } from '@nikit/ui';
import { ToolConfiguration } from '../../services/context';
import styles from './ToolSelectorPopover.module.css';

export interface ToolSelectorPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolConfig: ToolConfiguration;
  onToolConfigChange: (newConfig: ToolConfiguration) => void;
  trigger: React.ReactNode;
}

export const ToolSelectorPopover: React.FC<ToolSelectorPopoverProps> = ({
  open,
  onOpenChange,
  toolConfig,
  onToolConfigChange,
  trigger,
}) => {
  const handleToggleRag = () => {
    onToolConfigChange({
      ...toolConfig,
      rag: !toolConfig.rag,
    });
  };

  const handleToggleMemory = () => {
    onToolConfigChange({
      ...toolConfig,
      memory: !toolConfig.memory,
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      placement="top-start"
      trigger={trigger}
    >
      <div className={styles.popoverCard}>
        <div className={styles.popoverHeader}>
          <span className={styles.popoverTitle}>Model Execution Capabilities</span>
          <Badge variant="accent" size="sm">
            Local Pipeline
          </Badge>
        </div>

        <div className={styles.toolList}>
          {/* 1. Knowledge RAG Retrieval - Supported */}
          <div className={styles.toolRow}>
            <div className={styles.toolInfo}>
              <div className={styles.toolNameRow}>
                <Database size={13} style={{ color: 'var(--nikit-accent-base)' }} />
                <span className={styles.toolName}>Knowledge RAG Search</span>
              </div>
              <span className={styles.toolDescription}>
                Hybrid BM25 lexical and vector chunk retrieval over workspace documents.
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={toolConfig.rag}
                onChange={handleToggleRag}
                aria-label="Toggle Knowledge RAG Retrieval"
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {/* 2. Long-Term Memory - Supported */}
          <div className={styles.toolRow}>
            <div className={styles.toolInfo}>
              <div className={styles.toolNameRow}>
                <Brain size={13} style={{ color: 'var(--nikit-accent-base)' }} />
                <span className={styles.toolName}>Long-Term Memory</span>
              </div>
              <span className={styles.toolDescription}>
                Inject persistent user facts and active project memory into prompt context.
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={toolConfig.memory}
                onChange={handleToggleMemory}
                aria-label="Toggle Long-Term Memory"
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {/* 3. Code Sandbox - Unsupported / Truthfully Disabled */}
          <div className={`${styles.toolRow} ${styles.toolRowDisabled}`}>
            <div className={styles.toolInfo}>
              <div className={styles.toolNameRow}>
                <Terminal size={13} />
                <span className={styles.toolName}>Code Execution Sandbox</span>
              </div>
              <span className={styles.toolDescription}>
                Execute Python and shell code in an isolated container.
              </span>
              <span className={styles.unavailableReason}>
                Unavailable · Native Sandbox Required
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input type="checkbox" disabled checked={false} aria-label="Code Sandbox Unavailable" />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {/* 4. Web Search - Unsupported / Truthfully Disabled */}
          <div className={`${styles.toolRow} ${styles.toolRowDisabled}`}>
            <div className={styles.toolInfo}>
              <div className={styles.toolNameRow}>
                <Globe size={13} />
                <span className={styles.toolName}>Web & Live Fetch</span>
              </div>
              <span className={styles.toolDescription}>
                Real-time external documentation lookup.
              </span>
              <span className={styles.unavailableReason}>
                Unavailable · Offline Privacy Guard Active
              </span>
            </div>
            <label className={styles.toggleSwitch}>
              <input type="checkbox" disabled checked={false} aria-label="Web Search Unavailable" />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </div>
    </Popover>
  );
};
