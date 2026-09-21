import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import styles from './CodeBlock.module.css';

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = 'text', filename }) => {
  const { preferences } = useApp();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className={styles.codeContainer}>
      <div className={styles.codeHeader}>
        <div className={styles.codeHeaderLeft}>
          <span className={styles.langBadge}>{language}</span>
          {filename && (
            <span className={styles.codeFilename}>
              <FileCode size={12} />
              <span>{filename}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          className={`${styles.copyButton} ${copied ? styles.copyButtonCopied : ''}`}
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className={styles.codeBody}>
        {preferences.codeLineNumbers && lines.length > 1 && (
          <div className={styles.lineNumbers} aria-hidden="true">
            {lines.map((_, idx) => (
              <span key={idx}>{idx + 1}</span>
            ))}
          </div>
        )}
        <pre className={styles.codeSnippet}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
