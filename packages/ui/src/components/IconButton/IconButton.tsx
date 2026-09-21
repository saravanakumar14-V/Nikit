import React, { forwardRef } from 'react';
import { Size, Variant } from '@nikit/types';
import styles from './IconButton.module.css';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.iconButton,
      styles[variant],
      styles[size],
      loading ? styles.loading : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        className={classNames}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-busy={loading}
        title={props.title || ariaLabel}
        {...props}
      >
        {loading ? (
          <span className={styles.spinner} aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" className={styles.spinnerIcon}>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
              <path
                d="M8 2a6 6 0 0 1 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : (
          <span className={styles.icon}>{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
