import React, { useState } from 'react';
import { Brain, Check } from 'lucide-react';
import { Button } from '@nikit/ui';
import { MemoryScope, MemoryConfidence } from '@nikit/types';
import { memoryService } from '../../services/memory';
import { useProject } from '../../state/ProjectContext';
import styles from './SaveToMemoryModal.module.css';

export interface SaveToMemoryModalProps {
  isOpen: boolean;
  initialText: string;
  conversationId?: string | null;
  messageId?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const SaveToMemoryModal: React.FC<SaveToMemoryModalProps> = ({
  isOpen,
  initialText,
  conversationId,
  messageId,
  onClose,
  onSaved,
}) => {
  const { activeProject } = useProject();
  const [content, setContent] = useState(initialText);
  const [scope, setScope] = useState<MemoryScope>(activeProject ? 'project' : 'user');
  const [confidence, setConfidence] = useState<MemoryConfidence>('explicit');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      await memoryService.createMemory({
        scope,
        projectId: scope === 'project' ? activeProject?.id || null : null,
        content: content.trim(),
        confidence,
        source: 'user_saved',
        sourceConversationId: conversationId,
        sourceMessageId: messageId,
        originalText: initialText,
      });

      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onSaved?.();
        onClose();
      }, 600);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Brain size={18} color="var(--color-accent)" />
            Save to Memory
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Memory Scope</label>
          <select
            className={styles.select}
            value={scope}
            onChange={(e) => setScope(e.target.value as MemoryScope)}
          >
            <option value="user">User Memory (Global - applies to all projects)</option>
            {activeProject && (
              <option value="project">Project Memory ({activeProject.name})</option>
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Confidence Level</label>
          <select
            className={styles.select}
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as MemoryConfidence)}
          >
            <option value="explicit">Explicit (Direct user decision)</option>
            <option value="high">High Confidence</option>
            <option value="medium">Medium Confidence</option>
            <option value="low">Low Confidence</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Memory Fact / Preference Content</label>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Edit text to be saved as a concise fact or preference..."
            rows={4}
          />
        </div>

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!content.trim() || isSaved}
            leftIcon={isSaved ? <Check size={14} /> : <Brain size={14} />}
            onClick={handleSave}
          >
            {isSaved ? 'Saved!' : 'Save Memory'}
          </Button>
        </div>
      </div>
    </div>
  );
};
