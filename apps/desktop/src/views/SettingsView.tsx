import React, { useState, useEffect } from 'react';
import { Palette, Sliders, Cpu, Keyboard, Brain } from 'lucide-react';
import { AccentTheme } from '@nikit/tokens';
import { MemoryPolicy } from '@nikit/types';
import { useApp } from '../state/AppContext';
import { useRouter } from '../router/RouterContext';
import { memoryService, DEFAULT_MEMORY_POLICY } from '../services/memory';
import { formatRamDisplay, formatVramDisplay } from '../state/runtimeAdapter';
import styles from './SettingsView.module.css';

const ACCENT_OPTIONS: { id: AccentTheme; label: string; colorHex: string }[] = [
  { id: 'cobalt', label: 'Titanium Cobalt', colorHex: '#3b82f6' },
  { id: 'indigo', label: 'Hyper Indigo', colorHex: '#6366f1' },
  { id: 'cyan', label: 'Quantum Cyan', colorHex: '#06b6d4' },
  { id: 'amber', label: 'Amber Core', colorHex: '#d97706' },
  { id: 'emerald', label: 'Emerald Engine', colorHex: '#10b981' },
];

export const SettingsView: React.FC = () => {
  const { preferences, updatePreferences, setAccentTheme, runtimeInfo } = useApp();
  const { navigate } = useRouter();
  const [memoryPolicy, setMemoryPolicy] = useState<MemoryPolicy>({ ...DEFAULT_MEMORY_POLICY });

  useEffect(() => {
    memoryService.getPolicy().then(setMemoryPolicy);
  }, []);

  const handleUpdateMemoryPolicy = async (patch: Partial<MemoryPolicy>) => {
    const updated = await memoryService.updatePolicy(patch);
    setMemoryPolicy(updated);
  };


  return (
    <div className={styles.viewContainer}>
      <header className={styles.viewHeader}>
        <h1 className={styles.viewTitle}>Application Settings & Preferences</h1>
        <p className={styles.viewDescription}>
          Configure your visual appearance, interface density, local inference defaults, and keyboard navigation.
        </p>
      </header>

      {/* 1. Theme & Accent Customization */}
      <section className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <Palette size={18} style={{ color: 'var(--nikit-accent-base)' }} />
          <span>Interface Accent Palette</span>
        </div>
        <p className={styles.sectionDesc}>
          Select your preferred high-contrast accent theme. This updates all interactive tokens, focus rings, and glowing indicators instantly.
        </p>

        <div className={styles.accentGrid}>
          {ACCENT_OPTIONS.map((opt) => {
            const isSelected = preferences.accentTheme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`${styles.accentOption} ${isSelected ? styles.accentOptionSelected : ''}`}
                onClick={() => setAccentTheme(opt.id)}
              >
                <div
                  className={styles.accentColorDisc}
                  style={{ backgroundColor: opt.colorHex }}
                />
                <span className={styles.accentOptionLabel}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. UI Preferences */}
      <section className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <Sliders size={18} style={{ color: 'var(--nikit-accent-base)' }} />
          <span>Display & Interaction</span>
        </div>

        <div className={styles.prefList}>
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Display Telemetry Metrics</span>
              <span className={styles.prefSubtext}>
                Show generation throughput (tokens/sec), time-to-first-token, and VRAM memory usage tags on responses.
              </span>
            </div>
            <button
              type="button"
              className={`${styles.toggleSwitch} ${preferences.telemetryDisplay ? styles.toggleSwitchActive : ''}`}
              onClick={() => updatePreferences({ telemetryDisplay: !preferences.telemetryDisplay })}
              aria-label="Toggle telemetry display"
            >
              <div className={styles.toggleSwitchKnob} />
            </button>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Auto-Scroll Generation</span>
              <span className={styles.prefSubtext}>
                Smoothly follow streaming responses in the chat view during token generation.
              </span>
            </div>
            <button
              type="button"
              className={`${styles.toggleSwitch} ${preferences.autoScroll ? styles.toggleSwitchActive : ''}`}
              onClick={() => updatePreferences({ autoScroll: !preferences.autoScroll })}
              aria-label="Toggle auto scroll"
            >
              <div className={styles.toggleSwitchKnob} />
            </button>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Code Block Line Numbers</span>
              <span className={styles.prefSubtext}>
                Render gutter line numbering on syntax-highlighted code blocks.
              </span>
            </div>
            <button
              type="button"
              className={`${styles.toggleSwitch} ${preferences.codeLineNumbers ? styles.toggleSwitchActive : ''}`}
              onClick={() => updatePreferences({ codeLineNumbers: !preferences.codeLineNumbers })}
              aria-label="Toggle code line numbers"
            >
              <div className={styles.toggleSwitchKnob} />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Hardware Diagnostics */}
      <section className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <Cpu size={18} style={{ color: 'var(--nikit-accent-base)' }} />
          <span>Local Engine & Hardware Diagnostics</span>
        </div>

        <div className={styles.prefList}>
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>GPU & Acceleration Device</span>
              <span className={styles.prefSubtext}>
                {runtimeInfo.gpuName || 'Unknown'} · CUDA:{' '}
                {runtimeInfo.cudaStatus === 'detected'
                  ? runtimeInfo.cudaVersion || 'Active'
                  : 'Unknown / Not detected'}
              </span>
            </div>
            <span
              style={{
                color: runtimeInfo.isRealHardwareDetected
                  ? 'var(--nikit-local-base)'
                  : 'var(--nikit-text-tertiary)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {runtimeInfo.isRealHardwareDetected ? '● Detected & Active' : '● Detection Pending'}
            </span>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Host Memory Allocation (RAM / VRAM)</span>
              <span className={styles.prefSubtext}>
                System RAM: {formatRamDisplay(runtimeInfo)} · VRAM: {formatVramDisplay(runtimeInfo)}
              </span>
            </div>
            <span
              style={{
                color: 'var(--nikit-text-secondary)',
                fontSize: '12px',
                fontFamily: 'var(--nikit-font-mono)',
              }}
            >
              {runtimeInfo.isRealHardwareDetected ? 'Active' : 'Uninitialized'}
            </span>
          </div>
        </div>
      </section>

      {/* 4. Memory & Privacy Policies (Phase 8) */}
      <section className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <Brain size={18} style={{ color: 'var(--nikit-accent-base)' }} />
          <span>Memory & Context Intelligence Policy</span>
        </div>
        <p className={styles.sectionDesc}>
          Control persistent memory behaviors, scoping rules, and explicit-save requirements. Memories are local-first and never extracted silently.
        </p>

        <div className={styles.prefGroup}>
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Enable Persistent Memory</span>
              <span className={styles.prefSubtext}>
                Allow Nikit to maintain user preferences and project-scoped facts across sessions
              </span>
            </div>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                className={styles.switchInput}
                checked={memoryPolicy.enabled}
                onChange={(e) => handleUpdateMemoryPolicy({ enabled: e.target.checked })}
              />
              <span className={styles.switchSlider} />
            </label>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Require Explicit User Save</span>
              <span className={styles.prefSubtext}>
                Only store memories when explicitly saved via message actions or Memory settings
              </span>
            </div>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                className={styles.switchInput}
                checked={memoryPolicy.requireExplicitSave}
                onChange={(e) => handleUpdateMemoryPolicy({ requireExplicitSave: e.target.checked })}
              />
              <span className={styles.switchSlider} />
            </label>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Allow Project-Scoped Memory</span>
              <span className={styles.prefSubtext}>
                Isolate project-specific facts so they never leak into unrelated workspaces
              </span>
            </div>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                className={styles.switchInput}
                checked={memoryPolicy.allowProjectMemory}
                onChange={(e) => handleUpdateMemoryPolicy({ allowProjectMemory: e.target.checked })}
              />
              <span className={styles.switchSlider} />
            </label>
          </div>

          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <span className={styles.prefLabel}>Memory Management Surface</span>
              <span className={styles.prefSubtext}>
                View, audit, edit, archive, or permanently delete individual user and project memories
              </span>
            </div>
            <button
              type="button"
              className={styles.actionBtnSecondary}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-subtle)',
                background: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
              }}
              onClick={() => navigate('memory')}
            >
              Open Memory Manager →
            </button>
          </div>
        </div>
      </section>

      {/* 5. Keyboard Navigation Cheatsheet */}
      <section className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <Keyboard size={18} style={{ color: 'var(--nikit-accent-base)' }} />
          <span>Keyboard Shortcuts</span>
        </div>

        <table className={styles.shortcutTable}>
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
              <th>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Quick Search / Command Palette</td>
              <td>Open global spotlight search for commands, chats, and actions</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ K</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+K</kbd>
              </td>
            </tr>
            <tr>
              <td>Toggle Sidebar</td>
              <td>Collapse or expand the desktop navigation bar</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ B</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+B</kbd>
              </td>
            </tr>
            <tr>
              <td>New Conversation</td>
              <td>Start a fresh conversation thread in the chat view</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ N</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+N</kbd>
              </td>
            </tr>
            <tr>
              <td>Navigate to Chat</td>
              <td>Switch directly to the Chat view</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ 1</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+1</kbd>
              </td>
            </tr>
            <tr>
              <td>Navigate to Projects</td>
              <td>Switch directly to the Projects workspace</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ 2</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+2</kbd>
              </td>
            </tr>
            <tr>
              <td>Navigate to Models</td>
              <td>Switch directly to the Models registry</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ 3</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+3</kbd>
              </td>
            </tr>
            <tr>
              <td>Navigate to Files</td>
              <td>Switch directly to the Files & Knowledge base</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ 4</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+4</kbd>
              </td>
            </tr>
            <tr>
              <td>Navigate to Lab</td>
              <td>Switch directly to Model Laboratory</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ 5</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+5</kbd>
              </td>
            </tr>
            <tr>
              <td>Navigate to Settings</td>
              <td>Switch directly to Settings view</td>
              <td>
                <kbd className={styles.shortcutKbd}>⌘ 6</kbd> / <kbd className={styles.shortcutKbd}>Ctrl+6</kbd>
              </td>
            </tr>
            <tr>
              <td>Dismiss Modal / Popover</td>
              <td>Close open dialogs, menus, or command surface</td>
              <td>
                <kbd className={styles.shortcutKbd}>Escape</kbd>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
};
