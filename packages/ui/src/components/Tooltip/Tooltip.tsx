import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Placement } from '@nikit/types';
import { useAnchoredPosition } from '../../hooks/useAnchoredPosition';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: Placement;
  delay?: number;
  shortcut?: string | string[];
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 200,
  shortcut,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const { top, left, computedPlacement } = useAnchoredPosition(
    triggerRef,
    tooltipRef,
    placement,
    6,
    isVisible
  );

  const shortcutDisplay = Array.isArray(shortcut) ? shortcut.join('') : shortcut;

  return (
    <span
      ref={triggerRef}
      className={styles.trigger}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape') hide();
      }}
    >
      {children}

      {isVisible &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[computedPlacement]}`}
            style={{ top: `${top}px`, left: `${left}px` }}
            role="tooltip"
          >
            <span className={styles.content}>{content}</span>
            {shortcutDisplay && <kbd className={styles.shortcut}>{shortcutDisplay}</kbd>}
          </div>,
          document.body
        )}
    </span>
  );
};
