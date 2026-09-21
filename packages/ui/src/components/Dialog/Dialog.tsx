import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { IconButton } from '../IconButton';
import styles from './Dialog.module.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number | string;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth,
  closeOnBackdropClick = true,
  className,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEscapeKey(onClose, open);

  // Prevent background scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        className={styles.backdrop}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${className || ''}`}
        style={{
          maxWidth: maxWidth
            ? typeof maxWidth === 'number'
              ? `${maxWidth}px`
              : maxWidth
            : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'nikit-dialog-title' : undefined}
        aria-describedby={description ? 'nikit-dialog-desc' : undefined}
      >
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            {title && (
              <h2 id="nikit-dialog-title" className={styles.title}>
                {title}
              </h2>
            )}
            {description && (
              <p id="nikit-dialog-desc" className={styles.description}>
                {description}
              </p>
            )}
          </div>
          <IconButton
            icon={<X size={16} />}
            aria-label="Close dialog"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        </div>

        <div className={styles.content}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
