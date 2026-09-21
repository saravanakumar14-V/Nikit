import React, { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  FileCode,
  Database,
  Trash2,
  RotateCcw,
  Folder,
  Layers,
  Copy,
  Check,
  Eye,
  Info,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Input,
  Select,
  EmptyState,
} from '@nikit/ui';
import { useFiles } from '../state/FileContext';
import { useProject } from '../state/ProjectContext';
import { FileSelectionService } from '../services/files/FileSelectionService';
import { hybridRetriever } from '../services/retrieval/retrieval/HybridRetriever';
import { FileStatus, FileType, RetrievalResult, HybridRankingStrategy } from '@nikit/types';
import { FILE_LIMITS } from '../services/files/config';
import styles from './FilesView.module.css';

export const FilesView: React.FC = () => {
  const {
    files,
    activeFile,
    activeDocument,
    activeChunks,
    setActiveFileId,
    ingestFiles,
    deleteFile,
    attachFileToProject,
    detachFileFromProject,
    retryFile,
    rechunkDocument,
  } = useFiles();

  const { projects } = useProject();

  // Mode: 'files' (registry & chunk inspector) vs 'retrieval' (retrieval inspector)
  const [viewMode, setViewMode] = useState<'files' | 'retrieval'>('files');

  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'processing' | 'failed'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'preview' | 'chunks'>('overview');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [isRechunking, setIsRechunking] = useState(false);

  // Retrieval Inspector State
  const [retrievalQuery, setRetrievalQuery] = useState('');
  const [retrievalTopK, setRetrievalTopK] = useState<number>(5);
  const [retrievalStrategy, setRetrievalStrategy] = useState<HybridRankingStrategy>('rrf');
  const [retrievalResult, setRetrievalResult] = useState<RetrievalResult | null>(null);
  const [isRetrieving, setIsRetrieving] = useState(false);

  // 1. Primary summary statistics
  const stats = useMemo(() => {
    const total = files.length;
    const ready = files.filter((f) => f.status === 'ready').length;
    const processing = files.filter((f) => f.status === 'processing' || f.status === 'registered').length;
    const failed = files.filter((f) => f.status === 'failed' || f.status === 'unsupported' || f.status === 'unavailable').length;

    return { total, ready, processing, failed };
  }, [files]);

  // 2. Filtered files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Tab filter
      if (filterTab === 'ready' && file.status !== 'ready') return false;
      if (filterTab === 'processing' && file.status !== 'processing' && file.status !== 'registered') return false;
      if (filterTab === 'failed' && file.status !== 'failed' && file.status !== 'unsupported' && file.status !== 'unavailable') return false;

      // Project filter
      if (projectFilter !== 'all') {
        if (projectFilter === 'global' && file.projectId !== null) return false;
        if (projectFilter !== 'global' && file.projectId !== projectFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          file.name.toLowerCase().includes(query) ||
          file.extension.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [files, filterTab, projectFilter, searchQuery]);

  // 3. Primary file selection flow (Tauri native dialog with fallback)
  const handleSelectFiles = async () => {
    const inputs = await FileSelectionService.selectLocalFiles();
    if (inputs.length > 0) {
      const targetProjectId = projectFilter !== 'all' && projectFilter !== 'global' ? projectFilter : null;
      await ingestFiles(inputs, targetProjectId);
    }
  };

  // 4. Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const inputs = await FileSelectionService.fromFileList(e.dataTransfer.files);
      const targetProjectId = projectFilter !== 'all' && projectFilter !== 'global' ? projectFilter : null;
      await ingestFiles(inputs, targetProjectId);
    }
  };

  const handleRowClick = (fileId: string) => {
    setActiveFileId(fileId);
    setDrawerTab('overview');
    setIsDetailsOpen(true);
  };

  const handleCopyChunk = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(chunkId);
    setTimeout(() => {
      setCopiedChunkId((cur) => (cur === chunkId ? null : cur));
    }, 2000);
  };

  const handleRechunk = async (fileId: string) => {
    setIsRechunking(true);
    try {
      await rechunkDocument(fileId);
    } finally {
      setIsRechunking(false);
    }
  };

  // 5. Execute Hybrid Retrieval in Inspector
  const handleExecuteRetrieval = async () => {
    if (!retrievalQuery.trim()) return;

    setIsRetrieving(true);
    try {
      const targetProjectId = projectFilter !== 'all' && projectFilter !== 'global' ? projectFilter : undefined;
      const result = await hybridRetriever.retrieve(retrievalQuery, {
        config: {
          topK: retrievalTopK,
          rankingStrategy: retrievalStrategy,
        },
        filters: targetProjectId ? { projectId: targetProjectId } : undefined,
      });
      setRetrievalResult(result);
    } finally {
      setIsRetrieving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderStatusBadge = (status: FileStatus) => {
    switch (status) {
      case 'ready':
        return (
          <Badge variant="local" size="sm">
            <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Ready
          </Badge>
        );
      case 'processing':
      case 'registered':
        return (
          <Badge variant="warning" size="sm">
            <Clock size={12} style={{ marginRight: '4px' }} /> Ingesting
          </Badge>
        );
      case 'unsupported':
        return (
          <Badge variant="default" size="sm">
            <HelpCircle size={12} style={{ marginRight: '4px' }} /> Unsupported
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="danger" size="sm">
            <AlertCircle size={12} style={{ marginRight: '4px' }} /> Failed
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge variant="warning" size="sm">
            <AlertCircle size={12} style={{ marginRight: '4px' }} /> Unavailable
          </Badge>
        );
      default:
        return <Badge variant="default" size="sm">{status}</Badge>;
    }
  };

  const renderFileIcon = (type: FileType) => {
    switch (type) {
      case 'markdown':
      case 'text':
        return <FileText size={16} className={styles.fileIcon} />;
      case 'code':
        return <FileCode size={16} className={styles.fileIcon} />;
      case 'json':
      case 'csv':
        return <Database size={16} className={styles.fileIcon} />;
      default:
        return <FileText size={16} className={styles.fileIcon} />;
    }
  };

  return (
    <div className={styles.viewContainer}>
      <header className={styles.viewHeader}>
        <div className={styles.headerTopRow}>
          <div className={styles.badgeRow}>
            <Badge variant="accent" size="sm">
              Phase 5C
            </Badge>
            <Badge variant="default" size="sm">
              Hybrid Retrieval
            </Badge>

            <div className={styles.modeToggle}>
              <button
                type="button"
                className={`${styles.modeToggleButton} ${viewMode === 'files' ? styles.modeToggleButtonActive : ''}`}
                onClick={() => setViewMode('files')}
              >
                <FileText size={13} /> Documents & Chunks
              </button>
              <button
                type="button"
                className={`${styles.modeToggleButton} ${viewMode === 'retrieval' ? styles.modeToggleButtonActive : ''}`}
                onClick={() => setViewMode('retrieval')}
              >
                <Search size={13} /> Retrieval Inspector
              </button>
            </div>
          </div>

          {viewMode === 'files' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Upload size={14} />}
              onClick={handleSelectFiles}
            >
              Select Local Files
            </Button>
          )}
        </div>

        <h1 className={styles.viewTitle}>
          {viewMode === 'files' ? 'Files & Document Knowledge' : 'Hybrid Retrieval Inspector'}
        </h1>
        <p className={styles.viewDescription}>
          {viewMode === 'files'
            ? 'Register, normalize, and inspect local documents with deterministic structure-aware chunking.'
            : 'Evaluate vector and lexical hybrid search against persistent document chunks with Reciprocal Rank Fusion.'}
        </p>
      </header>

      {/* =================================================================== */}
      {/* MODE 1: FILES & CHUNKS REGISTRY                                    */}
      {/* =================================================================== */}
      {viewMode === 'files' && (
        <>
          {/* Primary Summary Cards */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Files</span>
              <span className={styles.statValue}>{stats.total}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Ready Documents</span>
              <span className={styles.statValue} style={{ color: 'var(--nikit-local-base)' }}>
                {stats.ready}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Processing</span>
              <span className={styles.statValue} style={{ color: 'var(--nikit-warning-base)' }}>
                {stats.processing}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Failed / Unsupported</span>
              <span className={styles.statValue} style={{ color: stats.failed > 0 ? 'var(--nikit-danger-base)' : 'var(--nikit-text-tertiary)' }}>
                {stats.failed}
              </span>
            </div>
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleSelectFiles}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleSelectFiles();
              }
            }}
          >
            <Upload size={24} style={{ color: 'var(--nikit-accent-base)' }} />
            <span className={styles.dropzoneTitle}>Drop files here or click to select</span>
            <span className={styles.dropzoneDesc}>
              Supports .txt, .md, .py, .ts, .rs, .json, .csv, and source code files up to 10 MB.
            </span>
          </div>

          {/* Filter & Search Bar */}
          <div className={styles.filterBar}>
            <div className={styles.tabGroup}>
              <button
                type="button"
                className={`${styles.tabButton} ${filterTab === 'all' ? styles.tabButtonActive : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All ({files.length})
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${filterTab === 'ready' ? styles.tabButtonActive : ''}`}
                onClick={() => setFilterTab('ready')}
              >
                Ready ({stats.ready})
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${filterTab === 'processing' ? styles.tabButtonActive : ''}`}
                onClick={() => setFilterTab('processing')}
              >
                Processing ({stats.processing})
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${filterTab === 'failed' ? styles.tabButtonActive : ''}`}
                onClick={() => setFilterTab('failed')}
              >
                Failed ({stats.failed})
              </button>
            </div>

            <div className={styles.filterControls}>
              <div style={{ width: '180px' }}>
                <Select
                  value={projectFilter}
                  onChange={(val) => setProjectFilter(val)}
                  options={[
                    { value: 'all', label: 'All Workspaces' },
                    { value: 'global', label: 'Global (No Workspace)' },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>

              <div className={styles.searchInput}>
                <Input
                  placeholder="Search filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  prefixIcon={<Search size={14} />}
                />
              </div>
            </div>
          </div>

          {/* Files Table / Empty State */}
          {filteredFiles.length === 0 ? (
            <EmptyState
              icon={<FileText size={32} style={{ color: 'var(--nikit-accent-base)' }} />}
              title="No Matching Files Found"
              description="Select or drop local documents to begin ingestion."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Upload size={14} />}
                  onClick={handleSelectFiles}
                >
                  Select Files
                </Button>
              }
            />
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.filesTable}>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Content Metrics</th>
                    <th>Workspace</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.map((file) => {
                    const project = file.projectId
                      ? projects.find((p) => p.id === file.projectId)
                      : null;

                    return (
                      <tr
                        key={file.id}
                        className={styles.tableRow}
                        onClick={() => handleRowClick(file.id)}
                      >
                        <td>
                          <div className={styles.fileNameCell}>
                            {renderFileIcon(file.fileType)}
                            <span>{file.name}</span>
                          </div>
                        </td>
                        <td>{renderStatusBadge(file.status)}</td>
                        <td>{formatFileSize(file.sizeBytes)}</td>
                        <td>
                          {file.characterCount !== undefined
                            ? `${file.characterCount.toLocaleString()} chars · ${file.lineCount || 0} lines`
                            : '—'}
                        </td>
                        <td>
                          {project ? (
                            <Badge variant="accent" size="sm">
                              <Folder size={11} style={{ marginRight: '4px' }} />
                              {project.name}
                            </Badge>
                          ) : (
                            <span style={{ color: 'var(--nikit-text-tertiary)', fontSize: '12px' }}>
                              Global
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--nikit-text-tertiary)', fontSize: '12px' }}>
                          {file.updatedAt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* =================================================================== */}
      {/* MODE 2: RETRIEVAL INSPECTOR SURFACE (PHASE 5C)                     */}
      {/* =================================================================== */}
      {viewMode === 'retrieval' && (
        <div className={styles.retrievalContainer}>
          {/* Query & Parameter Control Panel */}
          <div className={styles.retrievalControlPanel}>
            <div className={styles.retrievalSearchRow}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Enter test query (e.g. How does multi-head attention work?)..."
                  value={retrievalQuery}
                  onChange={(e) => setRetrievalQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteRetrieval();
                  }}
                  prefixIcon={<Search size={15} />}
                />
              </div>

              <Button
                variant="primary"
                leftIcon={<Sparkles size={14} />}
                loading={isRetrieving}
                onClick={handleExecuteRetrieval}
              >
                Search Knowledge
              </Button>
            </div>

            {/* Parameter Configuration Grid */}
            <div className={styles.retrievalConfigGrid}>
              <div className={styles.retrievalParam}>
                <span className={styles.retrievalParamLabel}>Workspace Scope</span>
                <Select
                  value={projectFilter}
                  onChange={(val) => setProjectFilter(val)}
                  options={[
                    { value: 'all', label: 'All Workspaces' },
                    { value: 'global', label: 'Global Knowledge Only' },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>

              <div className={styles.retrievalParam}>
                <span className={styles.retrievalParamLabel}>Top-K Candidates</span>
                <Select
                  value={String(retrievalTopK)}
                  onChange={(val) => setRetrievalTopK(Number(val))}
                  options={[
                    { value: '3', label: 'Top 3 Chunks' },
                    { value: '5', label: 'Top 5 Chunks' },
                    { value: '10', label: 'Top 10 Chunks' },
                    { value: '20', label: 'Top 20 Chunks' },
                  ]}
                />
              </div>

              <div className={styles.retrievalParam}>
                <span className={styles.retrievalParamLabel}>Fusion Strategy</span>
                <Select
                  value={retrievalStrategy}
                  onChange={(val) => setRetrievalStrategy(val as HybridRankingStrategy)}
                  options={[
                    { value: 'rrf', label: 'Reciprocal Rank Fusion (RRF)' },
                    { value: 'weighted_normalized', label: 'Weighted Normalized' },
                  ]}
                />
              </div>

              <div className={styles.retrievalParam}>
                <span className={styles.retrievalParamLabel}>Hybrid Balance</span>
                <div style={{ display: 'flex', alignItems: 'center', height: '36px', fontSize: '12.5px', color: 'var(--nikit-text-secondary)' }}>
                  <span>Vector: 70% · Lexical: 30%</span>
                </div>
              </div>
            </div>

            {/* Local Baseline Model Disclaimer */}
            <div className={styles.modelNoticeBanner}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={14} style={{ color: 'var(--nikit-accent-base)' }} />
                <span>
                  <strong>Active Model:</strong> local-deterministic-v1 (384 dims) — <em>Prototype Vector Baseline (Deterministic Hashing)</em>
                </span>
              </div>
              <Badge variant="default" size="sm">Local In-Process</Badge>
            </div>
          </div>

          {/* Results Section */}
          {retrievalResult ? (
            <div>
              <div className={styles.retrievalResultsHeader}>
                <span>
                  Found <strong>{retrievalResult.results.length}</strong> matching chunks from <strong>{retrievalResult.totalCandidates}</strong> candidate chunks in <strong>{retrievalResult.durationMs}ms</strong>
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--nikit-text-tertiary)' }}>
                  Executed at {new Date(retrievalResult.executedAt).toLocaleTimeString()}
                </span>
              </div>

              {retrievalResult.results.length === 0 ? (
                <div style={{ marginTop: '12px', padding: '32px', textAlign: 'center', background: 'var(--nikit-surface-raised)', borderRadius: 'var(--nikit-radius-md)', border: '1px solid var(--nikit-border-subtle)', color: 'var(--nikit-text-tertiary)' }}>
                  No matching chunks exceeded the minimum score threshold ({retrievalResult.config.minScore}).
                </div>
              ) : (
                <div className={styles.retrievalResultsList} style={{ marginTop: '12px' }}>
                  {retrievalResult.results.map((item) => (
                    <div key={item.chunkId} className={styles.retrievalCard}>
                      {/* Top Row: Rank, Combined Score, Source */}
                      <div className={styles.retrievalCardTop}>
                        <div className={styles.retrievalRankAndScore}>
                          <span className={styles.retrievalRankBadge}>#{item.rank}</span>
                          <Badge variant="accent" size="sm">Score: {item.score}</Badge>
                          <Badge variant="default" size="sm">{item.source.toUpperCase()}</Badge>
                        </div>

                        <div className={styles.retrievalScoreBreakdown}>
                          {item.vectorScore !== undefined && (
                            <span>Vector: <strong>{item.vectorScore}</strong></span>
                          )}
                          {item.lexicalScore !== undefined && (
                            <span>Lexical: <strong>{item.lexicalScore}</strong></span>
                          )}
                          <button
                            type="button"
                            className={styles.chunkCopyButton}
                            onClick={() => handleCopyChunk(item.chunkId, item.chunk.text)}
                          >
                            {copiedChunkId === item.chunkId ? (
                              <>
                                <Check size={11} style={{ color: 'var(--nikit-local-base)' }} /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Copy Chunk
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Provenance Breadcrumbs */}
                      <div className={styles.retrievalProvenance}>
                        <FileText size={13} style={{ color: 'var(--nikit-accent-base)' }} />
                        <span>{item.chunk.metadata.sourceName}</span>
                        {item.chunk.metadata.headings && item.chunk.metadata.headings.length > 0 && (
                          <span style={{ color: 'var(--nikit-text-secondary)', fontWeight: 500 }}>
                            › {item.chunk.metadata.headings.join(' › ')}
                          </span>
                        )}
                        {item.chunk.location.startLine !== undefined && (
                          <span style={{ fontSize: '11.5px', color: 'var(--nikit-text-tertiary)', fontWeight: 400 }}>
                            (Lines {item.chunk.location.startLine}–{item.chunk.location.endLine})
                          </span>
                        )}
                      </div>

                      {/* Text Snippet */}
                      <div className={styles.retrievalSnippet}>
                        {item.chunk.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={32} style={{ color: 'var(--nikit-accent-base)' }} />}
              title="Search Local Knowledge Base"
              description="Enter a query above to execute hybrid vector and lexical retrieval over indexed chunks."
            />
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: DOCUMENT DETAILS & CHUNK INSPECTOR                           */}
      {/* =================================================================== */}
      <Dialog
        open={isDetailsOpen && activeFile !== null}
        onClose={() => setIsDetailsOpen(false)}
        title={activeFile?.name || 'Document Inspection'}
        description={`Inspect document metadata, normalized text preview, and structure-aware chunks.`}
      >
        {activeFile && (
          <div>
            {/* 3-Tab Drawer Bar */}
            <div className={styles.drawerTabs}>
              <button
                type="button"
                className={`${styles.drawerTab} ${drawerTab === 'overview' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('overview')}
              >
                <Info size={14} /> Overview
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${drawerTab === 'preview' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('preview')}
              >
                <Eye size={14} /> Text Preview
              </button>
              <button
                type="button"
                className={`${styles.drawerTab} ${drawerTab === 'chunks' ? styles.drawerTabActive : ''}`}
                onClick={() => setDrawerTab('chunks')}
              >
                <Layers size={14} /> Chunks ({activeChunks.length})
              </button>
            </div>

            {/* If Ingestion Failed or Unavailable */}
            {activeFile.status === 'failed' && (
              <div className={styles.errorBanner}>
                <strong>Ingestion Failed</strong>
                <span>{activeFile.ingestion.errorMessage || 'An error occurred during file parsing.'}</span>
              </div>
            )}

            {activeFile.status === 'unavailable' && (
              <div className={styles.errorBanner}>
                <strong>File Content Unavailable</strong>
                <span>The underlying physical file could not be accessed.</span>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {drawerTab === 'overview' && (
              <div>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>File Status</span>
                    <div>{renderStatusBadge(activeFile.status)}</div>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>File Size</span>
                    <span className={styles.detailValue}>{formatFileSize(activeFile.sizeBytes)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Detected Format</span>
                    <span className={styles.detailValue}>.{activeFile.extension || 'none'} ({activeFile.fileType})</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Encoding</span>
                    <span className={styles.detailValue}>{activeFile.metadata.detectedEncoding || 'UTF-8'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Extracted Characters</span>
                    <span className={styles.detailValue}>
                      {activeFile.metadata.characterCount !== undefined
                        ? activeFile.metadata.characterCount.toLocaleString()
                        : '—'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Lines / Words</span>
                    <span className={styles.detailValue}>
                      {activeFile.metadata.lineCount !== undefined
                        ? `${activeFile.metadata.lineCount} lines · ${activeFile.metadata.wordCount || 0} words`
                        : '—'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Approx. Tokens</span>
                    <span className={styles.detailValue} style={{ color: 'var(--nikit-text-tertiary)' }}>
                      Unavailable (Tokenizer standby)
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Checksum (SHA-256)</span>
                    <span className={styles.detailValue} style={{ fontSize: '11px', fontFamily: 'var(--nikit-font-mono)' }}>
                      {activeFile.contentHash ? activeFile.contentHash.slice(0, 16) + '...' : '—'}
                    </span>
                  </div>
                </div>

                {/* Project Assignment */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px', color: 'var(--nikit-text-secondary)' }}>
                    Workspace Assignment
                  </label>
                  <Select
                    value={activeFile.projectId || 'global'}
                    onChange={(val) => {
                      if (val === 'global') {
                        detachFileFromProject(activeFile.id);
                      } else {
                        attachFileToProject(activeFile.id, val);
                      }
                    }}
                    options={[
                      { value: 'global', label: 'Global (No Workspace)' },
                      ...projects.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: TEXT PREVIEW */}
            {drawerTab === 'preview' && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--nikit-text-tertiary)' }}>
                  <span>Normalized Text</span>
                  {activeDocument && activeDocument.text.length > FILE_LIMITS.maxPreviewBytes && (
                    <span>(Preview truncated to first {FILE_LIMITS.maxPreviewBytes / 1024} KB)</span>
                  )}
                </div>

                {activeDocument ? (
                  <div className={styles.previewBox}>
                    {activeDocument.text.slice(0, FILE_LIMITS.maxPreviewBytes)}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--nikit-text-tertiary)', fontSize: '13px', background: 'var(--nikit-surface-sunken)', borderRadius: 'var(--nikit-radius-md)' }}>
                    No normalized document preview available for this file.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CHUNKS INSPECTOR */}
            {drawerTab === 'chunks' && (
              <div>
                <div className={styles.chunkInspectorHeader}>
                  <div className={styles.chunkInspectorSummary}>
                    <span><strong>{activeChunks.length}</strong> chunks generated</span>
                    <span>• Target: 1,000 chars</span>
                    <span>• Strategy: {activeChunks[0]?.metadata.chunkingStrategy || 'default'}</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw size={12} />}
                    loading={isRechunking}
                    onClick={() => handleRechunk(activeFile.id)}
                  >
                    Re-chunk
                  </Button>
                </div>

                {activeChunks.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--nikit-text-tertiary)', fontSize: '13px', background: 'var(--nikit-surface-sunken)', borderRadius: 'var(--nikit-radius-md)' }}>
                    No chunks generated yet. Click "Re-chunk" above to generate chunks for this document.
                  </div>
                ) : (
                  <div className={styles.chunkList}>
                    {activeChunks.map((chunk) => (
                      <div key={chunk.id} className={styles.chunkCard}>
                        {/* Header Row */}
                        <div className={styles.chunkHeaderRow}>
                          <div className={styles.chunkSeqAndBreadcrumbs}>
                            <span className={styles.chunkSeqBadge}>#{String(chunk.sequence).padStart(2, '0')}</span>

                            {chunk.metadata.headings && chunk.metadata.headings.length > 0 ? (
                              <span className={styles.chunkBreadcrumb}>
                                {chunk.metadata.headings.join(' › ')}
                              </span>
                            ) : chunk.metadata.section ? (
                              <span className={styles.chunkBreadcrumb}>{chunk.metadata.section}</span>
                            ) : chunk.metadata.path ? (
                              <span className={styles.chunkBreadcrumb} style={{ fontFamily: 'var(--nikit-font-mono)' }}>
                                {chunk.metadata.path}
                              </span>
                            ) : (
                              <span className={styles.chunkBreadcrumb} style={{ color: 'var(--nikit-text-tertiary)' }}>
                                Paragraph Segment
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className={styles.chunkCopyButton}
                            onClick={() => handleCopyChunk(chunk.id, chunk.text)}
                          >
                            {copiedChunkId === chunk.id ? (
                              <>
                                <Check size={11} style={{ color: 'var(--nikit-local-base)' }} /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> Copy
                              </>
                            )}
                          </button>
                        </div>

                        {/* Provenance Row */}
                        <div className={styles.chunkProvenanceRow}>
                          {chunk.location.startLine !== undefined && (
                            <span>Lines {chunk.location.startLine}–{chunk.location.endLine}</span>
                          )}
                          <span>•</span>
                          <span>Chars {chunk.location.startOffset}–{chunk.location.endOffset} ({chunk.text.length} chars)</span>
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--nikit-font-mono)' }}>SHA: {chunk.contentHash.slice(0, 8)}</span>
                        </div>

                        {/* Text Preview */}
                        <div className={styles.chunkTextPreview}>
                          {chunk.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Drawer Actions */}
            <div className={styles.drawerActions}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(activeFile.status === 'failed' || activeFile.status === 'unavailable') && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<RotateCcw size={13} />}
                    onClick={() => retryFile(activeFile.id)}
                  >
                    Retry Ingestion
                  </Button>
                )}
              </div>

              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={13} />}
                onClick={() => {
                  deleteFile(activeFile.id);
                  setIsDetailsOpen(false);
                }}
              >
                Delete File
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
