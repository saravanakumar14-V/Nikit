import React from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './ScrollToLatest.module.css';

export interface ScrollToLatestProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export const ScrollToLatest: React.FC<ScrollToLatestProps> = ({ onClick, hasUnread }) => {
  return (
    <button
      type="button"
      className={styles.scrollButton}
      onClick={onClick}
      aria-label="Scroll to latest messages"
    >
      {hasUnread && <span className={styles.badgeDot} />}
      <span>Scroll to latest</span>
      <ChevronDown size={14} className={styles.icon} />
    </button>
  );
};
