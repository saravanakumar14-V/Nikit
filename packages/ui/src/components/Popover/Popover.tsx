import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Placement } from '@nikit/types';
import { useAnchoredPosition } from '../../hooks/useAnchoredPosition';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './Popover.module.css';

export interface PopoverProps {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  offset?: number;
  className?: string;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  width?: number | string;
}

export const Popover: React.FC<PopoverProps> = ({
  trigger,
  children,
  open: controlledOpen,
  onOpenChange,
  placement = 'bottom-start',
  offset = 6,
  className,
  closeOnClickOutside = true,
  closeOnEscape = true,
  width,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const setOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const { top, left, computedPlacement } = useAnchoredPosition(
    triggerRef,
    popoverRef,
    placement,
    offset,
    isOpen
  );

  useClickOutside(
    popoverRef,
    () => {
      if (closeOnClickOutside && isOpen) {
        setOpen(false);
      }
    },
    isOpen,
    [triggerRef]
  );

  useEscapeKey(() => {
    if (closeOnEscape && isOpen) {
      setOpen(false);
    }
  }, isOpen);

  return (
    <div className={styles.container}>
      {trigger && (
        <div
          ref={triggerRef}
          className={styles.triggerWrapper}
          onClick={() => setOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          {trigger}
        </div>
      )}

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            className={`${styles.popover} ${styles[computedPlacement]} ${className || ''}`}
            style={{
              top: `${top}px`,
              left: `${left}px`,
              width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
            }}
            role="region"
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  );
};
