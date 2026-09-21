import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, X } from 'lucide-react';
import { Badge, Button } from '@nikit/ui';
import { StructuredContext } from '@nikit/types';
import { contextService } from '../../services/context';
import { useConversation } from '../../state/ConversationContext';
import { useApp } from '../../state/AppContext';
import { useProject } from '../../state/ProjectContext';
import styles from './ContextInspectorModal.module.css';

export interface ContextInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextInspectorModal: React.FC<ContextInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { workspace } = useApp();
  const { activeProject } = useProject();
  const { conversation, draft } = useConversation();

  const [structuredContext, setStructuredContext] = useState<StructuredContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    contextService
      .prepare({
        conversationId: conversation?.id || null,
        projectId: activeProject?.id || conversation?.projectId || null,
        userPrompt: draft || undefined,
        workspaceModelId: workspace.activeModelId,
        workspaceModelName: workspace.activeModelName,
        conversationOverride: conversation,
        projectOverride: activeProject,
      })
      .then(setStructuredContext)
      .finally(() => setLoading(false));
  }, [isOpen, conversation, activeProject, draft, workspace.activeModelId, workspace.activeModelName]);

  if (!isOpen) return null;

  const budget = structuredContext?.budgetReport;
  const blocks = structuredContext?.blocks || [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <Layers size={18} color="var(--color-accent)" />
            <h2 className={styles.title}>Developer Mode: Structured Context Inspector</h2>
            <Badge variant="accent" size="sm">
              Phase 8 Intelligence
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        {/* Budget Summary */}
        <div className={styles.budgetSummary}>
          <div className={styles.budgetItem}>
            <span>Effective Model:</span>
            <span className={styles.budgetValue}>{structuredContext?.effectiveModelName || workspace.activeModelName}</span>
          </div>
          <div className={styles.budgetItem}>
            <span>Context Limit:</span>
            <span className={styles.budgetValue}>
              {budget?.contextLimit ? `${budget.contextLimit.toLocaleString()} tokens` : 'Unbounded / Unknown'}
            </span>
          </div>
          <div className={styles.budgetItem}>
            <span>Total Estimated Tokens:</span>
            <span className={styles.budgetValue}>
              {budget?.totalTokensEstimated !== null && budget?.totalTokensEstimated !== undefined
                ? `${budget.totalTokensEstimated.toLocaleString()} tokens`
                : 'Uncalculated'}
            </span>
          </div>
          <div className={styles.budgetItem}>
            <span>Status:</span>
            <Badge variant={budget?.isConstrained ? 'warning' : 'success'} size="sm">
              {budget?.isConstrained ? 'Trimmed by Budget' : 'Full Context Preserved'}
            </Badge>
          </div>
        </div>

        {/* Context Blocks List */}
        <div className={styles.body}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Assembling structured context...
            </div>
          ) : (
            blocks.map((block, idx) => {
              const isIncluded = block.isAvailable && block.enabled !== false && !block.exclusionReason;

              return (
                <div
                  key={block.id || idx}
                  className={`${styles.blockCard} ${!isIncluded ? styles.blockCardOmitted : ''}`}
                >
                  <div className={styles.blockHeader}>
                    <div className={styles.blockTitleGroup}>
                      <Badge variant={isIncluded ? 'success' : 'default'} size="sm">
                        {isIncluded ? 'INCLUDED' : 'OMITTED'}
                      </Badge>
                      <span className={styles.blockTitle}>
                        [{block.type.toUpperCase()}] {block.title}
                      </span>
                      {block.required && (
                        <Badge variant="accent" size="sm">
                          <ShieldCheck size={11} style={{ marginRight: '3px' }} /> REQUIRED
                        </Badge>
                      )}
                    </div>

                    <div className={styles.blockMeta}>
                      <span>Priority: #{block.priority || idx + 1}</span>
                      <span>·</span>
                      <span>
                        Est. Tokens: {block.tokenEstimate !== null ? `${block.tokenEstimate} tok` : 'null'}
                      </span>
                    </div>
                  </div>

                  {block.exclusionReason && (
                    <div className={styles.exclusionBanner}>
                      Exclusion Reason: {block.exclusionReason}
                    </div>
                  )}

                  {block.content ? (
                    <div className={styles.blockContent}>{block.content}</div>
                  ) : (
                    <div style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Block is currently empty.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </div>
  );
};
