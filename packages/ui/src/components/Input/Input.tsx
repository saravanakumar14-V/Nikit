import React, { forwardRef } from 'react';
import { Size } from '@nikit/types';
import { X } from 'lucide-react';
import styles from './Input.module.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  sizeVariant?: Size;
  label?: string;
  error?: string | boolean;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      sizeVariant = 'md',
      label,
      error,
      helperText,
      prefixIcon,
      suffixIcon,
      clearable = false,
      onClear,
      fullWidth = false,
      disabled,
      className,
      value,
      onChange,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `nikit-input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasError = Boolean(error);
    const showClear = clearable && Boolean(value) && !disabled;

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      styles.inputWrapper,
      styles[sizeVariant],
      hasError ? styles.hasError : '',
      disabled ? styles.disabled : '',
    ]
      .filter(Boolean)
      .join(' ');

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onClear) {
        onClear();
      }
    };

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={wrapperClasses}>
          {prefixIcon && <span className={styles.prefix}>{prefixIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={styles.input}
            aria-invalid={hasError}
            aria-describedby={
              hasError && typeof error === 'string'
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              aria-label="Clear input"
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}
          {suffixIcon && !showClear && <span className={styles.suffix}>{suffixIcon}</span>}
        </div>
        {hasError && typeof error === 'string' && (
          <div id={`${inputId}-error`} className={styles.errorText} role="alert">
            {error}
          </div>
        )}
        {!hasError && helperText && (
          <div id={`${inputId}-helper`} className={styles.helperText}>
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
