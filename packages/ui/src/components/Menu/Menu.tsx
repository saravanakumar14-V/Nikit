import React, { forwardRef, useState, useRef } from 'react';
import { Placement } from '@nikit/types';
import { useAnchoredPosition } from '../../hooks/useAnchoredPosition';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './Menu.module.css';

// ============================================================================
// Menu Item
// ============================================================================

export interface MenuItemProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  shortcut?: string | string[];
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  children,
  icon,
  shortcut,
  destructive = false,
  disabled = false,
  onClick,
  className,
}) => {
  const shortcutDisplay = Array.isArray(shortcut) ? shortcut.join('') : shortcut;

  return (
    <button
      type="button"
      className={`${styles.item} ${destructive ? styles.destructive : ''} ${className || ''}`}
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
    >
      <div className={styles.itemLeft}>
        {icon && <span className={styles.itemIcon}>{icon}</span>}
        <span className={styles.itemLabel}>{children}</span>
      </div>
      {shortcutDisplay && <kbd className={styles.shortcut}>{shortcutDisplay}</kbd>}
    </button>
  );
};

// ============================================================================
// Menu Header & Divider
// ============================================================================

export const MenuHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={styles.header}>{children}</div>
);

export const MenuDivider: React.FC = () => <div className={styles.divider} role="separator" />;

// ============================================================================
// Menu Container
// ============================================================================

export interface MenuProps {
  children: React.ReactNode;
  className?: string;
  width?: number | string;
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  ({ children, className, width }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.menu} ${className || ''}`}
        style={{ width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined }}
        role="menu"
      >
        {children}
      </div>
    );
  }
);

Menu.displayName = 'Menu';

// ============================================================================
// Dropdown Trigger + Menu
// ============================================================================

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  offset?: number;
  width?: number | string;
  closeOnSelect?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  placement = 'bottom-start',
  offset = 4,
  width,
  closeOnSelect = true,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const { top, left } = useAnchoredPosition(triggerRef, menuRef, placement, offset, isOpen);

  useClickOutside(menuRef, () => setOpen(false), isOpen, [triggerRef]);
  useEscapeKey(() => setOpen(false), isOpen);

  const handleMenuClick = (e: React.MouseEvent) => {
    if (closeOnSelect) {
      const target = e.target as HTMLElement;
      if (target.closest('button[role="menuitem"]')) {
        setOpen(false);
      }
    }
  };

  return (
    <div className={styles.dropdownContainer}>
      <div
        ref={triggerRef}
        className={styles.triggerWrapper}
        onClick={() => setOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={menuRef}
          className={styles.floatingMenu}
          style={{
            top: `${top}px`,
            left: `${left}px`,
            width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
          }}
          onClick={handleMenuClick}
        >
          <Menu>{children}</Menu>
        </div>
      )}
    </div>
  );
};
