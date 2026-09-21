import React from 'react';
import {
  MessageSquare,
  Folder,
  Cpu,
  FileText,
  Layers,
  Settings,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Sparkles,
  History,
  Brain,
} from 'lucide-react';
import { Tooltip } from '@nikit/ui';
import { useApp } from '../../state/AppContext';
import { useProject } from '../../state/ProjectContext';
import { useRouter } from '../../router/RouterContext';
import { PRIMARY_NAV_ROUTES, ROUTES } from '../../router/routes';
import { PrimaryRouteId } from '../../state/types';
import { formatShortcut } from '../../lib/platform';
import styles from './Sidebar.module.css';

const NAV_ICONS: Record<PrimaryRouteId, React.ReactNode> = {
  chat: <MessageSquare size={16} />,
  projects: <Folder size={16} />,
  models: <Cpu size={16} />,
  files: <FileText size={16} />,
  memory: <Brain size={16} />,
  lab: <Layers size={16} />,
  settings: <Settings size={16} />,
  showcase: <Sparkles size={16} />,
};

export const Sidebar: React.FC = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    conversations,
    activeConversationId,
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    setCommandPaletteOpen,
  } = useApp();

  const { projects, activeProjectId, setActiveProjectId } = useProject();

  const { currentRouteId, navigate } = useRouter();

  const newChatShortcut = formatShortcut('n');
  const searchShortcut = formatShortcut('k');
  const toggleSidebarShortcut = formatShortcut('b');

  const handleNewChat = () => {
    const newId = createNewConversation();
    navigate('chat', { id: newId });
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    navigate('chat', { id });
  };

  return (
    <aside
      className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded}`}
      aria-label="Application Sidebar"
    >
      {/* Header Actions */}
      <div className={styles.sidebarHeader}>
        {sidebarCollapsed ? (
          <Tooltip content={`New Chat (${newChatShortcut})`} placement="right">
            <button
              type="button"
              className={styles.newChatButton}
              onClick={handleNewChat}
              aria-label="New Conversation"
            >
              <Plus size={16} />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            className={styles.newChatButton}
            onClick={handleNewChat}
            aria-label="New Conversation"
          >
            <Plus size={16} />
            <span>New Chat</span>
            <kbd className={styles.newChatKbd}>{newChatShortcut}</kbd>
          </button>
        )}

        {sidebarCollapsed ? (
          <Tooltip content={`Quick Search (${searchShortcut})`} placement="right">
            <button
              type="button"
              className={styles.searchTriggerButton}
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Quick Search"
            >
              <Search size={15} />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            className={styles.searchTriggerButton}
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Quick Search"
          >
            <Search size={14} />
            <span>Search Nikit...</span>
            <kbd className={styles.newChatKbd}>{searchShortcut}</kbd>
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <nav className={styles.sidebarNav} aria-label="Primary Navigation">
        {PRIMARY_NAV_ROUTES.map((routeId) => {
          const route = ROUTES[routeId];
          const isActive = currentRouteId === routeId;
          const icon = NAV_ICONS[routeId];

          const buttonContent = (
            <button
              key={routeId}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => navigate(routeId)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={styles.navIcon}>{icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className={styles.navLabel}>{route.label}</span>
                  {route.badge && <span className={styles.navBadge}>{route.badge}</span>}
                </>
              )}
            </button>
          );

          if (sidebarCollapsed) {
            return (
              <Tooltip key={routeId} content={`${route.label} (${route.shortcut || ''})`} placement="right">
                {buttonContent}
              </Tooltip>
            );
          }

          return buttonContent;
        })}
      </nav>

      {/* Active Workspaces Section */}
      {!sidebarCollapsed && projects.filter((p) => !p.archived).length > 0 && (
        <div className={styles.workspaceSidebarSection}>
          <div className={styles.historyHeader}>
            <span>Workspaces</span>
            <span>{projects.filter((p) => !p.archived).length}</span>
          </div>
          <div className={styles.projectSidebarList}>
            {projects
              .filter((p) => !p.archived)
              .map((proj) => {
                const isSelected = currentRouteId === 'projects' && activeProjectId === proj.id;
                return (
                  <button
                    key={proj.id}
                    type="button"
                    className={`${styles.projectSidebarItem} ${isSelected ? styles.projectSidebarItemActive : ''}`}
                    onClick={() => {
                      setActiveProjectId(proj.id);
                      navigate('projects');
                    }}
                  >
                    <Folder size={13} style={{ color: 'var(--nikit-accent-base)' }} />
                    <span className={styles.projectSidebarTitle}>{proj.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Conversation History */}
      <div className={styles.historySection}>
        {sidebarCollapsed ? (
          <Tooltip content="Recent Conversations" placement="right">
            <div className={styles.collapsedHistoryIcon} onClick={toggleSidebar}>
              <History size={16} />
            </div>
          </Tooltip>
        ) : (
          <>
            <div className={styles.historyHeader}>
              <span>Recent Chats</span>
              <span>{conversations.length}</span>
            </div>
            <div className={styles.historyList}>
              {conversations.map((conv) => {
                const isSelected = currentRouteId === 'chat' && activeConversationId === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    className={`${styles.historyItem} ${isSelected ? styles.historyItemActive : ''}`}
                    onClick={() => handleSelectConversation(conv.id)}
                    title={conv.title}
                  >
                    <span className={styles.historyItemTitle}>{conv.title}</span>
                    <span className={styles.historyItemTime}>{conv.updatedAt}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className={styles.historyItemDelete}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }
                      }}
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer Area */}
      <div className={styles.sidebarFooter}>
        {!sidebarCollapsed && (
          <button
            type="button"
            className={styles.showcaseLink}
            onClick={() => navigate('showcase')}
            title="Open Phase 1 Design System Workbench"
          >
            <Sparkles size={13} style={{ color: 'var(--nikit-accent-base)' }} />
            <span>Design Tokens</span>
          </button>
        )}

        <Tooltip
          content={sidebarCollapsed ? `Expand Sidebar (${toggleSidebarShortcut})` : `Collapse Sidebar (${toggleSidebarShortcut})`}
          placement="right"
        >
          <button
            type="button"
            className={styles.toggleCollapseButton}
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
};
