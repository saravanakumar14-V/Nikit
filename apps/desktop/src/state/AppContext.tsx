import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { AccentTheme } from '@nikit/tokens';
import { LocalRuntimeInfo, AIModel, ConversationSummary } from '@nikit/types';
import {
  AppState,
  UIPreferences,
  WorkspaceContextState,
} from './types';
import { DEFAULT_RUNTIME_INFO, INITIAL_MODELS } from './runtimeAdapter';
import { conversationStore } from '../services/storage';

const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'nikit:sidebar_collapsed',
  PREFERENCES: 'nikit:ui_preferences',
  ACTIVE_CONVERSATION: 'nikit:active_conversation_id',
};

const DEFAULT_PREFERENCES: UIPreferences = {
  accentTheme: 'cobalt',
  compactMode: false,
  codeLineNumbers: true,
  soundEffects: false,
  autoScroll: true,
  telemetryDisplay: true,
};

const DEFAULT_WORKSPACE: WorkspaceContextState = {
  activeWorkspaceId: 'ws-default',
  workspaceName: 'Local Workspace',
  activeModelId: 'mock-dev',
  activeModelName: 'Mock Development Model',
};

const AppContext = createContext<AppState | undefined>(undefined);

export interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // 1. Sidebar Collapsed State
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const setSidebarCollapsed = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      setSidebarCollapsedState((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        try {
          localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(next));
        } catch {
          // Ignore localStorage errors
        }
        return next;
      });
    },
    []
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, [setSidebarCollapsed]);

  // 2. UI Preferences
  const [preferences, setPreferences] = useState<UIPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const updatePreferences = useCallback((updates: Partial<UIPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  }, []);

  const setAccentTheme = useCallback(
    (accentTheme: AccentTheme) => {
      updatePreferences({ accentTheme });
    },
    [updatePreferences]
  );

  // Synchronize Accent Theme with Document Root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-accent', preferences.accentTheme);
  }, [preferences.accentTheme]);

  // 3. Runtime & Hardware State
  const [runtimeInfo, setRuntimeInfo] = useState<LocalRuntimeInfo>(DEFAULT_RUNTIME_INFO);

  const updateRuntimeInfo = useCallback((updates: Partial<LocalRuntimeInfo>) => {
    setRuntimeInfo((prev) => ({ ...prev, ...updates }));
  }, []);

  // 4. Model Registry
  const [models] = useState<AIModel[]>(INITIAL_MODELS);

  // 5. Workspace State
  const [workspace, setWorkspace] = useState<WorkspaceContextState>(DEFAULT_WORKSPACE);

  const setWorkspaceModel = useCallback((modelId: string, modelName: string) => {
    setWorkspace((prev) => ({
      ...prev,
      activeModelId: modelId,
      activeModelName: modelName,
    }));
  }, []);

  const activeModel = useMemo(() => {
    return models.find((m) => m.id === workspace.activeModelId) || models[0];
  }, [models, workspace.activeModelId]);

  // 6. Conversation History
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await conversationStore.list();
      setConversations(list);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION) || 'conv-1';
    } catch {
      return 'conv-1';
    }
  });

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
    try {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const createNewConversation = useCallback((): string => {
    const newId = `conv-${Date.now()}`;
    conversationStore
      .create({
        id: newId,
        title: 'New Conversation',
        modelId: workspace.activeModelId,
        modelName: workspace.activeModelName,
      })
      .then(() => {
        refreshConversations();
      });
    setActiveConversationId(newId);
    return newId;
  }, [workspace.activeModelId, workspace.activeModelName, setActiveConversationId, refreshConversations]);

  const deleteConversation = useCallback(
    (id: string) => {
      conversationStore.delete(id).then(() => {
        refreshConversations();
      });
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId, setActiveConversationId, refreshConversations]
  );

  // 7. Command Palette State
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((prev) => !prev);
  }, []);

  const value: AppState = {
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    preferences,
    updatePreferences,
    setAccentTheme,
    workspace,
    setWorkspaceModel,
    runtimeInfo,
    updateRuntimeInfo,
    models,
    activeModel,
    conversations,
    activeConversationId,
    setActiveConversationId,
    createNewConversation,
    deleteConversation,
    commandPaletteOpen,
    setCommandPaletteOpen,
    toggleCommandPalette,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

