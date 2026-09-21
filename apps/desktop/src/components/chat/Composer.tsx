import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  Paperclip,
  Wrench,
  Sparkles,
  X,
  FileText,
  Code,
  Database,
  Brain,
} from 'lucide-react';
import { Tooltip } from '@nikit/ui';
import { AttachmentReference } from '@nikit/types';
import { useApp } from '../../state/AppContext';
import { ToolConfiguration } from '../../services/context';
import { ContextAttachmentModal } from './ContextAttachmentModal';
import { ToolSelectorPopover } from './ToolSelectorPopover';
import styles from './Composer.module.css';

export interface ComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (attachments?: AttachmentReference[], toolConfig?: ToolConfiguration) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming = false,
  disabled = false,
}) => {
  const { workspace } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Attachments and Tools state
  const [attachments, setAttachments] = useState<AttachmentReference[]>([]);
  const [toolConfig, setToolConfig] = useState<ToolConfiguration>({
    rag: true,
    memory: true,
  });
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 44), 220);
    textarea.style.height = `${nextHeight}px`;
  }, [value]);

  const handleSend = () => {
    if (!isStreaming && (value.trim() || attachments.length > 0)) {
      onSubmit(attachments, toolConfig);
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddAttachment = (attachment: AttachmentReference) => {
    setAttachments((prev) => {
      if (prev.some((a) => a.id === attachment.id)) return prev;
      return [...prev, attachment];
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className={styles.composerContainer}>
      <div
        className={`${styles.composerCard} ${isStreaming ? styles.composerCardStreaming : ''}`}
      >
        {/* Attachment Pills Area */}
        {attachments.length > 0 && (
          <div className={styles.attachmentsBar}>
            {attachments.map((att) => {
              const estTokens = Math.ceil(
                (att.content?.length || att.sizeBytes || 0) / 4
              );
              return (
                <div key={att.id} className={styles.attachmentPill}>
                  {att.type === 'code' ? (
                    <Code size={12} style={{ color: 'var(--nikit-accent-base)' }} />
                  ) : (
                    <FileText size={12} style={{ color: 'var(--nikit-accent-base)' }} />
                  )}
                  <span className={styles.attachmentName} title={att.name}>
                    {att.name}
                  </span>
                  {estTokens > 0 && (
                    <span className={styles.attachmentTokenBadge}>
                      ~{estTokens} tok
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.removeAttachmentBtn}
                    onClick={() => handleRemoveAttachment(att.id)}
                    aria-label={`Remove ${att.name}`}
                    title="Remove attachment"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.textareaWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? 'Response is generating... (Press Stop to halt)'
                : attachments.length > 0
                ? 'Ask about the attached context, request analysis, or code changes...'
                : 'Ask anything, draft code, or analyze architectures... (Shift+Enter for newline)'
            }
            rows={1}
            disabled={disabled}
            aria-label="Conversation message composer"
          />
        </div>

        <div className={styles.actionBar}>
          <div className={styles.actionsLeft}>
            <Tooltip content="Attach files or code snippets from workspace">
              <button
                type="button"
                className={styles.toolButton}
                onClick={() => setIsAttachModalOpen(true)}
                aria-label="Attach context"
                disabled={isStreaming}
              >
                <Paperclip size={14} />
                <span>Attach</span>
              </button>
            </Tooltip>

            <ToolSelectorPopover
              open={isToolsPopoverOpen}
              onOpenChange={setIsToolsPopoverOpen}
              toolConfig={toolConfig}
              onToolConfigChange={setToolConfig}
              trigger={
                <button
                  type="button"
                  className={styles.toolButton}
                  onClick={() => setIsToolsPopoverOpen((prev) => !prev)}
                  aria-label="Execution Tools"
                  disabled={isStreaming}
                >
                  <Wrench size={13} />
                  <span>Tools</span>
                </button>
              }
            />

            <div className={styles.modelChip}>
              <Sparkles size={11} className={styles.sparkleIcon} />
              <span>{workspace.activeModelName}</span>
            </div>

            {/* Active Execution Tool Indicators */}
            {toolConfig.rag && (
              <div
                className={styles.activeToolBadge}
                title="Knowledge RAG Retrieval is active for prompts"
              >
                <Database size={10} />
                <span>RAG</span>
              </div>
            )}
            {toolConfig.memory && (
              <div
                className={styles.activeToolBadge}
                title="Long-Term Memory Injection is active for prompts"
              >
                <Brain size={10} />
                <span>Memory</span>
              </div>
            )}
          </div>

          <div className={styles.actionsRight}>
            {isStreaming ? (
              <Tooltip content="Stop Generation">
                <button
                  type="button"
                  className={styles.stopButton}
                  onClick={onStop}
                  aria-label="Stop generation"
                >
                  <div className={styles.stopIcon} />
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="Send message (Enter)">
                <button
                  type="button"
                  className={styles.sendButton}
                  onClick={handleSend}
                  disabled={(!value.trim() && attachments.length === 0) || disabled}
                  aria-label="Send message"
                >
                  <ArrowUp size={16} />
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Context Attachment Modal */}
      <ContextAttachmentModal
        open={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onAttach={handleAddAttachment}
        existingAttachmentIds={attachments.map((a) => a.id)}
      />
    </div>
  );
};
