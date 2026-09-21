import React, { useState } from 'react';
import { Tabs, Badge } from '@nikit/ui';
import { FoundationsView } from '../showcase/FoundationsView';
import { PrimitivesView } from '../showcase/PrimitivesView';
import { CompositionsView } from '../showcase/CompositionsView';
import { LiveProductComposition } from '../showcase/LiveProductComposition';
import { useApp } from '../state/AppContext';
import { Layers, Box, Cpu, Eye, Sparkles } from 'lucide-react';
import styles from './ShowcaseView.module.css';

export const ShowcaseView: React.FC = () => {
  const { preferences, setAccentTheme } = useApp();
  const [activeTab, setActiveTab] = useState<'foundations' | 'primitives' | 'compositions' | 'product'>('foundations');

  return (
    <div className={styles.showcaseContainer}>
      <header className={styles.showcaseHeader}>
        <div className={styles.headerTitleGroup}>
          <Sparkles size={18} style={{ color: 'var(--nikit-accent-base)' }} />
          <h1 className={styles.headerTitle}>Phase 1 Design System Workbench</h1>
          <Badge variant="accent" size="sm">
            Design Tokens & Primitives
          </Badge>
        </div>

        <Tabs
          variant="segmented"
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
          tabs={[
            { id: 'foundations', label: 'Foundations & Tokens', icon: <Layers size={14} /> },
            { id: 'primitives', label: 'Primitive Workbench (18+)', icon: <Box size={14} /> },
            { id: 'compositions', label: 'Compositions & Patterns', icon: <Cpu size={14} /> },
            { id: 'product', label: 'Phase 1 Mockup', icon: <Eye size={14} /> },
          ]}
        />
      </header>

      <div className={styles.showcaseContent}>
        {activeTab === 'foundations' && (
          <FoundationsView
            currentAccent={preferences.accentTheme}
            onAccentChange={setAccentTheme}
          />
        )}
        {activeTab === 'primitives' && <PrimitivesView />}
        {activeTab === 'compositions' && <CompositionsView />}
        {activeTab === 'product' && <LiveProductComposition />}
      </div>
    </div>
  );
};
