import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  retryLabel = 'Try Again',
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`${styles.container} ${className || ''}`} role="alert">
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={18} />
        </div>
        <div className={styles.textWrapper}>
          <h4 className={styles.title}>{title}</h4>
          <p className={styles.message}>{message}</p>
        </div>
      </div>

      {details && (
        <div className={styles.detailsContainer}>
          <button
            type="button"
            className={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
          >
            <span>{showDetails ? 'Hide technical details' : 'Show technical details'}</span>
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showDetails && <pre className={styles.detailsCode}>{details}</pre>}
        </div>
      )}

      {onRetry && (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
