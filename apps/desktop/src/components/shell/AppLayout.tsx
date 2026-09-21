import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import styles from './AppLayout.module.css';

export interface AppLayoutProps {
  children: ReactNode;
  isFullWidth?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, isFullWidth = false }) => {
  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <div className={styles.mainColumn}>
        <Header />
        <main
          className={`${styles.contentRegion} ${isFullWidth ? styles.contentRegionFull : ''}`}
          role="main"
          id="main-content"
          tabIndex={-1}
        >
          {isFullWidth ? (
            <div className={styles.fullWidth}>{children}</div>
          ) : (
            <div className={styles.constrainedWidth}>{children}</div>
          )}
        </main>
      </div>
    </div>
  );
};
