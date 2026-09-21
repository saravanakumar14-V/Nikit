import React, { useEffect } from 'react';
import { CommandSurface } from '@nikit/ui';
import { CommandItem } from '@nikit/types';
import { AppProvider, useApp } from './state/AppContext';
import { ProjectProvider } from './state/ProjectContext';
import { FileProvider } from './state/FileContext';
import { ConversationProvider } from './state/ConversationContext';
import { RouterProvider, useRouter } from './router/RouterContext';
import { AppLayout } from './components/shell/AppLayout';
import { getModifierKey } from './lib/platform';
import { ChatView } from './views/ChatView';
import { ProjectsView } from './views/ProjectsView';
import { ModelsView } from './views/ModelsView';
import { FilesView } from './views/FilesView';
import { MemoryView } from './views/MemoryView';
import { LabView } from './views/LabView';
import { SettingsView } from './views/SettingsView';
import { ShowcaseView } from './views/ShowcaseView';

const ShellContent: React.FC = () => {
  const {
    toggleSidebar,
    createNewConversation,
    commandPaletteOpen,
    setCommandPaletteOpen,
    toggleCommandPalette,
    setAccentTheme,
  } = useApp();

  const { currentRouteId, navigate } = useRouter();
  const modKey = getModifierKey();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const isModifier = e.metaKey || e.ctrlKey;

      if (isModifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (isModifier && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (isModifier && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const newId = createNewConversation();
        navigate('chat', { id: newId });
        return;
      }

      // Route switching shortcuts 1 to 6
      if (isModifier) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('chat');
            break;
          case '2':
            e.preventDefault();
            navigate('projects');
            break;
          case '3':
            e.preventDefault();
            navigate('models');
            break;
          case '4':
            e.preventDefault();
            navigate('files');
            break;
          case '5':
            e.preventDefault();
            navigate('lab');
            break;
          case '6':
            e.preventDefault();
            navigate('settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, toggleSidebar, createNewConversation, navigate]);

  // Command Palette Items (Platform-aware shortcuts)
  const commandItems: CommandItem[] = [
    {
      id: 'cmd-new-chat',
      title: 'New Conversation',
      category: 'Chat',
      shortcut: [modKey, 'N'],
      action: () => {
        const id = createNewConversation();
        navigate('chat', { id });
      },
    },
    {
      id: 'cmd-nav-chat',
      title: 'Go to Chat Workspace',
      category: 'Navigation',
      shortcut: [modKey, '1'],
      action: () => navigate('chat'),
    },
    {
      id: 'cmd-nav-projects',
      title: 'Go to Projects Workspace',
      category: 'Navigation',
      shortcut: [modKey, '2'],
      action: () => navigate('projects'),
    },
    {
      id: 'cmd-nav-models',
      title: 'Go to Model Registry & Runtime',
      category: 'Navigation',
      shortcut: [modKey, '3'],
      action: () => navigate('models'),
    },
    {
      id: 'cmd-nav-files',
      title: 'Go to Files & Knowledge Vector Store',
      category: 'Navigation',
      shortcut: [modKey, '4'],
      action: () => navigate('files'),
    },
    {
      id: 'cmd-nav-lab',
      title: 'Go to Model Laboratory & Tokenizer Studio',
      category: 'Navigation',
      shortcut: [modKey, '5'],
      action: () => navigate('lab'),
    },
    {
      id: 'cmd-nav-settings',
      title: 'Go to Settings & Preferences',
      category: 'Navigation',
      shortcut: [modKey, '6'],
      action: () => navigate('settings'),
    },
    {
      id: 'cmd-toggle-sidebar',
      title: 'Toggle Desktop Sidebar',
      category: 'View',
      shortcut: [modKey, 'B'],
      action: toggleSidebar,
    },
    {
      id: 'cmd-theme-cobalt',
      title: 'Set Accent Theme: Titanium Cobalt',
      category: 'Appearance',
      action: () => setAccentTheme('cobalt'),
    },
    {
      id: 'cmd-theme-indigo',
      title: 'Set Accent Theme: Hyper Indigo',
      category: 'Appearance',
      action: () => setAccentTheme('indigo'),
    },
    {
      id: 'cmd-theme-cyan',
      title: 'Set Accent Theme: Quantum Cyan',
      category: 'Appearance',
      action: () => setAccentTheme('cyan'),
    },
    {
      id: 'cmd-theme-amber',
      title: 'Set Accent Theme: Amber Core',
      category: 'Appearance',
      action: () => setAccentTheme('amber'),
    },
    {
      id: 'cmd-theme-emerald',
      title: 'Set Accent Theme: Emerald Engine',
      category: 'Appearance',
      action: () => setAccentTheme('emerald'),
    },
    {
      id: 'cmd-memory',
      title: 'Open Memory & Context Intelligence',
      category: 'Navigation',
      action: () => navigate('memory'),
    },
    {
      id: 'cmd-showcase',
      title: 'Open Phase 1 Design System Workbench',
      category: 'Developer',
      action: () => navigate('showcase'),
    },
  ];

  const isFullWidthRoute =
    currentRouteId === 'chat' || currentRouteId === 'showcase' || currentRouteId === 'lab';

  return (
    <AppLayout isFullWidth={isFullWidthRoute}>
      {currentRouteId === 'chat' && <ChatView />}
      {currentRouteId === 'projects' && <ProjectsView />}
      {currentRouteId === 'models' && <ModelsView />}
      {currentRouteId === 'files' && <FilesView />}
      {currentRouteId === 'memory' && <MemoryView />}
      {currentRouteId === 'lab' && <LabView />}
      {currentRouteId === 'settings' && <SettingsView />}
      {currentRouteId === 'showcase' && <ShowcaseView />}

      <CommandSurface
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        items={commandItems}
      />
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <ProjectProvider>
        <FileProvider>
          <ConversationProvider>
            <RouterProvider initialRoute="chat">
              <ShellContent />
            </RouterProvider>
          </ConversationProvider>
        </FileProvider>
      </ProjectProvider>
    </AppProvider>
  );
};

export default App;
