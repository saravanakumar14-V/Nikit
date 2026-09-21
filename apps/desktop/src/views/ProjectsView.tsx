import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  Plus,
  ArrowLeft,
  MessageSquare,
  Archive,
  RotateCcw,
  Trash2,
  Cpu,
  FileCode,
  Check,
  MinusCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Input,
  Textarea,
  EmptyState,
  Select,
  Tooltip,
} from '@nikit/ui';
import { useProject } from '../state/ProjectContext';
import { useRouter } from '../router/RouterContext';
import { useApp } from '../state/AppContext';
import styles from './ProjectsView.module.css';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    activeProject,
    activeProjectConversations,
    setActiveProjectId,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    createProjectConversation,
    removeConversationFromProject,
  } = useProject();

  const { models } = useApp();
  const { navigate } = useRouter();

  const [filterTab, setFilterTab] = useState<'active' | 'archived'>('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Instructions editor state for active project
  const [instructionsText, setInstructionsText] = useState('');
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    if (activeProject) {
      setInstructionsText(activeProject.instructions || '');
      setIsSaved(true);
    }
  }, [activeProject]);

  // Debounced auto-save for project instructions
  useEffect(() => {
    if (!activeProject) return;
    if (instructionsText === (activeProject.instructions || '')) return;

    setIsSaved(false);
    const timer = setTimeout(() => {
      updateProject(activeProject.id, { instructions: instructionsText }).then(() => {
        setIsSaved(true);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [instructionsText, activeProject, updateProject]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    await createProject({
      name: newProjName.trim(),
      description: newProjDesc.trim(),
    });

    setNewProjName('');
    setNewProjDesc('');
    setIsCreateModalOpen(false);
  };

  const handleOpenConversation = (conversationId: string) => {
    navigate('chat', { id: conversationId });
  };

  const handleNewProjectChat = async () => {
    if (!activeProject) return;
    const newChatId = await createProjectConversation(activeProject.id);
    navigate('chat', { id: newChatId });
  };

  const handleModelChange = useCallback(
    (modelId: string) => {
      if (!activeProject) return;
      const model = models.find((m) => m.id === modelId);
      if (model) {
        updateProject(activeProject.id, {
          defaultModelId: model.id,
          defaultModelName: model.name,
        });
      }
    },
    [activeProject, models, updateProject]
  );

  const displayedProjects = projects.filter((p) =>
    filterTab === 'active' ? !p.archived : p.archived
  );

  // ==========================================================================
  // Render: Workspace Detail Surface
  // ==========================================================================
  if (activeProject) {
    return (
      <div className={styles.viewContainer}>
        <div className={styles.workspaceContainer}>
          {/* Header */}
          <div className={styles.workspaceHeader}>
            <div>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setActiveProjectId(null)}
              >
                <ArrowLeft size={13} />
                <span>All Workspaces</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 className={styles.workspaceTitle}>{activeProject.name}</h1>
                {activeProject.archived ? (
                  <Badge variant="warning" size="sm">
                    Archived
                  </Badge>
                ) : (
                  <Badge variant="accent" size="sm">
                    Active Workspace
                  </Badge>
                )}
              </div>

              <p className={styles.workspaceDesc}>
                {activeProject.description || 'No workspace description provided.'}
              </p>
            </div>

            <div className={styles.workspaceActions}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={handleNewProjectChat}
              >
                New Project Chat
              </Button>

              {activeProject.archived ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw size={13} />}
                  onClick={() => restoreProject(activeProject.id)}
                >
                  Restore
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Archive size={13} />}
                  onClick={() => archiveProject(activeProject.id)}
                >
                  Archive
                </Button>
              )}

              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={13} />}
                onClick={() => deleteProject(activeProject.id)}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Main Grid: Instructions + Conversations/Model */}
          <div className={styles.workspaceSections}>
            {/* Left: Project Instructions Workbench */}
            <div className={styles.workspaceSectionCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>
                  <FileCode size={16} style={{ color: 'var(--nikit-accent-base)' }} />
                  <span>Workspace System Instructions</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--nikit-text-tertiary)' }}>
                  {isSaved ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--nikit-local-base)' }}>
                      <Check size={12} /> Auto-saved
                    </span>
                  ) : (
                    'Saving...'
                  )}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--nikit-text-secondary)', margin: 0 }}>
                Configure guidelines, architectural constraints, and priorities that Nikit will follow for all chats inside this workspace.
              </p>

              <textarea
                className={styles.instructionsTextarea}
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                placeholder="Enter custom instructions for this project (e.g. 'Prioritize PyTorch-oriented solutions, enforce type annotations, focus on low-rank latent attention...')"
              />

              <div className={styles.instructionsFooter}>
                <span>{instructionsText.length} characters</span>
                <span>Assembled into generation context automatically</span>
              </div>
            </div>

            {/* Right: Project Conversations & Default Model */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Default Model Card */}
              <div className={styles.workspaceSectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>
                    <Cpu size={16} style={{ color: 'var(--nikit-accent-base)' }} />
                    <span>Default Model</span>
                  </span>
                </div>

                <Select
                  value={activeProject.defaultModelId}
                  onChange={(val) => handleModelChange(val)}
                  options={models.map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
              </div>

              {/* Conversations List Card */}
              <div className={styles.workspaceSectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>
                    <MessageSquare size={16} style={{ color: 'var(--nikit-accent-base)' }} />
                    <span>Project Conversations</span>
                  </span>
                  <Badge variant="default" size="sm">
                    {activeProjectConversations.length}
                  </Badge>
                </div>

                {activeProjectConversations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--nikit-text-tertiary)', fontSize: '13px' }}>
                    No conversations created in this workspace yet.
                    <div style={{ marginTop: '12px' }}>
                      <Button variant="outline" size="sm" onClick={handleNewProjectChat}>
                        Start First Chat
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.convList}>
                    {activeProjectConversations.map((c) => (
                      <div
                        key={c.id}
                        className={styles.convItem}
                        onClick={() => handleOpenConversation(c.id)}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className={styles.convItemTitle}>{c.title}</span>
                          <span className={styles.convItemTime}>{c.updatedAt}</span>
                        </div>

                        <Tooltip content="Remove from project (conversation remains in global chats)">
                          <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--nikit-text-tertiary)', cursor: 'pointer', padding: '4px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeConversationFromProject(activeProject.id, c.id);
                            }}
                            aria-label="Remove conversation from project"
                          >
                            <MinusCircle size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // Render: All Projects Hub
  // ==========================================================================
  return (
    <div className={styles.viewContainer}>
      <header className={styles.viewHeader}>
        <div className={styles.headerTopRow}>
          <div className={styles.badgeRow}>
            <Badge variant="accent" size="sm">
              Phase 4 Architecture
            </Badge>
            <Badge variant="default" size="sm">
              Persistent Workspaces
            </Badge>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Workspace
          </Button>
        </div>

        <h1 className={styles.viewTitle}>Projects & AI Workspaces</h1>
        <p className={styles.viewDescription}>
          Create dedicated workspaces with custom system instructions, default model configurations, and isolated conversation contexts.
        </p>
      </header>

      {/* Filter Tabs */}
      <div className={styles.filterBar}>
        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabButton} ${filterTab === 'active' ? styles.tabButtonActive : ''}`}
            onClick={() => setFilterTab('active')}
          >
            Active Workspaces ({projects.filter((p) => !p.archived).length})
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${filterTab === 'archived' ? styles.tabButtonActive : ''}`}
            onClick={() => setFilterTab('archived')}
          >
            Archived ({projects.filter((p) => p.archived).length})
          </button>
        </div>
      </div>

      {/* Projects Grid / Empty State */}
      {displayedProjects.length === 0 ? (
        <EmptyState
          icon={<Folder size={32} style={{ color: 'var(--nikit-accent-base)' }} />}
          title={filterTab === 'active' ? 'No Active Workspaces' : 'No Archived Workspaces'}
          description={
            filterTab === 'active'
              ? 'Initialize your first workspace to organize domain instructions, conversations, and model defaults.'
              : 'Archived project workspaces will appear here.'
          }
          action={
            filterTab === 'active' ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Workspace
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className={styles.projectsGrid}>
          {displayedProjects.map((p) => {
            const initials = p.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={p.id}
                className={styles.projectCard}
                onClick={() => setActiveProjectId(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveProjectId(p.id);
                  }
                }}
              >
                <div className={styles.projectCardHeader}>
                  <div className={styles.projectIconBox}>{initials || 'P'}</div>
                  <Badge variant={p.archived ? 'warning' : 'default'} size="sm">
                    {p.defaultModelName.split(' ')[0]}
                  </Badge>
                </div>

                <div>
                  <h3 className={styles.projectName}>{p.name}</h3>
                  <p className={styles.projectDesc}>
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className={styles.projectCardMeta}>
                  <span>{p.conversationCount} conversations</span>
                  <span>{p.updatedAt}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal Dialog */}
      <Dialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project Workspace"
        description="Initialize a dedicated persistent workspace with custom instructions and conversations."
      >
        <form onSubmit={handleCreateSubmit} className={styles.modalForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="proj-name">
              Workspace Name <span style={{ color: 'var(--nikit-danger-base)' }}>*</span>
            </label>
            <Input
              id="proj-name"
              placeholder="e.g. LLM Research, Rezel Native Hardening, ML Lab"
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="proj-desc">
              Description (Optional)
            </label>
            <Textarea
              id="proj-desc"
              placeholder="Brief summary of what this workspace is about..."
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
              rows={2}
            />
          </div>

          <div className={styles.modalActions}>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!newProjName.trim()}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
