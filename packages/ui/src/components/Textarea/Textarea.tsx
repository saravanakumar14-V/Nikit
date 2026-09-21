import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | boolean;
  helperText?: string;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  showCount?: boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      autoResize = false,
      minRows = 2,
      maxRows = 10,
      showCount = false,
      fullWidth = false,
      disabled,
      className,
      value,
      onChange,
      maxLength,
      id,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(forwardedRef, () => internalRef.current as HTMLTextAreaElement);

    const inputId = id || (label ? `nikit-textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const hasError = Boolean(error);
    const currentLength = typeof value === 'string' ? value.length : 0;

    useEffect(() => {
      if (!autoResize || !internalRef.current) return;
      const element = internalRef.current;
      element.style.height = 'auto';
      
      const lineHeight = 20; // fallback approx
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;
      
      const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
      element.style.height = `${newHeight}px`;
    }, [value, autoResize, minRows, maxRows]);

    const containerClasses = [
      styles.container,
      fullWidth ? styles.fullWidth : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      styles.wrapper,
      hasError ? styles.hasError : '',
      disabled ? styles.disabled : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={wrapperClasses}>
          <textarea
            ref={internalRef}
            id={inputId}
            value={value}
            onChange={onChange}
            disabled={disabled}
            rows={minRows}
            maxLength={maxLength}
            className={styles.textarea}
            aria-invalid={hasError}
            {...props}
          />
        </div>
        <div className={styles.footer}>
          {hasError && typeof error === 'string' ? (
            <div className={styles.errorText} role="alert">
              {error}
            </div>
          ) : helperText ? (
            <div className={styles.helperText}>{helperText}</div>
          ) : (
            <div />
          )}
          {showCount && maxLength && (
            <span className={styles.counter}>
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
