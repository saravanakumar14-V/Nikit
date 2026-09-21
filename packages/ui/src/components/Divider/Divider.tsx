import React from 'react';
import styles from './Divider.module.css';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  children?: React.ReactNode;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  children,
  className,
}) => {
  if (orientation === 'vertical') {
    return <div className={`${styles.vertical} ${className || ''}`} role="separator" />;
  }

  if (children) {
    return (
      <div className={`${styles.withLabel} ${className || ''}`} role="separator">
        <span className={styles.line} />
        <span className={styles.label}>{children}</span>
        <span className={styles.line} />
      </div>
    );
  }

  return <div className={`${styles.horizontal} ${className || ''}`} role="separator" />;
};
