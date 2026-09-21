import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Archive,
  RotateCcw,
  Search,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  User,
  FolderGit2,
} from 'lucide-react';
import { Button, Badge } from '@nikit/ui';
import { Memory, MemoryScope, MemoryConfidence, MemoryConflict } from '@nikit/types';
import { memoryService } from '../services/memory';
import { useProject } from '../state/ProjectContext';
import styles from './MemoryView.module.css';

export const MemoryView: React.FC = () => {
  const { activeProject } = useProject();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [conflicts, setConflicts] = useState<MemoryConflict[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState<'all' | 'user' | 'project'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [policyEnabled, setPolicyEnabled] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formScope, setFormScope] = useState<MemoryScope>('user');
  const [formConfidence, setFormConfidence] = useState<MemoryConfidence>('explicit');

  const loadData = useCallback(async () => {
    const policy = await memoryService.getPolicy();
    setPolicyEnabled(policy.enabled);

    const list = await memoryService.listMemories({
      search: searchQuery,
      status: statusFilter,
      scope: selectedScope === 'all' ? undefined : selectedScope,
      projectId: selectedScope === 'project' ? activeProject?.id || null : undefined,
    });

    setMemories(list);

    const detected = await memoryService.detectConflicts(list);
    setConflicts(detected);
  }, [searchQuery, statusFilter, selectedScope, activeProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = (scope: MemoryScope = 'user') => {
    setEditingMemory(null);
    setFormTitle('');
    setFormContent('');
    setFormScope(scope);
    setFormConfidence('explicit');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mem: Memory) => {
    setEditingMemory(mem);
    setFormTitle(mem.title || '');
    setFormContent(mem.content);
    setFormScope(mem.scope);
    setFormConfidence(mem.confidence);
    setIsModalOpen(true);
  };

  const handleSaveModal = async () => {
    if (!formContent.trim()) return;

    try {
      if (editingMemory) {
        await memoryService.updateMemory(editingMemory.id, {
          title: formTitle.trim() || undefined,
          content: formContent.trim(),
          confidence: formConfidence,
        });
      } else {
        await memoryService.createMemory({
          scope: formScope,
          projectId: formScope === 'project' ? activeProject?.id || null : null,
          title: formTitle.trim() || undefined,
          content: formContent.trim(),
          confidence: formConfidence,
          source: 'user_saved',
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this memory? This action cannot be undone.')) {
      await memoryService.deleteMemory(id);
      await loadData();
    }
  };

  const handleToggleArchive = async (mem: Memory) => {
    if (mem.status === 'active') {
      await memoryService.archiveMemory(mem.id);
    } else {
      await memoryService.restoreMemory(mem.id);
    }
    await loadData();
  };

  const handleClearScope = async (scope: 'user' | 'project') => {
    const label = scope === 'user' ? 'Global User Memory' : `Project Memory for "${activeProject?.name || 'current project'}"`;
    if (confirm(`Are you sure you want to delete all ${label}? This cannot be undone.`)) {
      if (scope === 'user') {
        await memoryService.clearUserMemory();
      } else if (activeProject?.id) {
        await memoryService.clearProjectMemory(activeProject.id);
      }
      await loadData();
    }
  };

  const handleTogglePolicy = async () => {
    const updated = await memoryService.updatePolicy({ enabled: !policyEnabled });
    setPolicyEnabled(updated.enabled);
    await loadData();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <Brain size={26} color="var(--color-accent)" />
            <h1 className={styles.title}>Memory & Context Intelligence</h1>
            <Badge
              variant={policyEnabled ? 'success' : 'default'}
              size="sm"
              onClick={handleTogglePolicy}
              style={{ cursor: 'pointer' }}
              title="Click to toggle memory subsystem policy"
            >
              {policyEnabled ? 'Policy: Enabled (Explicit Save)' : 'Policy: Disabled'}
            </Badge>
          </div>
          <p className={styles.description}>
            Transparent, user-controlled persistent memory for cross-session preferences and project knowledge.
            Memories are never created silently from raw conversation without explicit user action.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearScope('user')}
            title="Clear all global user memories"
          >
            Clear User Memory
          </Button>
          {activeProject && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearScope('project')}
              title={`Clear memories for project "${activeProject.name}"`}
            >
              Clear Project Memory
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => handleOpenAddModal(activeProject ? 'project' : 'user')}
          >
            Add Memory
          </Button>
        </div>
      </div>

      {/* Conflict Warnings (if any contradictory preferences detected) */}
      {conflicts.length > 0 && (
        <div className={styles.conflictBanner}>
          <div className={styles.conflictTitle}>
            <AlertTriangle size={18} />
            <span>Audited Preference Divergences ({conflicts.length})</span>
          </div>
          <div className={styles.conflictList}>
            {conflicts.map((c, idx) => (
              <div key={idx} className={styles.conflictItem}>
                <div>
                  <strong>{c.memoryA.content}</strong> vs <strong>{c.memoryB.content}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {c.reason}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(c.memoryA)}>
                  Resolve / Edit
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchArea}>
          <Search size={16} color="var(--color-text-secondary)" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search memories by keyword, facts, or preferences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.tabsArea}>
          <button
            className={`${styles.tabButton} ${selectedScope === 'all' ? styles.tabButtonActive : ''}`}
            onClick={() => setSelectedScope('all')}
          >
            All Scopes
          </button>
          <button
            className={`${styles.tabButton} ${selectedScope === 'user' ? styles.tabButtonActive : ''}`}
            onClick={() => setSelectedScope('user')}
          >
            User Memory (Global)
          </button>
          <button
            className={`${styles.tabButton} ${selectedScope === 'project' ? styles.tabButtonActive : ''}`}
            onClick={() => setSelectedScope('project')}
          >
            Project Memory {activeProject ? `(${activeProject.name})` : ''}
          </button>
        </div>

        <div className={styles.tabsArea}>
          <button
            className={`${styles.tabButton} ${statusFilter === 'active' ? styles.tabButtonActive : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active
          </button>
          <button
            className={`${styles.tabButton} ${statusFilter === 'archived' ? styles.tabButtonActive : ''}`}
            onClick={() => setStatusFilter('archived')}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Memories List */}
      <div className={styles.memoriesList}>
        {memories.length === 0 ? (
          <div className={styles.emptyState}>
            <Sparkles size={36} color="var(--color-text-secondary)" />
            <div className={styles.emptyTitle}>No Memories Found</div>
            <div className={styles.emptyDesc}>
              {searchQuery
                ? 'No memories matched your search criteria.'
                : 'Save technical preferences, coding styles, or project facts so Nikit can maintain context across conversations.'}
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={16} />}
              onClick={() => handleOpenAddModal(activeProject ? 'project' : 'user')}
            >
              Create First Memory
            </Button>
          </div>
        ) : (
          memories.map((mem) => (
            <div key={mem.id} className={styles.memoryCard}>
              <div className={styles.cardHeader}>
                <div className={styles.badgesGroup}>
                  {mem.scope === 'user' ? (
                    <Badge variant="accent" size="sm">
                      <User size={12} style={{ marginRight: '4px' }} /> User Memory (Global)
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      <FolderGit2 size={12} style={{ marginRight: '4px' }} /> Project Memory
                    </Badge>
                  )}

                  <Badge
                    variant={mem.confidence === 'explicit' ? 'success' : 'default'}
                    size="sm"
                  >
                    {mem.confidence.toUpperCase()}
                  </Badge>

                  {mem.status === 'archived' && (
                    <Badge variant="warning" size="sm">
                      ARCHIVED
                    </Badge>
                  )}
                </div>

                <div className={styles.cardActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Edit2 size={14} />}
                    onClick={() => handleOpenEditModal(mem)}
                    title="Edit Memory"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={mem.status === 'active' ? <Archive size={14} /> : <RotateCcw size={14} />}
                    onClick={() => handleToggleArchive(mem)}
                    title={mem.status === 'active' ? 'Archive Memory' : 'Restore Memory'}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => handleDelete(mem.id)}
                    title="Delete Permanently"
                  />
                </div>
              </div>

              <div>
                {mem.title && <div className={styles.cardTitle}>{mem.title}</div>}
                <div className={styles.cardContent}>{mem.content}</div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.provenanceDetails}>
                  <span className={styles.provenanceItem} title="Provenance Source">
                    <Layers size={13} /> Source: {mem.provenance.source}
                  </span>
                  {mem.provenance.sourceConversationId && (
                    <span className={styles.provenanceItem}>
                      Chat: #{mem.provenance.sourceConversationId.slice(-6)}
                    </span>
                  )}
                  <span className={styles.provenanceItem} title="Date Added">
                    <Clock size={13} /> Added: {new Date(mem.createdAt).toLocaleDateString()}
                  </span>
                  {mem.usageCount > 0 && (
                    <span className={styles.provenanceItem} title="Usage frequency in ContextBuilder">
                      Used in {mem.usageCount} generation(s)
                    </span>
                  )}
                </div>

                <div>ID: {mem.id}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal Dialog */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingMemory ? 'Edit Memory' : 'Add Persistent Memory'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                ✕
              </Button>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Memory Scope</label>
              <select
                className={styles.formSelect}
                value={formScope}
                disabled={!!editingMemory}
                onChange={(e) => setFormScope(e.target.value as MemoryScope)}
              >
                <option value="user">User Memory (Global - applies to all conversations)</option>
                <option value="project">
                  Project Memory {activeProject ? `(${activeProject.name})` : '(Requires active project)'}
                </option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Title (Optional Summary)</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g. Frontend Preference or Local Runtime Flag"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Memory Content (Concise Fact / Preference)</label>
              <textarea
                className={styles.formTextarea}
                placeholder="e.g. Prefers TypeScript and strict type declarations. Uses llama.cpp for local inference."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confidence Level</label>
              <select
                className={styles.formSelect}
                value={formConfidence}
                onChange={(e) => setFormConfidence(e.target.value as MemoryConfidence)}
              >
                <option value="explicit">Explicit (Direct user confirmation)</option>
                <option value="high">High (Established fact)</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!formContent.trim()}
                onClick={handleSaveModal}
              >
                {editingMemory ? 'Save Changes' : 'Create Memory'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
