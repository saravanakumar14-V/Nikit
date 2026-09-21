import React from 'react';
import { Size } from '@nikit/types';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: Size;
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  label,
  className,
}) => {
  return (
    <div className={`${styles.container} ${className || ''}`} role="status" aria-live="polite">
      <svg className={`${styles.spinner} ${styles[size]}`} viewBox="0 0 24 24" fill="none">
        <circle
          className={styles.track}
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className={styles.head}
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.srOnly}>Loading...</span>
    </div>
  );
};
