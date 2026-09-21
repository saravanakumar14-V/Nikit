import React, { forwardRef } from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'elevated' | 'flat' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  selected?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'elevated',
      padding = 'md',
      selected = false,
      className,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.card,
      styles[variant],
      styles[`pad-${padding}`],
      selected ? styles.selected : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, action, className, children }) => {
  return (
    <div className={`${styles.header} ${className || ''}`}>
      {children ? (
        children
      ) : (
        <>
          <div className={styles.titleArea}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </>
      )}
    </div>
  );
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={`${styles.content} ${className || ''}`}>{children}</div>;

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={`${styles.footer} ${className || ''}`}>{children}</div>;
