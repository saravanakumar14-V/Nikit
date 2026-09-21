import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  Project,
  ProjectSummary,
  ConversationSummary,
} from '@nikit/types';
import { projectStore } from '../services/projects';
import { conversationStore } from '../services/storage';
import { useApp } from './AppContext';

export interface CreateProjectInput {
  name: string;
  description?: string;
  icon?: string;
  accent?: string;
}

export interface ProjectContextValue {
  projects: ProjectSummary[];
  activeProjectId: string | null;
  activeProject: Project | null;
  activeProjectConversations: ConversationSummary[];
  setActiveProjectId: (id: string | null) => void;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
  restoreProject: (id: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addConversationToProject: (projectId: string, conversationId: string) => Promise<void>;
  removeConversationFromProject: (projectId: string, conversationId: string) => Promise<void>;
  createProjectConversation: (projectId: string, title?: string) => Promise<string>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export interface ProjectProviderProps {
  children: ReactNode;
}

const STORAGE_ACTIVE_PROJECT_KEY = 'nikit:active_project_id';

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const { workspace } = useApp();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY) || null;
    } catch {
      return null;
    }
  });

  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeProjectConversations, setActiveProjectConversations] = useState<ConversationSummary[]>([]);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await projectStore.list(true);
      setProjects(list);
    } catch {
      // Ignore
    }
  }, []);

  const refreshActiveProject = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setActiveProject(null);
      setActiveProjectConversations([]);
      return;
    }

    try {
      const proj = await projectStore.get(projectId);
      setActiveProject(proj);

      const convs = await projectStore.getConversations(projectId);
      setActiveProjectConversations(convs);
    } catch {
      setActiveProject(null);
      setActiveProjectConversations([]);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    refreshActiveProject(activeProjectId);
  }, [activeProjectId, refreshActiveProject]);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_ACTIVE_PROJECT_KEY);
      }
    } catch {
      // Ignore
    }
  }, []);

  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<Project> => {
      const newProject = await projectStore.create({
        name: input.name.trim(),
        description: input.description?.trim() || '',
        icon: input.icon || 'Folder',
        accent: input.accent || 'var(--nikit-accent-base)',
        defaultModelId: workspace.activeModelId,
        defaultModelName: workspace.activeModelName,
      });

      await refreshProjects();
      setActiveProjectId(newProject.id);
      return newProject;
    },
    [workspace.activeModelId, workspace.activeModelName, refreshProjects, setActiveProjectId]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>): Promise<Project> => {
      const updated = await projectStore.update(id, updates);
      await refreshProjects();
      if (activeProjectId === id) {
        await refreshActiveProject(id);
      }
      return updated;
    },
    [activeProjectId, refreshProjects, refreshActiveProject]
  );

  const archiveProject = useCallback(
    async (id: string): Promise<Project> => {
      const archived = await projectStore.archive(id);
      await refreshProjects();
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
      return archived;
    },
    [activeProjectId, refreshProjects, setActiveProjectId]
  );

  const restoreProject = useCallback(
    async (id: string): Promise<Project> => {
      const restored = await projectStore.restore(id);
      await refreshProjects();
      return restored;
    },
    [refreshProjects]
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      await projectStore.delete(id);
      await refreshProjects();
      if (activeProjectId === id) {
        setActiveProjectId(null);
      }
    },
    [activeProjectId, refreshProjects, setActiveProjectId]
  );

  const addConversationToProject = useCallback(
    async (projectId: string, conversationId: string): Promise<void> => {
      await projectStore.addConversation(projectId, conversationId);
      await refreshProjects();
      if (activeProjectId === projectId) {
        await refreshActiveProject(projectId);
      }
    },
    [activeProjectId, refreshProjects, refreshActiveProject]
  );

  const removeConversationFromProject = useCallback(
    async (projectId: string, conversationId: string): Promise<void> => {
      await projectStore.removeConversation(projectId, conversationId);
      await refreshProjects();
      if (activeProjectId === projectId) {
        await refreshActiveProject(projectId);
      }
    },
    [activeProjectId, refreshProjects, refreshActiveProject]
  );

  const createProjectConversation = useCallback(
    async (projectId: string, title?: string): Promise<string> => {
      const project = await projectStore.get(projectId);
      const newConvId = `conv-${Date.now()}`;

      await conversationStore.create({
        id: newConvId,
        title: title || 'New Conversation',
        modelId: project?.defaultModelId || workspace.activeModelId,
        modelName: project?.defaultModelName || workspace.activeModelName,
        projectId,
      });

      if (project) {
        await projectStore.addConversation(projectId, newConvId);
      }

      await refreshProjects();
      if (activeProjectId === projectId) {
        await refreshActiveProject(projectId);
      }

      return newConvId;
    },
    [workspace.activeModelId, workspace.activeModelName, activeProjectId, refreshProjects, refreshActiveProject]
  );

  const value: ProjectContextValue = {
    projects,
    activeProjectId,
    activeProject,
    activeProjectConversations,
    setActiveProjectId,
    createProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    addConversationToProject,
    removeConversationFromProject,
    createProjectConversation,
    refreshProjects,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProject = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
