import React from 'react';
import styles from './Progress.module.css';

export interface ProgressProps {
  value?: number; // 0 to 100, or undefined for indeterminate
  max?: number;
  size?: 'sm' | 'md';
  variant?: 'accent' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'accent',
  showLabel = false,
  className,
}) => {
  const isIndeterminate = value === undefined;
  const percentage = !isIndeterminate ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div
        className={`${styles.track} ${styles[size]}`}
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`${styles.fill} ${styles[variant]} ${
            isIndeterminate ? styles.indeterminate : ''
          }`}
          style={{ width: isIndeterminate ? undefined : `${percentage}%` }}
        />
      </div>
      {showLabel && !isIndeterminate && (
        <span className={styles.label}>{Math.round(percentage)}%</span>
      )}
    </div>
  );
};
