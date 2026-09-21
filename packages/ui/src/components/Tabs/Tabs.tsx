import React, { useRef, useState } from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab?: string;
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'segmented' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  defaultTab,
  onChange,
  variant = 'segmented',
  size = 'md',
  fullWidth = false,
  className,
}) => {
  const isControlled = controlledActiveTab !== undefined;
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const activeId = isControlled ? controlledActiveTab : internalActiveTab;

  const tabListRef = useRef<HTMLDivElement | null>(null);

  const handleTabClick = (tabId: string) => {
    if (!isControlled) {
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex !== currentIndex && enabledTabs[nextIndex]) {
      const nextTab = enabledTabs[nextIndex];
      handleTabClick(nextTab.id);
      const buttonEl = tabListRef.current?.querySelector<HTMLButtonElement>(
        `button[data-tab-id="${nextTab.id}"]`
      );
      buttonEl?.focus();
    }
  };

  return (
    <div
      ref={tabListRef}
      className={`${styles.tabList} ${styles[variant]} ${styles[size]} ${
        fullWidth ? styles.fullWidth : ''
      } ${className || ''}`}
      role="tablist"
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeId;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            data-tab-id={tab.id}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && handleTabClick(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
          >
            {tab.icon && <span className={styles.tabIcon}>{tab.icon}</span>}
            <span className={styles.tabLabel}>{tab.label}</span>
            {tab.badge && <span className={styles.tabBadge}>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
