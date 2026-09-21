import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  ChevronDown,
  Settings,
  Palette,
  ExternalLink,
  ShieldCheck,
  Folder,
} from 'lucide-react';
import { Badge, Popover, Avatar } from '@nikit/ui';
import { useApp } from '../../state/AppContext';
import { useProject } from '../../state/ProjectContext';
import { useRouter } from '../../router/RouterContext';
import { formatVramDisplay } from '../../state/runtimeAdapter';
import { formatShortcut } from '../../lib/platform';
import { derivePlatformStatus } from '../../services/runtime/runtimeStatusResolver';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { workspace, setCommandPaletteOpen, activeModel, runtimeInfo } = useApp();
  const { activeProject } = useProject();
  const { navigate } = useRouter();
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const searchShortcut = formatShortcut('k');

  const platformStatus = React.useMemo(() => {
    return derivePlatformStatus({
      runtimeInfo,
      activeModel,
    });
  }, [runtimeInfo, activeModel]);

  return (
    <header className={styles.header} aria-label="Application Header">
      {/* Left: Brand Identity & Active Model */}
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={styles.brandGroup}
          onClick={() => navigate('chat')}
          aria-label="Nikit Home"
        >
          <div className={styles.brandLogoDot} />
          <span className={styles.brandName}>Nikit</span>
        </button>

        {activeProject && (
          <>
            <span className={styles.brandDivider}>/</span>
            <button
              type="button"
              className={styles.modelTrigger}
              onClick={() => navigate('projects')}
              title={`Active Workspace: ${activeProject.name}`}
            >
              <Folder size={12} style={{ color: 'var(--nikit-accent-base)' }} />
              <span className={styles.modelNameText}>{activeProject.name}</span>
            </button>
          </>
        )}

        <span className={styles.brandDivider}>/</span>

        {/* Model Indicator & Popover */}
        <Popover
          open={modelPopoverOpen}
          onOpenChange={setModelPopoverOpen}
          trigger={
            <button
              type="button"
              className={styles.modelTrigger}
              aria-label="Active Model Details"
              aria-expanded={modelPopoverOpen}
            >
              <Sparkles size={13} className={styles.accentSparkle} />
              <span className={styles.modelNameText}>{workspace.activeModelName}</span>
              <Badge
                variant={
                  platformStatus.runtimeStatus === 'ONLINE'
                    ? 'local'
                    : platformStatus.runtimeStatus === 'STANDBY'
                    ? 'default'
                    : platformStatus.runtimeStatus === 'DEV_SIMULATION'
                    ? 'accent'
                    : 'warning'
                }
                size="sm"
                dot={platformStatus.isHardwareOnline}
              >
                {platformStatus.runtimeStatusLabel}
              </Badge>
              <ChevronDown size={12} className={styles.chevronIcon} />
            </button>
          }
        >
          <div className={styles.modelPopoverCard}>
            <div className={styles.modelPopoverHeader}>
              <span className={styles.modelPopoverTitle}>Model & Runtime State</span>
              <Badge
                variant={
                  platformStatus.modelStatus === 'LOADED'
                    ? 'local'
                    : platformStatus.modelStatus === 'SPECIFICATION_ONLY'
                    ? 'warning'
                    : platformStatus.modelStatus === 'SIMULATED_DEV_MODEL'
                    ? 'accent'
                    : 'default'
                }
                size="sm"
              >
                {platformStatus.modelStatusLabel}
              </Badge>
            </div>

            <div className={styles.modelDetailRow}>
              <span className={styles.modelDetailName}>{activeModel.name}</span>
              <span className={styles.modelDetailMeta}>{activeModel.description}</span>
            </div>

            <div className={styles.modelSpecGrid}>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Parameters</span>
                <span className={styles.specValue}>{activeModel.parameterCount || activeModel.specification?.parameterCount || 'TBD'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Precision</span>
                <span className={styles.specValue}>{activeModel.precision || activeModel.specification?.precision || 'Unknown'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Target Context</span>
                <span className={styles.specValue}>{activeModel.contextLength ? `${activeModel.contextLength.toLocaleString()} tokens` : activeModel.specification?.contextLength || 'Unknown'}</span>
              </div>
              <div className={styles.specItem}>
                <span className={styles.specLabel}>Hardware VRAM</span>
                <span className={styles.specValue}>{formatVramDisplay(runtimeInfo)}</span>
              </div>
            </div>
          </div>
        </Popover>
      </div>

      {/* Right: Quick Search & Profile Menu */}
      <div className={styles.headerRight}>
        <button
          type="button"
          className={styles.searchHeaderButton}
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search Nikit"
        >
          <Search size={14} />
          <span>Search Nikit...</span>
          <kbd className={styles.searchHeaderKbd}>{searchShortcut}</kbd>
        </button>

        <Popover
          open={profilePopoverOpen}
          onOpenChange={setProfilePopoverOpen}
          placement="bottom-end"
          trigger={
            <button type="button" className={styles.avatarButton} aria-label="Profile and Settings">
              <Avatar name="Nikit Operator" size="sm" status="local" />
            </button>
          }
        >
          <div className={styles.profileMenuCard}>
            <div className={styles.profileUserInfo}>
              <span className={styles.profileUserName}>Nikit Operator</span>
              <span className={styles.profileUserRole}>Local Engine Administrator</span>
            </div>

            <button
              type="button"
              className={styles.profileMenuItem}
              onClick={() => {
                setProfilePopoverOpen(false);
                navigate('settings');
              }}
            >
              <Settings size={14} />
              <span>Preferences & Compute</span>
            </button>

            <button
              type="button"
              className={styles.profileMenuItem}
              onClick={() => {
                setProfilePopoverOpen(false);
                navigate('settings');
              }}
            >
              <Palette size={14} />
              <span>Theme Accents</span>
            </button>

            <button
              type="button"
              className={styles.profileMenuItem}
              onClick={() => {
                setProfilePopoverOpen(false);
                navigate('showcase');
              }}
            >
              <ExternalLink size={14} />
              <span>Design System Preview</span>
            </button>

            <div
              style={{
                marginTop: '4px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--nikit-text-tertiary)',
                borderTop: '1px solid var(--nikit-border-subtle)',
              }}
            >
              <ShieldCheck size={13} style={{ color: 'var(--nikit-local-base)' }} />
              <span>All inference offline & private</span>
            </div>
          </div>
        </Popover>
      </div>
    </header>
  );
};
