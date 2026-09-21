import React from 'react';
import { Card, CardHeader, CardContent, Badge } from '@nikit/ui';
import { AccentTheme } from '@nikit/tokens';
import styles from './Showcase.module.css';

interface FoundationsViewProps {
  currentAccent: AccentTheme;
  onAccentChange: (accent: AccentTheme) => void;
}

export const FoundationsView: React.FC<FoundationsViewProps> = ({
  currentAccent,
  onAccentChange,
}) => {
  const accents: { id: AccentTheme; name: string; color: string }[] = [
    { id: 'cobalt', name: 'Titanium Cobalt (Default)', color: '#3b82f6' },
    { id: 'indigo', name: 'Intelligent Indigo', color: '#6366f1' },
    { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4' },
    { id: 'amber', name: 'Obsidian Amber', color: '#d97706' },
    { id: 'emerald', name: 'Neural Emerald', color: '#10b981' },
  ];

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Design Foundations</h2>
        <p className={styles.sectionSubtitle}>
          The tokenized foundation of Nikit's <em>"Quiet Intelligence"</em> design system.
        </p>
      </div>

      {/* Signature Accent Switcher */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Signature Accent Token"
          subtitle="Easily swappable accent palette controlling highlights, focus states, and primary actions."
        />
        <CardContent>
          <div className={styles.accentGrid}>
            {accents.map((acc) => (
              <button
                key={acc.id}
                type="button"
                className={`${styles.accentButton} ${
                  currentAccent === acc.id ? styles.accentButtonActive : ''
                }`}
                onClick={() => onAccentChange(acc.id)}
              >
                <span
                  className={styles.accentSwatch}
                  style={{ backgroundColor: acc.color }}
                />
                <span className={styles.accentName}>{acc.name}</span>
                {currentAccent === acc.id && (
                  <Badge variant="accent" size="sm">
                    Active
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Surfaces Scale */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Surface Hierarchy (Dark Graphite)"
          subtitle="Non-glare subtle layered dark surfaces with micro-contrast."
        />
        <CardContent>
          <div className={styles.surfaceGrid}>
            <div className={styles.surfaceItem} style={{ backgroundColor: 'var(--nikit-bg-canvas)' }}>
              <span className={styles.surfaceLabel}>Canvas</span>
              <code>--nikit-bg-canvas</code>
            </div>
            <div className={styles.surfaceItem} style={{ backgroundColor: 'var(--nikit-bg-base)' }}>
              <span className={styles.surfaceLabel}>Base</span>
              <code>--nikit-bg-base</code>
            </div>
            <div className={styles.surfaceItem} style={{ backgroundColor: 'var(--nikit-bg-surface)' }}>
              <span className={styles.surfaceLabel}>Surface</span>
              <code>--nikit-bg-surface</code>
            </div>
            <div className={styles.surfaceItem} style={{ backgroundColor: 'var(--nikit-bg-surface-raised)' }}>
              <span className={styles.surfaceLabel}>Surface Raised</span>
              <code>--nikit-bg-surface-raised</code>
            </div>
            <div className={styles.surfaceItem} style={{ backgroundColor: 'var(--nikit-bg-surface-elevated)' }}>
              <span className={styles.surfaceLabel}>Surface Elevated</span>
              <code>--nikit-bg-surface-elevated</code>
            </div>
            <div className={styles.surfaceItem} style={{ backgroundColor: 'var(--nikit-bg-surface-overlay)' }}>
              <span className={styles.surfaceLabel}>Surface Overlay</span>
              <code>--nikit-bg-surface-overlay</code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Tokens */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Typography Scale"
          subtitle="Precision typography tuned for prolonged readability and technical data density."
        />
        <CardContent>
          <div className={styles.typographyStack}>
            <div className={styles.typeRow}>
              <span className={styles.typeMeta}>4xl (36px)</span>
              <span style={{ fontSize: 'var(--nikit-text-4xl)', fontWeight: 'var(--nikit-weight-bold)' }}>
                ZaqX 1.0 AI Platform
              </span>
            </div>
            <div className={styles.typeRow}>
              <span className={styles.typeMeta}>3xl (30px)</span>
              <span style={{ fontSize: 'var(--nikit-text-3xl)', fontWeight: 'var(--nikit-weight-semibold)' }}>
                Quiet Intelligence
              </span>
            </div>
            <div className={styles.typeRow}>
              <span className={styles.typeMeta}>2xl (24px)</span>
              <span style={{ fontSize: 'var(--nikit-text-2xl)', fontWeight: 'var(--nikit-weight-semibold)' }}>
                What can I help you with?
              </span>
            </div>
            <div className={styles.typeRow}>
              <span className={styles.typeMeta}>xl (20px)</span>
              <span style={{ fontSize: 'var(--nikit-text-xl)', fontWeight: 'var(--nikit-weight-medium)' }}>
                Model Telemetry & Evaluation
              </span>
            </div>
            <div className={styles.typeRow}>
              <span className={styles.typeMeta}>base (14px)</span>
              <span style={{ fontSize: 'var(--nikit-text-base)' }}>
                Standard interface body text for high-fidelity chat conversations and project descriptions.
              </span>
            </div>
            <div className={styles.typeRow}>
              <span className={styles.typeMeta}>mono (13px)</span>
              <span style={{ fontFamily: 'var(--nikit-font-mono)', fontSize: 'var(--nikit-text-sm)', color: 'var(--nikit-text-code)' }}>
                tensor_shape: [32, 1024, 768] | ctx_len: 32768 | attn_heads: 32
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spacing & Radii Scales */}
      <div className={styles.twoColumnGrid}>
        <Card variant="elevated" className={styles.tokenCard}>
          <CardHeader title="Spacing Scale (4px Base)" />
          <CardContent>
            <div className={styles.spacingList}>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => (
                <div key={step} className={styles.spacingRow}>
                  <span className={styles.spacingMeta}>{step * 4}px (space-{step})</span>
                  <div
                    className={styles.spacingBar}
                    style={{ width: `var(--nikit-space-${step})` }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className={styles.tokenCard}>
          <CardHeader title="Border Radius Scale" />
          <CardContent>
            <div className={styles.radiiGrid}>
              {[
                { name: 'xs (4px)', val: 'var(--nikit-radius-xs)' },
                { name: 'sm (6px)', val: 'var(--nikit-radius-sm)' },
                { name: 'md (8px)', val: 'var(--nikit-radius-md)' },
                { name: 'lg (12px)', val: 'var(--nikit-radius-lg)' },
                { name: 'xl (16px)', val: 'var(--nikit-radius-xl)' },
                { name: 'full', val: 'var(--nikit-radius-full)' },
              ].map((rad) => (
                <div key={rad.name} className={styles.radiiItem}>
                  <div
                    className={styles.radiiBox}
                    style={{ borderRadius: rad.val }}
                  />
                  <span className={styles.radiiLabel}>{rad.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Elevation & Shadows */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader title="Elevation & Shadows" subtitle="Multi-layered dark ambient lighting with subtle inner bevels." />
        <CardContent>
          <div className={styles.shadowGrid}>
            <div className={styles.shadowBox} style={{ boxShadow: 'var(--nikit-shadow-sm)' }}>
              <span>Shadow SM</span>
              <code>Buttons & Inputs</code>
            </div>
            <div className={styles.shadowBox} style={{ boxShadow: 'var(--nikit-shadow-md)' }}>
              <span>Shadow MD</span>
              <code>Cards & Menus</code>
            </div>
            <div className={styles.shadowBox} style={{ boxShadow: 'var(--nikit-shadow-lg)' }}>
              <span>Shadow LG</span>
              <code>Popovers & Dropdowns</code>
            </div>
            <div className={styles.shadowBox} style={{ boxShadow: 'var(--nikit-shadow-xl)' }}>
              <span>Shadow XL</span>
              <code>Dialogs & Command Surface</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
