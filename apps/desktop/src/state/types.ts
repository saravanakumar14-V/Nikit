import { AccentTheme } from '@nikit/tokens';
import { LocalRuntimeInfo, AIModel, ConversationSummary } from '@nikit/types';

export type PrimaryRouteId =
  | 'chat'
  | 'projects'
  | 'models'
  | 'files'
  | 'memory'
  | 'lab'
  | 'settings'
  | 'showcase';

export interface UIPreferences {
  accentTheme: AccentTheme;
  compactMode: boolean;
  codeLineNumbers: boolean;
  soundEffects: boolean;
  autoScroll: boolean;
  telemetryDisplay: boolean;
}

export interface WorkspaceContextState {
  activeWorkspaceId: string;
  workspaceName: string;
  activeModelId: string;
  activeModelName: string;
}

export interface AppState {
  // Sidebar State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;

  // UI Preferences
  preferences: UIPreferences;
  updatePreferences: (updates: Partial<UIPreferences>) => void;
  setAccentTheme: (theme: AccentTheme) => void;

  // Workspace & Active Model
  workspace: WorkspaceContextState;
  setWorkspaceModel: (modelId: string, modelName: string) => void;

  // Runtime State & Model Registry
  runtimeInfo: LocalRuntimeInfo;
  updateRuntimeInfo: (updates: Partial<LocalRuntimeInfo>) => void;
  models: AIModel[];
  activeModel: AIModel;

  // Conversation History
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createNewConversation: () => string;
  deleteConversation: (id: string) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

