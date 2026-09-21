import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: number | string;
  height?: number | string;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className,
  style,
}) => {
  const elements = Array.from({ length: count }, (_, idx) => (
    <span
      key={idx}
      className={`${styles.skeleton} ${styles[variant]} ${className || ''}`}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        ...style,
      }}
      aria-hidden="true"
    />
  ));

  return count === 1 ? elements[0] : <div className={styles.stack}>{elements}</div>;
};
