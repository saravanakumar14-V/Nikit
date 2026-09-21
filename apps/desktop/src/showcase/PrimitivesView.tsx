import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Popover,
  Dropdown,
  MenuItem,
  MenuHeader,
  MenuDivider,
  Dialog,
  Tooltip,
  Card,
  CardHeader,
  CardContent,
  Tabs,
  Avatar,
  Badge,
  Divider,
  Spinner,
  Skeleton,
  Progress,
  EmptyState,
  ErrorState,
  CommandSurface,
} from '@nikit/ui';
import {
  Sparkles,
  Bot,
  Terminal,
  Settings,
  Copy,
  Trash2,
  Share2,
  Folder,
  Sliders,
  Cpu,
  Layers,
  Search,
  CheckCircle,
} from 'lucide-react';
import styles from './Showcase.module.css';

export const PrimitivesView: React.FC = () => {
  // State for interactive testing
  const [btnLoading, setBtnLoading] = useState(false);
  const [inputVal, setInputVal] = useState('ZaqX 1.0 Architecture');
  const [textareaVal, setTextareaVal] = useState(
    'You are Nikit, an advanced AI operating environment running with quiet intelligence.'
  );
  const [selectVal, setSelectVal] = useState('zaqx-1.0');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab-1');
  const [progressVal, setProgressVal] = useState(68);
  const [cmdOpen, setCmdOpen] = useState(false);

  const sampleSelectOptions = [
    {
      value: 'zaqx-1.0',
      label: 'ZaqX 1.0 (Recommended)',
      description: 'First generation native model · 7B FP16',
      icon: <Sparkles size={14} />,
    },
    {
      value: 'zaqx-experimental',
      label: 'ZaqX 1.0 (MoE Experimental)',
      description: '8x7B Mixture of Experts checkpoint',
      icon: <Cpu size={14} />,
    },
    {
      value: 'llama-3-8b',
      label: 'Llama 3 8B Instruct',
      description: 'Local GGUF via llama.cpp runtime',
      icon: <Terminal size={14} />,
    },
  ];

  const sampleCommandItems = [
    {
      id: 'new-chat',
      title: 'New Conversation',
      category: 'Chat',
      shortcut: ['⌘', 'N'],
      description: 'Start a fresh conversational session',
      action: () => alert('Action: New Chat triggered!'),
    },
    {
      id: 'switch-model',
      title: 'Select Active Model',
      category: 'Models',
      shortcut: ['⌘', 'M'],
      description: 'Switch between ZaqX 1.0 and local runtimes',
      action: () => alert('Action: Switch Model triggered!'),
    },
    {
      id: 'open-lab',
      title: 'Open Model Laboratory',
      category: 'Navigation',
      shortcut: ['⌘', 'L'],
      description: 'Tokenizer, Datasets, Checkpoints, and Evaluation',
      action: () => alert('Action: Open Lab triggered!'),
    },
    {
      id: 'clear-memories',
      title: 'Inspect Transparent Memory',
      category: 'Memory',
      description: 'Manage persistent user and project facts',
      action: () => alert('Action: Inspect Memory triggered!'),
    },
  ];

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Primitive Components Workbench</h2>
        <p className={styles.sectionSubtitle}>
          Interactive testing sandbox for all 18+ foundational primitives with strict TypeScript and accessibility.
        </p>
      </div>

      {/* Button & IconButton */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Button & IconButton"
          subtitle="All variants, sizes, icon slots, loading and disabled states."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBtnLoading(!btnLoading)}
            >
              Toggle Loading ({btnLoading ? 'ON' : 'OFF'})
            </Button>
          }
        />
        <CardContent>
          <div className={styles.componentDemoStack}>
            {/* Variants */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Variants:</span>
              <div className={styles.flexWrap}>
                <Button variant="primary" loading={btnLoading} leftIcon={<Sparkles size={14} />}>
                  Primary Action
                </Button>
                <Button variant="secondary" loading={btnLoading}>
                  Secondary
                </Button>
                <Button variant="subtle" loading={btnLoading}>
                  Subtle Surface
                </Button>
                <Button variant="outline" loading={btnLoading}>
                  Outline
                </Button>
                <Button variant="ghost" loading={btnLoading}>
                  Ghost
                </Button>
                <Button variant="danger" loading={btnLoading} leftIcon={<Trash2 size={14} />}>
                  Destructive
                </Button>
              </div>
            </div>

            {/* Sizes */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Sizes:</span>
              <div className={styles.flexWrap}>
                <Button size="sm" variant="secondary">
                  Small (28px)
                </Button>
                <Button size="md" variant="secondary">
                  Medium (36px)
                </Button>
                <Button size="lg" variant="secondary">
                  Large (44px)
                </Button>
              </div>
            </div>

            {/* IconButtons */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>IconButton:</span>
              <div className={styles.flexWrap}>
                <IconButton icon={<Sparkles />} aria-label="ZaqX features" variant="primary" size="md" />
                <IconButton icon={<Settings />} aria-label="Settings" variant="secondary" size="md" />
                <IconButton icon={<Copy />} aria-label="Copy message" variant="subtle" size="md" />
                <IconButton icon={<Share2 />} aria-label="Share" variant="outline" size="md" />
                <IconButton icon={<Trash2 />} aria-label="Delete" variant="danger" size="md" />
                <IconButton icon={<Sliders />} aria-label="Parameters" variant="ghost" size="sm" />
                <IconButton icon={<Bot />} aria-label="Agent" variant="secondary" size="lg" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input & Textarea */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Input & Textarea"
          subtitle="Accessible input surfaces with auto-resize, prefixes, clear button, and validation states."
        />
        <CardContent>
          <div className={styles.twoColumnGrid}>
            <div className={styles.columnStack}>
              <Input
                label="System Prompt Name"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                prefixIcon={<Bot size={16} />}
                clearable
                onClear={() => setInputVal('')}
                fullWidth
              />
              <Input
                label="Search Models or Files"
                placeholder="Search local indexes..."
                prefixIcon={<Search size={16} />}
                sizeVariant="sm"
                fullWidth
              />
              <Input
                label="Context Length Threshold"
                placeholder="Exceeds max tokens"
                error="Context window overflow: Maximum 32,768 tokens supported by ZaqX 1.0"
                fullWidth
              />
            </div>

            <div className={styles.columnStack}>
              <Textarea
                label="Auto-Resizing Composer / System Instructions"
                value={textareaVal}
                onChange={(e) => setTextareaVal(e.target.value)}
                autoResize
                minRows={3}
                maxRows={8}
                showCount
                maxLength={500}
                helperText="Shift+Enter for new line, Enter to submit"
                fullWidth
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select, Popover, Dropdown, Menu, Tooltip */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Select, Popover, Dropdown & Tooltip"
          subtitle="Floating and anchored interactive overlay primitives."
        />
        <CardContent>
          <div className={styles.flexWrap} style={{ alignItems: 'flex-start', gap: 'var(--nikit-space-4)' }}>
            {/* Select */}
            <div style={{ width: '280px' }}>
              <Select
                label="Active Model Selector"
                options={sampleSelectOptions}
                value={selectVal}
                onChange={(val) => setSelectVal(val)}
                searchable
                fullWidth
              />
            </div>

            {/* Popover */}
            <div style={{ paddingTop: '20px' }}>
              <Popover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
                trigger={
                  <Button variant="secondary" leftIcon={<Cpu size={14} />}>
                    Popover: Device Telemetry
                  </Button>
                }
              >
                <div style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Badge variant="warning" size="sm">
                      Prototype Telemetry
                    </Badge>
                  </div>
                  <Divider />
                  <div style={{ fontSize: '12px', color: 'var(--nikit-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Engine:</strong> Not connected</div>
                    <div><strong>GPU / Device:</strong> Unknown</div>
                    <div><strong>VRAM:</strong> Unknown</div>
                    <div><strong>Compute:</strong> Detection Pending</div>
                    <div><strong>Inference:</strong> Uninitialized</div>
                  </div>
                </div>
              </Popover>
            </div>

            {/* Dropdown Menu */}
            <div style={{ paddingTop: '20px' }}>
              <Dropdown
                trigger={
                  <Button variant="outline" leftIcon={<Sliders size={14} />}>
                    Context Actions Menu
                  </Button>
                }
              >
                <MenuHeader>Message Options</MenuHeader>
                <MenuItem icon={<Copy size={14} />} shortcut={['⌘', 'C']}>
                  Copy Markdown
                </MenuItem>
                <MenuItem icon={<Terminal size={14} />} shortcut={['⌘', 'E']}>
                  Edit Prompt
                </MenuItem>
                <MenuItem icon={<Share2 size={14} />}>Share Snippet</MenuItem>
                <MenuDivider />
                <MenuHeader>Danger Zone</MenuHeader>
                <MenuItem icon={<Trash2 size={14} />} destructive>
                  Delete Conversation
                </MenuItem>
              </Dropdown>
            </div>

            {/* Tooltip */}
            <div style={{ paddingTop: '20px' }}>
              <Tooltip content="Open Command Palette" shortcut={['⌘', 'K']}>
                <Button variant="subtle" leftIcon={<Terminal size={14} />}>
                  Hover for Tooltip
                </Button>
              </Tooltip>
            </div>

            {/* Dialog Trigger */}
            <div style={{ paddingTop: '20px' }}>
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                Open Sample Dialog
              </Button>
            </div>

            {/* Command Palette Trigger */}
            <div style={{ paddingTop: '20px' }}>
              <Button
                variant="secondary"
                leftIcon={<Search size={14} />}
                onClick={() => setCmdOpen(true)}
              >
                Command Surface (⌘K)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs, Badges & Avatars */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="Tabs, Badges, Avatars & Progress"
          subtitle="Status communicators and organizational primitives."
        />
        <CardContent>
          <div className={styles.componentDemoStack}>
            {/* Tabs */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Segmented Tabs:</span>
              <Tabs
                variant="segmented"
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'tab-1', label: 'Overview', icon: <Bot size={14} /> },
                  { id: 'tab-2', label: 'Playground', icon: <Terminal size={14} /> },
                  { id: 'tab-3', label: 'Tokenizer', icon: <Layers size={14} /> },
                  { id: 'tab-4', label: 'Evaluation', icon: <CheckCircle size={14} /> },
                ]}
              />
            </div>

            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Underline Tabs:</span>
              <Tabs
                variant="underline"
                activeTab={activeTab}
                onChange={setActiveTab}
                tabs={[
                  { id: 'tab-1', label: 'System Context' },
                  { id: 'tab-2', label: 'Attached Files (3)' },
                  { id: 'tab-3', label: 'Transparent Memory (12)' },
                  { id: 'tab-4', label: 'Model Parameters' },
                ]}
              />
            </div>

            {/* Badges */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Badges:</span>
              <div className={styles.flexWrap}>
                <Badge variant="default">Default</Badge>
                <Badge variant="accent">ZaqX 1.0</Badge>
                <Badge variant="local" dot pulse>
                  ● Local
                </Badge>
                <Badge variant="success" dot>
                  Ready
                </Badge>
                <Badge variant="warning">Quantized (Q4_K)</Badge>
                <Badge variant="danger">High VRAM</Badge>
              </div>
            </div>

            {/* Avatars */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Avatars:</span>
              <div className={styles.flexWrap}>
                <Avatar name="ZaqX Assistant" size="xs" status="local" />
                <Avatar name="Sarah Connor" size="sm" status="online" />
                <Avatar name="Alex Rivera" size="md" status="local" />
                <Avatar name="Nikit Admin" size="lg" status="busy" />
                <Avatar name="ZaqX Model" size="xl" status="online" />
              </div>
            </div>

            {/* Progress & Spinners */}
            <div className={styles.demoRow}>
              <span className={styles.demoLabel}>Progress & Spinners:</span>
              <div style={{ flex: 1, maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Progress value={progressVal} showLabel variant="accent" />
                  <Button
                    size="sm"
                    variant="subtle"
                    onClick={() => setProgressVal((prev) => (prev >= 100 ? 0 : prev + 15))}
                  >
                    +15%
                  </Button>
                </div>
                <Progress variant="success" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <Spinner size="sm" label="Tokenizing dataset..." />
                  <Spinner size="md" label="Generating response..." />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeletons, Empty State & Error State */}
      <Card variant="elevated" className={styles.tokenCard}>
        <CardHeader
          title="States & Skeletons"
          subtitle="Semantic feedback states and loading shimmers."
        />
        <CardContent>
          <div className={styles.twoColumnGrid}>
            <div className={styles.columnStack}>
              <h4 style={{ fontSize: '13px', color: 'var(--nikit-text-secondary)', margin: 0 }}>
                Skeleton Shimmers
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Skeleton variant="circular" width={40} height={40} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="90%" />
                </div>
              </div>
              <Skeleton variant="rectangular" height={70} />

              <h4 style={{ fontSize: '13px', color: 'var(--nikit-text-secondary)', margin: '12px 0 0 0' }}>
                Error State Primitive
              </h4>
              <ErrorState
                title="Model Initialization Failed"
                message="CUDA out of memory error occurred when allocating key-value cache buffer for ZaqX 1.0."
                details="RuntimeError: CUDA out of memory. Tried to allocate 2.40 GiB (GPU 0; 16.00 GiB total capacity; 14.12 GiB already allocated by context cache). Set ctx_len or batch_size lower."
                onRetry={() => alert('Retrying model load...')}
              />
            </div>

            <div className={styles.columnStack}>
              <h4 style={{ fontSize: '13px', color: 'var(--nikit-text-secondary)', margin: 0 }}>
                Refined Empty State
              </h4>
              <EmptyState
                icon={<Folder size={24} />}
                title="No Active AI Workspace"
                description="Create a project to bind persistent instructions, domain files, memory, and your dedicated ZaqX model."
                suggestions={[
                  {
                    title: 'LLM Research Lab',
                    subtitle: 'Attention mechanism & tokenization analysis',
                    onClick: () => alert('Project selected'),
                  },
                  {
                    title: 'Code Refactoring',
                    subtitle: 'Local AST transformation pipeline',
                    onClick: () => alert('Project selected'),
                  },
                ]}
                action={<Button variant="primary">Create New Project</Button>}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Modal */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Model Parameters Configuration"
        description="Fine-tune inference generation sampling for ZaqX 1.0."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Save Parameters
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Temperature" defaultValue="0.7" helperText="Controls randomness (0.0 = deterministic, 1.0 = creative)" fullWidth />
          <Input label="Top-P (Nucleus Sampling)" defaultValue="0.9" fullWidth />
          <Input label="Max New Tokens" defaultValue="4096" fullWidth />
        </div>
      </Dialog>

      {/* Command Surface Palette */}
      <CommandSurface
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        items={sampleCommandItems}
      />
    </div>
  );
};
