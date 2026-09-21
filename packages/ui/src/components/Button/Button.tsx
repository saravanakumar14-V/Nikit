import React, { forwardRef } from 'react';
import { Size, Variant } from '@nikit/types';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : '',
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
        aria-busy={loading}
        {...props}
      >
        {loading && (
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
        )}
        {!loading && leftIcon && <span className={styles.iconSlot}>{leftIcon}</span>}
        <span className={styles.label}>{children}</span>
        {!loading && rightIcon && <span className={styles.iconSlot}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
