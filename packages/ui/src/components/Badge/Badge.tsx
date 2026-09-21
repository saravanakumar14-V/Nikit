import React from 'react';
import { StatusVariant } from '@nikit/types';
import { X } from 'lucide-react';
import styles from './Badge.module.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: StatusVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
  onRemove?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  onRemove,
  className,
  ...props
}) => {
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className || ''}`}
      {...props}
    >
      {dot && (
        <span className={`${styles.dot} ${pulse ? styles.pulse : ''}`} aria-hidden="true" />
      )}
      <span className={styles.label}>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={styles.removeButton}
          aria-label="Remove badge"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};
