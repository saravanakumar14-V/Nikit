import React, { useState } from 'react';
import { ExtendedSize } from '@nikit/types';
import styles from './Avatar.module.css';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: ExtendedSize;
  status?: 'online' | 'offline' | 'local' | 'busy';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'User',
  size = 'md',
  status,
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const showImage = src && !imageError;

  return (
    <div className={`${styles.avatarWrapper} ${styles[size]} ${className || ''}`}>
      <div className={styles.avatar}>
        {showImage ? (
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className={styles.image}
          />
        ) : (
          <span className={styles.initials}>{getInitials(name)}</span>
        )}
      </div>
      {status && <span className={`${styles.statusDot} ${styles[status]}`} />}
    </div>
  );
};
