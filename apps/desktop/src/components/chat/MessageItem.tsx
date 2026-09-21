import React, { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Tooltip,
} from '@nikit/ui';
import {
  Copy,
  Check,
  RotateCcw,
  Pencil,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Brain,
  FileText,
  Code,
} from 'lucide-react';
import { Message, MessagePart } from '@nikit/types';
import { CodeBlock } from './CodeBlock';
import { partsToPlainText } from '../../services/messageParser';
import { useApp } from '../../state/AppContext';
import { SaveToMemoryModal } from '../SaveToMemoryModal/SaveToMemoryModal';
import styles from './MessageItem.module.css';

export interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

/**
 * Renders a single markdown text part into formatted paragraphs, lists, and headings.
 */
const FormattedTextPart: React.FC<{ content: string }> = ({ content }) => {
  const paragraphs = content.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((pText, pIdx) => {
        const trimmed = pText.trim();
        if (!trimmed) return null;

        // Heading level 3 ###
        if (trimmed.startsWith('### ')) {
          return <h3 key={pIdx}>{trimmed.replace(/^###\s+/, '')}</h3>;
        }

        // Heading level 2 ##
        if (trimmed.startsWith('## ')) {
          return <h3 key={pIdx}>{trimmed.replace(/^##\s+/, '')}</h3>;
        }

        // Bullet list
        if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
          const lines = trimmed.split('\n');
          return (
            <ul key={pIdx}>
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^-\s+/, '').trim();
                if (!cleanLine) return null;
                return <li key={lIdx}>{cleanLine}</li>;
              })}
            </ul>
          );
        }

        // Numbered list
        if (/^\d+\.\s+/.test(trimmed)) {
          const lines = trimmed.split('\n');
          return (
            <ol key={pIdx}>
              {lines.map((line, lIdx) => {
                const cleanLine = line.replace(/^\d+\.\s+/, '').trim();
                if (!cleanLine) return null;
                return <li key={lIdx}>{cleanLine}</li>;
              })}
            </ol>
          );
        }

        return <p key={pIdx}>{trimmed}</p>;
      })}
    </>
  );
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onEdit,
}) => {
  const { preferences, workspace } = useApp();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const plainContent = partsToPlainText(message.parts);

  const handleCopy = () => {
    navigator.clipboard?.writeText(plainContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditText(plainContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText('');
  };

  const formatTimestamp = (isoDate?: string) => {
    if (!isoDate) return 'Just now';
    try {
      const date = new Date(isoDate);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  };

  // 1. User Message Rendering
  if (message.role === 'user') {
    return (
      <div className={`${styles.messageContainer} ${styles.userMessageContainer}`}>
        <div className={styles.messageHeader}>
          <div className={styles.senderGroup}>
            <Avatar name="Operator" size="sm" />
            <span className={styles.senderName}>You</span>
            <span className={styles.timestamp}>{formatTimestamp(message.createdAt)}</span>
          </div>

          <div className={styles.actionToolbar}>
            {onEdit && !isEditing && (
              <Tooltip content="Edit message">
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={handleStartEdit}
                  aria-label="Edit message"
                >
                  <Pencil size={13} />
                </button>
              </Tooltip>
            )}
            <Tooltip content={copied ? 'Copied' : 'Copy message'}>
              <button
                type="button"
                className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ''}`}
                onClick={handleCopy}
                aria-label="Copy message"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </Tooltip>
            <Tooltip content="Save to Memory">
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setIsMemoryModalOpen(true)}
                aria-label="Save to Memory"
              >
                <Brain size={13} />
              </button>
            </Tooltip>
          </div>
        </div>

        {isEditing ? (
          <div className={styles.editContainer}>
            <textarea
              className={styles.editTextarea}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              rows={3}
            />
            <div className={styles.editActions}>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                Save & Update
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.messageBody}>
            {message.parts.map((part: MessagePart, pIdx: number) => {
              if (part.type === 'text') {
                return <FormattedTextPart key={pIdx} content={part.content} />;
              }
              return null;
            })}

            {/* Attached context items */}
            {message.parts.some((p) => p.type === 'file' || p.type === 'code') && (
              <div className={styles.attachedContextList}>
                {message.parts.map((part: MessagePart, pIdx: number) => {
                  if (part.type === 'file') {
                    return (
                      <div key={pIdx} className={styles.attachedContextBubble} title={part.path || part.name}>
                        <FileText size={13} style={{ color: 'var(--nikit-accent-base)' }} />
                        <span className={styles.attachedFileName}>{part.name}</span>
                        {part.sizeBytes ? (
                          <span className={styles.attachedFileSize}>
                            {(part.sizeBytes / 1024).toFixed(1)} KB
                          </span>
                        ) : null}
                      </div>
                    );
                  }
                  if (part.type === 'code') {
                    return (
                      <div key={pIdx} className={styles.attachedContextBubble}>
                        <Code size={13} style={{ color: 'var(--nikit-accent-base)' }} />
                        <span className={styles.attachedFileName}>{part.filename || 'Code Snippet'}</span>
                        <span className={styles.attachedFileSize}>{part.language || 'code'}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        )}

        <SaveToMemoryModal
          isOpen={isMemoryModalOpen}
          initialText={plainContent}
          conversationId={message.conversationId}
          messageId={message.id}
          onClose={() => setIsMemoryModalOpen(false)}
        />
      </div>
    );
  }

  // 2. Assistant Message Rendering
  const modelName = message.modelName || workspace.activeModelName;
  const isCancelled = message.status === 'cancelled';
  const isError = message.status === 'error';

  return (
    <div className={styles.messageContainer}>
      <div className={styles.messageHeader}>
        <div className={styles.senderGroup}>
          <Avatar name="ZaqX" size="sm" status="local" />
          <span className={styles.senderName}>{modelName}</span>
          {message.modelId === 'mock-dev' || message.telemetry?.isPrototypeData ? (
            <Badge variant="accent" size="sm">
              Dev Stream
            </Badge>
          ) : (
            <Badge variant="local" size="sm">
              Local Engine
            </Badge>
          )}
          {isCancelled && (
            <Badge variant="default" size="sm">
              Stopped
            </Badge>
          )}
          {preferences.telemetryDisplay && message.telemetry?.isPrototypeData && (
            <span className={styles.telemetryBadge}>Simulated / Prototype Stream</span>
          )}
          <span className={styles.timestamp}>{formatTimestamp(message.createdAt)}</span>
        </div>

        <div className={styles.actionToolbar}>
          <Tooltip content={copied ? 'Copied' : 'Copy response'}>
            <button
              type="button"
              className={`${styles.actionBtn} ${copied ? styles.actionBtnCopied : ''}`}
              onClick={handleCopy}
              aria-label="Copy response"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </Tooltip>

          <Tooltip content="Save to Memory">
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setIsMemoryModalOpen(true)}
              aria-label="Save to Memory"
            >
              <Brain size={13} />
            </button>
          </Tooltip>

          {onRegenerate && (
            <Tooltip content="Regenerate response">
              <button
                type="button"
                className={styles.actionBtn}
                onClick={onRegenerate}
                aria-label="Regenerate response"
              >
                <RotateCcw size={13} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className={styles.messageBody}>
        {message.parts.map((part: MessagePart, pIdx: number) => {
          if (part.type === 'text') {
            return <FormattedTextPart key={pIdx} content={part.content} />;
          }

          if (part.type === 'code') {
            return (
              <CodeBlock
                key={pIdx}
                code={part.content}
                language={part.language}
                filename={part.filename}
              />
            );
          }

          return null;
        })}

        {isStreaming && <span className={styles.streamingCursor} aria-label="Streaming..." />}

        {/* Error State Card */}
        {isError && message.error && (
          <div className={styles.errorCard}>
            <div className={styles.errorHeader}>
              <div className={styles.errorTitle}>
                <AlertTriangle size={14} />
                <span>Generation Fault: {message.error.code || 'ERR_PROVIDER_FAILURE'}</span>
              </div>
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw size={12} />}
                  onClick={onRegenerate}
                >
                  Retry
                </Button>
              )}
            </div>
            <div className={styles.errorMessage}>{message.error.message}</div>
            {message.error.details && (
              <div>
                <div
                  className={styles.errorDetailsSummary}
                  onClick={() => setShowErrorDetails((prev) => !prev)}
                >
                  {showErrorDetails ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{' '}
                  Technical Diagnostics
                </div>
                {showErrorDetails && (
                  <div className={styles.errorDetailsBox}>{message.error.details}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <SaveToMemoryModal
        isOpen={isMemoryModalOpen}
        initialText={plainContent}
        conversationId={message.conversationId}
        messageId={message.id}
        onClose={() => setIsMemoryModalOpen(false)}
      />
    </div>
  );
};
