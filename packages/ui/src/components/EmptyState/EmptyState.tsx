import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateSuggestion {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  suggestions?: EmptyStateSuggestion[];
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  suggestions,
  action,
  className,
}) => {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      {icon && <div className={styles.iconContainer}>{icon}</div>}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}

      {suggestions && suggestions.length > 0 && (
        <div className={styles.suggestionsGrid}>
          {suggestions.map((sug, idx) => (
            <div
              key={idx}
              className={styles.suggestionCard}
              onClick={sug.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  sug.onClick();
                }
              }}
            >
              {sug.icon && <span className={styles.suggestionIcon}>{sug.icon}</span>}
              <div className={styles.suggestionText}>
                <span className={styles.suggestionTitle}>{sug.title}</span>
                {sug.subtitle && (
                  <span className={styles.suggestionSubtitle}>{sug.subtitle}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
