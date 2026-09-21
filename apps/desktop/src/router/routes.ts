import { PrimaryRouteId } from '../state/types';

export interface RouteConfig {
  id: PrimaryRouteId;
  label: string;
  path: string;
  description: string;
  shortcut?: string;
  badge?: string;
}

export const ROUTES: Record<PrimaryRouteId, RouteConfig> = {
  chat: {
    id: 'chat',
    label: 'Chat',
    path: '/chat',
    description: 'Conversational assistant, code analysis, and reasoning workspace',
    shortcut: '⌘1',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    path: '/projects',
    description: 'Workspaces, multi-file codebases, and domain agent contexts',
    shortcut: '⌘2',
    badge: 'Phase 3',
  },
  models: {
    id: 'models',
    label: 'Models',
    path: '/models',
    description: 'Local execution engines, quantization, and model registry',
    shortcut: '⌘3',
    badge: 'Phase 4',
  },
  files: {
    id: 'files',
    label: 'Files & Data',
    path: '/files',
    description: 'RAG knowledge bases, documents, and vector embeddings',
    shortcut: '⌘4',
    badge: 'Phase 5',
  },
  memory: {
    id: 'memory',
    label: 'Memory',
    path: '/memory',
    description: 'Persistent user preferences, project facts, and context intelligence',
    shortcut: '⌘5',
    badge: 'Phase 8',
  },
  lab: {
    id: 'lab',
    label: 'Model Lab',
    path: '/lab',
    description: 'Tokenizer analytics, latent attention visualizer, and training runs',
    shortcut: '⌘6',
    badge: 'Phase 6',
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    description: 'Theme accents, compute hardware preferences, and shortcuts',
    shortcut: '⌘7',
  },
  showcase: {
    id: 'showcase',
    label: 'Design System',
    path: '/showcase',
    description: 'Phase 1 design tokens, primitive workbench, and pattern library',
  },
};

export const PRIMARY_NAV_ROUTES: PrimaryRouteId[] = [
  'chat',
  'projects',
  'models',
  'files',
  'memory',
  'lab',
  'settings',
];
