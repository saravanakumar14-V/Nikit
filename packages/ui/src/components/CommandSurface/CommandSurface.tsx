import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowRight } from 'lucide-react';
import { CommandItem } from '@nikit/types';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './CommandSurface.module.css';

export interface CommandSurfaceProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
  className?: string;
}

export const CommandSurface: React.FC<CommandSurfaceProps> = ({
  open,
  onClose,
  items,
  placeholder = 'Type a command or search...',
  className,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEscapeKey(onClose, open);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower)
    );
  }, [items, query]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: { [category: string]: CommandItem[] } = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item && !item.disabled) {
        item.action();
        onClose();
      }
    }
  };

  if (!open || typeof document === 'undefined') return null;

  let flatIndexCounter = 0;

  return createPortal(
    <div className={styles.overlay} onKeyDown={handleKeyDown}>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={`${styles.palette} ${className || ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        <div className={styles.searchHeader}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className={styles.input}
          />
          <kbd className={styles.escBadge}>ESC</kbd>
        </div>

        <div className={styles.listContainer}>
          {filteredItems.length === 0 ? (
            <div className={styles.emptyState}>No matching commands</div>
          ) : (
            Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className={styles.group}>
                <div className={styles.groupHeader}>{category}</div>
                {categoryItems.map((item) => {
                  const currentIndex = flatIndexCounter++;
                  const isSelected = currentIndex === selectedIndex;

                  return (
                    <div
                      key={item.id}
                      className={`${styles.item} ${isSelected ? styles.selected : ''} ${
                        item.disabled ? styles.disabled : ''
                      }`}
                      onClick={() => {
                        if (!item.disabled) {
                          item.action();
                          onClose();
                        }
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className={styles.itemContent}>
                        <span className={styles.itemTitle}>{item.title}</span>
                        {item.description && (
                          <span className={styles.itemDescription}>{item.description}</span>
                        )}
                      </div>
                      <div className={styles.itemRight}>
                        {item.shortcut && (
                          <div className={styles.shortcut}>
                            {item.shortcut.map((key, kIdx) => (
                              <kbd key={kIdx} className={styles.kbdKey}>
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                        <ArrowRight size={14} className={styles.enterHint} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerHints}>
            <span>
              <kbd className={styles.kbdKey}>↑</kbd> <kbd className={styles.kbdKey}>↓</kbd> Navigate
            </span>
            <span>
              <kbd className={styles.kbdKey}>↵</kbd> Select
            </span>
          </div>
          <span className={styles.brandHint}>Nikit Command Surface</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
