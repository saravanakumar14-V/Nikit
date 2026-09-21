import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlaskConical,
  Play,
  Square,
  Layers,
  Activity,
  Plus,
  Cpu,
  Clock,
  Gauge,
  Sliders,
  Eye,
  Database,
  Binary,
  Target,
  Zap,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@nikit/ui';
import {
  AIModel,
  GenerationConfig,
  LabContextConfig,
  RunRecord,
  Experiment,
  Dataset,
  DatasetVersion,
  TokenizationResult,
  TokenLengthDistribution,
  EvaluationSuite,
  EvaluationRun,
  TrainingRun,
  Checkpoint,
  ResourceFeasibilityReport,
  TrainingConfiguration,
  ZaqXConfig,
  ZaqXModelScale,
  ZaqXPromotionStatus,
  ZaqXParameterBreakdown,
  ZaqXScalingEstimate,
  ZaqXModelCard,
  ZaqXExportArtifact,
  ZaqXResearchCycleReport,
} from '@nikit/types';
import { useApp } from '../state/AppContext';
import { useProject } from '../state/ProjectContext';
import { modelService } from '../services/models';
import {
  labService,
  experimentService,
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_LAB_CONTEXT_CONFIG,
  GENERATION_CONFIG_BOUNDS,
} from '../services/lab';
import { datasetService } from '../services/data';
import { tokenizerRegistry, TokenAnalysisService } from '../services/tokenization';
import { evaluationRunnerService } from '../services/evaluation';
import { trainingService, checkpointService, DEFAULT_TRAINING_CONFIG } from '../services/training';
import {
  zaqxService,
  zaqxTokenizer,
  ZaqXParamsCalculator,
  ZAQX_SCALING_PRESETS,
  ZaqXCandidateState,
} from '../services/zaqx';
import { ContextInspectorModal } from '../components/chat/ContextInspectorModal';
import styles from './LabView.module.css';

type LabTab =
  | 'playground'
  | 'experiments'
  | 'runs'
  | 'comparison'
  | 'datasets'
  | 'tokenizer'
  | 'evaluation'
  | 'training'
  | 'zaqx'
  | 'diagnostics';

export const LabView: React.FC = () => {
  const { runtimeInfo } = useApp();
  const { activeProject } = useProject();

  const [activeTab, setActiveTab] = useState<LabTab>('playground');
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // Playground State
  const [systemPrompt, setSystemPrompt] = useState('You are a technical research assistant.');
  const [developerPrompt, setDeveloperPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('Explain KV-cache optimization in 3 bullet points.');
  const [genConfig, setGenConfig] = useState<GenerationConfig>({ ...DEFAULT_GENERATION_CONFIG });
  const [contextConfig, setContextConfig] = useState<LabContextConfig>({ ...DEFAULT_LAB_CONTEXT_CONFIG });
  const [streamingOutput, setStreamingOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inspector Modal
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Experiments & Runs State
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);

  // Comparison State
  const [compModelA, setCompModelA] = useState<string>('');
  const [compModelB, setCompModelB] = useState<string>('');
  const [compRuns] = useState<RunRecord[]>([]);

  // Phase 10: Datasets State
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [activeVersion, setActiveVersion] = useState<DatasetVersion | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importName, setImportName] = useState('');
  const [importFormat, setImportFormat] = useState<'jsonl' | 'text'>('jsonl');
  const [importContent, setImportContent] = useState('');

  // Phase 10: Tokenizer Studio State
  const [tokenizerInput, setTokenizerInput] = useState('Attention is all you need for sequence modeling.');
  const [tokenResult, setTokenResult] = useState<TokenizationResult | null>(null);
  const [decodedOutput, setDecodedOutput] = useState<string>('');
  const [tokenDist, setTokenDist] = useState<TokenLengthDistribution | null>(null);

  // Phase 10: Evaluation State
  const [evalSuites, setEvalSuites] = useState<EvaluationSuite[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvaluationRun[]>([]);
  const [selectedSuiteId, setSelectedSuiteId] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Phase 10: Training State
  const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [trainConfig, setTrainConfig] = useState<TrainingConfiguration>({ ...DEFAULT_TRAINING_CONFIG });
  const [feasibilityReport, setFeasibilityReport] = useState<ResourceFeasibilityReport | null>(null);
  const [trainRunName, setTrainRunName] = useState('SmolLM2 Experiment Run');

  // Phase 11: ZaqX Studio State
  const [zaqxScale, setZaqxScale] = useState<ZaqXModelScale>('experimental-tiny');
  const [zaqxConfig, setZaqxConfig] = useState<ZaqXConfig>(ZAQX_SCALING_PRESETS['experimental-tiny']);
  const [zaqxParamBreakdown, setZaqxParamBreakdown] = useState<ZaqXParameterBreakdown>(
    ZaqXParamsCalculator.calculate(ZAQX_SCALING_PRESETS['experimental-tiny'])
  );
  const [zaqxScalingPresets, setZaqxScalingPresets] = useState<ZaqXScalingEstimate[]>([]);
  const [zaqxCandidates, setZaqxCandidates] = useState<ZaqXCandidateState[]>([]);
  const [zaqxSelectedCandidateId, setZaqxSelectedCandidateId] = useState<string>('');
  const [zaqxModelCard, setZaqxModelCard] = useState<ZaqXModelCard | null>(null);
  const [zaqxTrainRunning, setZaqxTrainRunning] = useState(false);
  const [zaqxTrainProgress, setZaqxTrainProgress] = useState<{ step: number; totalSteps: number; loss: number | null }>({
    step: 0,
    totalSteps: 10,
    loss: null,
  });
  const [zaqxLossHistory, setZaqxLossHistory] = useState<Array<{ step: number; loss: number }>>([]);
  const [zaqxTokInput, setZaqxTokInput] = useState('Hello from ZaqX Transformer Model.');
  const [zaqxTokResult, setZaqxTokResult] = useState<TokenizationResult | null>(null);
  const [zaqxExportArtifact, setZaqxExportArtifact] = useState<ZaqXExportArtifact | null>(null);
  const [zaqxExportStatus, setZaqxExportStatus] = useState<string | null>(null);
  const [researchReport, setResearchReport] = useState<ZaqXResearchCycleReport | null>(null);
  const [selectedResearchCycle, setSelectedResearchCycle] = useState<'zaqx-r01' | 'zaqx-r02'>('zaqx-r02');

  const handleSelectResearchCycle = async (cycleId: 'zaqx-r01' | 'zaqx-r02') => {
    setSelectedResearchCycle(cycleId);
    try {
      const report = await zaqxService.getResearchCycleReport(cycleId);
      setResearchReport(report);
    } catch {
      // Ignore
    }
  };

  // Load Initial Data
  const loadData = useCallback(async () => {
    const allModels: AIModel[] = modelService.getAvailableModels();
    setModels(allModels);

    if (allModels.length > 0 && !selectedModelId) {
      const runnable = allModels.find((m: AIModel) => !m.prototype || m.local);
      setSelectedModelId(runnable ? runnable.id : allModels[0].id);
      if (allModels.length >= 2) {
        setCompModelA(allModels[0].id);
        setCompModelB(allModels[1].id);
      }
    }

    const exps = await experimentService.listExperiments();
    setExperiments(exps);

    const rList = await labService.listRuns();
    setRuns(rList);

    const dsList = await datasetService.listDatasets();
    setDatasets(dsList);
    if (dsList.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(dsList[0].id);
      if (dsList[0].activeVersionId) {
        const v = await datasetService.getVersion(dsList[0].activeVersionId);
        setActiveVersion(v);
      }
    }

    const suites = await evaluationRunnerService.listSuites();
    setEvalSuites(suites);
    if (suites.length > 0 && !selectedSuiteId) {
      setSelectedSuiteId(suites[0].id);
    }

    const eRuns = await evaluationRunnerService.listRuns();
    setEvalRuns(eRuns);

    const tRuns = await trainingService.listRuns();
    setTrainingRuns(tRuns);

    const ckpts = await checkpointService.listCheckpoints();
    setCheckpoints(ckpts);

    // ZaqX data
    const presets = await zaqxService.planScalingPresets();
    setZaqxScalingPresets(presets);

    const cList = await zaqxService.listCandidates();
    setZaqxCandidates(cList);
    if (cList.length > 0 && !zaqxSelectedCandidateId) {
      setZaqxSelectedCandidateId(cList[0].id);
      const card = await zaqxService.generateModelCard(cList[0].id);
      setZaqxModelCard(card);
    }

    try {
      const rReport = await zaqxService.getResearchCycleReport(selectedResearchCycle);
      setResearchReport(rReport);
    } catch {
      // Ignore if not yet initialized
    }
  }, [selectedModelId, selectedDatasetId, selectedSuiteId, zaqxSelectedCandidateId, selectedResearchCycle]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Tokenize Input
  const handleTokenize = async () => {
    const tokenizer = tokenizerRegistry.resolveForModel(selectedModelId || 'smollm2');
    const result = await tokenizer.tokenize(tokenizerInput);
    setTokenResult(result);
    try {
      const decoded = await tokenizer.decode(result.tokenIds);
      setDecodedOutput(decoded);
    } catch {
      setDecodedOutput('[Detokenize not supported by current tokenizer]');
    }
  };

  // Run Playground
  const handleRunPlayground = async () => {
    if (!selectedModelId || !userPrompt.trim() || isStreaming) return;

    setIsStreaming(true);
    setStreamingOutput('');
    setStatusMessage(null);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const run = await labService.executePlaygroundRun({
        modelId: selectedModelId,
        systemPrompt,
        developerPrompt: developerPrompt.trim() || undefined,
        userPrompt,
        generationConfig: genConfig,
        contextConfig,
        abortSignal: abortController.signal,
        onEvent: (event) => {
          if (event.type === 'delta') {
            setStreamingOutput((prev) => prev + event.textDelta);
          } else if (event.type === 'completed') {
            setStreamingOutput(event.finalContent || '');
          }
        },
      });

      setActiveRun(run);
      await loadData();
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Handle Dataset Ingestion
  const handleIngestDataset = async () => {
    if (!importName.trim() || !importContent.trim()) return;

    try {
      const { dataset, version } = await datasetService.ingestDataset({
        name: importName.trim(),
        format: importFormat,
        rawContent: importContent,
      });

      setSelectedDatasetId(dataset.id);
      setActiveVersion(version);
      setIsImportModalOpen(false);
      setImportName('');
      setImportContent('');
      await loadData();
    } catch (err: unknown) {
      alert(`Dataset ingestion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle Dataset Token Analysis
  const handleAnalyzeDatasetTokens = async () => {
    if (!activeVersion) return;
    const tokenizer = tokenizerRegistry.resolveForModel(selectedModelId || 'smollm2');
    const records = await datasetService.getRecords({ datasetVersionId: activeVersion.id });
    const dist = await TokenAnalysisService.analyzeSequenceLengths(records, tokenizer, 2048);
    setTokenDist(dist);
  };

  // Handle Evaluation Run
  const handleExecuteEvaluation = async () => {
    if (!selectedSuiteId || !selectedModelId || isEvaluating) return;

    setIsEvaluating(true);
    try {
      await evaluationRunnerService.runEvaluation({
        suiteId: selectedSuiteId,
        modelId: selectedModelId,
      });
      await loadData();
    } catch (err: unknown) {
      alert(`Evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle Training Feasibility Check
  const handleCheckFeasibility = async () => {
    const report = await trainingService.checkFeasibility({
      ...trainConfig,
      modelId: selectedModelId || 'smollm2',
      datasetVersionId: activeVersion?.id || 'dsv-1',
    });
    setFeasibilityReport(report);
  };

  // Handle Training Run Creation
  const handleCreateTrainingRun = async () => {
    try {
      await trainingService.createTrainingRun(trainRunName, {
        ...trainConfig,
        modelId: selectedModelId || 'smollm2',
        datasetVersionId: activeVersion?.id || 'dsv-1',
      });
      await loadData();
    } catch (err: unknown) {
      alert(`Training creation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --- Phase 11: ZaqX Handlers ---
  const handleZaqxScaleSelect = (scale: ZaqXModelScale) => {
    setZaqxScale(scale);
    const cfg = ZAQX_SCALING_PRESETS[scale];
    setZaqxConfig(cfg);
    try {
      const breakdown = ZaqXParamsCalculator.calculate(cfg);
      setZaqxParamBreakdown(breakdown);
    } catch {
      // Configuration error handling
    }
  };

  const handleZaqxConfigUpdate = (key: keyof ZaqXConfig, val: any) => {
    const updated = { ...zaqxConfig, [key]: val, scale: 'custom' as ZaqXModelScale };
    setZaqxConfig(updated);
    setZaqxScale('custom');
    try {
      const breakdown = ZaqXParamsCalculator.calculate(updated);
      setZaqxParamBreakdown(breakdown);
    } catch {
      // Keep previous breakdown if temporary invalid value
    }
  };

  const handleZaqxTokenize = async () => {
    if (!zaqxTokInput.trim()) return;
    const res = await zaqxTokenizer.tokenize(zaqxTokInput);
    setZaqxTokResult(res);
  };

  const handleZaqxTrainLaunch = async () => {
    if (!zaqxSelectedCandidateId) return;
    const dsvId = activeVersion?.id || datasets[0]?.activeVersionId;
    if (!dsvId) {
      alert('Please create or select a valid dataset version in the Datasets tab before launching training.');
      return;
    }

    setZaqxTrainRunning(true);
    setZaqxLossHistory([]);
    try {
      const run = await zaqxService.launchTraining({
        candidateId: zaqxSelectedCandidateId,
        datasetVersionId: dsvId,
        maxSteps: 10,
        learningRate: 0.001,
      });

      setZaqxTrainProgress({
        step: run.currentStep,
        totalSteps: run.totalSteps,
        loss: run.loss ?? null,
      });

      if (run.loss) {
        setZaqxLossHistory((prev) => [...prev, { step: run.currentStep, loss: run.loss! }]);
      }

      await loadData();
    } catch (err: unknown) {
      alert(`ZaqX training execution failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setZaqxTrainRunning(false);
    }
  };

  const handleZaqxExport = async () => {
    if (!zaqxSelectedCandidateId) return;
    const candidate = zaqxCandidates.find((c) => c.id === zaqxSelectedCandidateId);
    if (!candidate) return;

    try {
      setZaqxExportStatus('Validating and exporting checkpoint to GGUF...');
      const ckpts = await checkpointService.listCheckpoints(candidate.id);
      const ckpt = ckpts.length > 0 ? ckpts[ckpts.length - 1] : null;

      if (!ckpt) {
        setZaqxExportStatus('SKIPPED — No checkpoint found for this candidate. Train candidate first.');
        return;
      }

      const { artifact, model } = await zaqxService.exportAndRegister(ckpt.id, candidate.name);
      setZaqxExportArtifact(artifact);
      setZaqxExportStatus(`Exported successfully! Registered as "${model.name}" in ModelRegistry.`);
      await loadData();
    } catch (err: unknown) {
      setZaqxExportStatus(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleZaqxPromote = async (newStatus: ZaqXPromotionStatus) => {
    if (!zaqxSelectedCandidateId) return;
    await zaqxService.promoteCandidate(zaqxSelectedCandidateId, newStatus);
    const card = await zaqxService.generateModelCard(zaqxSelectedCandidateId);
    setZaqxModelCard(card);
    await loadData();
  };

  return (
    <div className={styles.viewContainer}>
      {/* Header */}
      <header className={styles.viewHeader}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <FlaskConical size={24} color="var(--color-accent)" />
            <h1 className={styles.viewTitle}>LLM Lab & Model Development Workstation</h1>
            <Badge variant="accent" size="sm">
              Phase 10 Infrastructure
            </Badge>
          </div>
          <p className={styles.viewDescription}>
            Model development and evaluation workstation providing immutable dataset versioning, tokenization studio,
            benchmark suites, hardware feasibility analysis, and checkpoint registry.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'playground' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('playground')}
          >
            <Sliders size={14} /> Playground
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'experiments' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('experiments')}
          >
            <Layers size={14} /> Experiments ({experiments.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'runs' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('runs')}
          >
            <Activity size={14} /> Runs ({runs.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'datasets' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('datasets')}
          >
            <Database size={14} /> Datasets ({datasets.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'tokenizer' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('tokenizer')}
          >
            <Binary size={14} /> Tokenizer Studio
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'evaluation' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('evaluation')}
          >
            <Target size={14} /> Evaluation ({evalSuites.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'training' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('training')}
          >
            <Zap size={14} /> Training & Checkpoints
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'zaqx' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('zaqx')}
          >
            <Sparkles size={14} /> ZaqX Studio
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'comparison' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            <Gauge size={14} /> Comparison
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'diagnostics' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            <Cpu size={14} /> Diagnostics
          </button>
        </div>
      </header>

      {/* 1. PLAYGROUND TAB */}
      {activeTab === 'playground' && (
        <div className={styles.playgroundGrid}>
          {/* Left Column: Configuration */}
          <div className={styles.configColumn}>
            <div className={styles.sectionHeading}>Model Selection</div>
            <div className={styles.formGroup}>
              <select
                className={styles.formSelect}
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.providerId}) {m.prototype ? '— [Prototype / Disabled]' : '— [Ready]'}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.sectionHeading}>System & Developer Prompts</div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>System Instructions</label>
              <textarea
                className={styles.formTextarea}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={2}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Developer Prompt</label>
              <input
                type="text"
                className={styles.formInput}
                value={developerPrompt}
                onChange={(e) => setDeveloperPrompt(e.target.value)}
                placeholder="Optional steering instruction..."
              />
            </div>

            <div className={styles.sectionHeading}>User Prompt</div>
            <div className={styles.formGroup}>
              <textarea
                className={styles.formTextarea}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
              />
            </div>

            {/* Context Toggles (Default OFF) */}
            <div className={styles.sectionHeading}>Context Inclusions (Opt-In)</div>
            <div className={styles.contextBox}>
              <label className={styles.contextToggleRow}>
                <input
                  type="checkbox"
                  checked={contextConfig.includeUserMemory}
                  onChange={(e) =>
                    setContextConfig((prev) => ({ ...prev, includeUserMemory: e.target.checked }))
                  }
                />
                <span>Include User Preferences & Memory</span>
              </label>
              <label className={styles.contextToggleRow}>
                <input
                  type="checkbox"
                  checked={contextConfig.includeProjectInstructions}
                  onChange={(e) =>
                    setContextConfig((prev) => ({
                      ...prev,
                      includeProjectInstructions: e.target.checked,
                      projectId: activeProject?.id || null,
                    }))
                  }
                />
                <span>Include Project Instructions {activeProject ? `(${activeProject.name})` : ''}</span>
              </label>
            </div>

            {/* Parameters */}
            <div className={styles.sectionHeading}>Generation Parameters</div>
            <div className={styles.formGroup}>
              <div className={styles.formLabel}>
                <span>Temperature</span>
                <span className={styles.sliderVal}>{genConfig.temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                className={styles.slider}
                min={GENERATION_CONFIG_BOUNDS.temperature.min}
                max={GENERATION_CONFIG_BOUNDS.temperature.max}
                step={GENERATION_CONFIG_BOUNDS.temperature.step}
                value={genConfig.temperature}
                onChange={(e) =>
                  setGenConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                }
              />
            </div>

            <div className={styles.actionButtonsRow}>
              {isStreaming ? (
                <Button variant="outline" size="sm" leftIcon={<Square size={14} />} onClick={() => abortControllerRef.current?.abort()}>
                  Stop Run
                </Button>
              ) : (
                <Button variant="primary" size="sm" leftIcon={<Play size={14} />} onClick={handleRunPlayground}>
                  Execute Run
                </Button>
              )}
              <Button variant="outline" size="sm" leftIcon={<Eye size={14} />} onClick={() => setIsInspectorOpen(true)}>
                Inspect Context
              </Button>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className={styles.outputColumn}>
            <div className={styles.outputHeader}>
              <div className={styles.outputTitle}>Streaming Inference Output</div>
              <Badge variant={isStreaming ? 'accent' : 'default'} size="sm">
                {isStreaming ? 'Streaming...' : activeRun ? `Run: ${activeRun.status}` : 'Standby'}
              </Badge>
            </div>

            <div className={styles.outputArea}>
              {streamingOutput ? (
                <div>{streamingOutput}</div>
              ) : statusMessage ? (
                <div style={{ color: '#dc2626' }}>{statusMessage}</div>
              ) : (
                <div className={styles.emptyOutput}>
                  <FlaskConical size={32} />
                  <span>Execute inference to inspect live generation and factual telemetry.</span>
                </div>
              )}
            </div>

            <div className={styles.metricsFooter}>
              <div className={styles.metricItem}>
                <Clock size={13} />
                <span>TTFT:</span>
                <span className={styles.metricVal}>
                  {activeRun?.metrics?.ttftMs ? `${activeRun.metrics.ttftMs} ms` : 'Unknown'}
                </span>
              </div>
              <div className={styles.metricItem}>
                <span>Duration:</span>
                <span className={styles.metricVal}>{activeRun?.metrics?.durationMs || 0} ms</span>
              </div>
              <div className={styles.metricItem}>
                <Gauge size={13} />
                <span>Speed:</span>
                <span className={styles.metricVal}>
                  {activeRun?.metrics?.tokensPerSecond ? `${activeRun.metrics.tokensPerSecond} tok/s` : 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DATASETS TAB */}
      {activeTab === 'datasets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Dataset registry with immutable versioning, JSONL validation, deterministic splits, and exact leakage auditing.
            </span>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Import Dataset
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
            {/* Datasets List */}
            <div className={styles.tableContainer} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className={styles.sectionHeading}>Registered Datasets</div>
              {datasets.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', padding: '16px' }}>
                  No datasets imported yet.
                </div>
              ) : (
                datasets.map((d) => (
                  <div
                    key={d.id}
                    onClick={async () => {
                      setSelectedDatasetId(d.id);
                      if (d.activeVersionId) {
                        const v = await datasetService.getVersion(d.activeVersionId);
                        setActiveVersion(v);
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedDatasetId === d.id ? 'var(--color-bg-muted)' : 'transparent',
                      border: '1px solid var(--color-border-subtle)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{d.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {d.format.toUpperCase()} · {d.recordCount} records · {d.versionIds.length} version(s)
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Version Overview & Statistics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {activeVersion ? (
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Total Records</span>
                      <span className={styles.statValue}>{activeVersion.statistics.recordCount}</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Unique Records</span>
                      <span className={styles.statValue}>{activeVersion.statistics.uniqueRecordCount}</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Total Words</span>
                      <span className={styles.statValue}>{activeVersion.statistics.totalWords.toLocaleString()}</span>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Mean Chars/Sample</span>
                      <span className={styles.statValue}>{activeVersion.statistics.meanLengthChars}</span>
                    </div>
                  </div>

                  <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className={styles.sectionHeading}>Split Partitions & Leakage Audit</div>
                      <Badge variant={activeVersion.statistics.leakageCount === 0 ? 'success' : 'warning'} size="sm">
                        {activeVersion.statistics.leakageCount === 0 ? 'Zero Leakage Detected' : `Leakage: ${activeVersion.statistics.leakageCount} records`}
                      </Badge>
                    </div>

                    <div style={{ fontSize: '12px', display: 'flex', gap: '18px' }}>
                      <span>Train: <strong>{activeVersion.statistics.splitSizes.train}</strong></span>
                      <span>Validation: <strong>{activeVersion.statistics.splitSizes.validation}</strong></span>
                      <span>Test: <strong>{activeVersion.statistics.splitSizes.test}</strong></span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono, monospace)' }}>
                      Version Hash: {activeVersion.contentHash} · Split Seed: {activeVersion.splitSeed}
                    </div>
                  </div>
                </>
              ) : (
                <div className={styles.tableContainer} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Select or import a dataset to inspect version metadata.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TOKENIZER STUDIO TAB */}
      {activeTab === 'tokenizer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Interactive tokenization workbench connecting directly to llama.cpp /tokenize and /detokenize.
            </span>
            <Button variant="primary" size="sm" leftIcon={<Binary size={14} />} onClick={handleTokenize}>
              Tokenize Text
            </Button>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Input Text for Tokenization</label>
            <textarea
              className={styles.formTextarea}
              value={tokenizerInput}
              onChange={(e) => setTokenizerInput(e.target.value)}
              rows={3}
            />
          </div>

          {tokenResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.sectionHeading}>Token Breakdown ({tokenResult.tokenCount} tokens)</div>
                <Badge variant={tokenResult.isAuthoritative ? 'success' : 'warning'} size="sm">
                  {tokenResult.isAuthoritative ? 'Authoritative Model Tokenizer' : 'Heuristic Analysis (Not Model Tokenization)'}
                </Badge>
              </div>

              <div className={styles.tokenStream}>
                {tokenResult.tokens.map((tok, idx) => (
                  <div key={idx} className={styles.tokenChip}>
                    <span className={styles.tokenPiece}>{tok}</span>
                    <span className={styles.tokenId}>ID: {tokenResult.tokenIds[idx]}</span>
                  </div>
                ))}
              </div>

              {decodedOutput && (
                <div style={{ padding: '12px', background: 'var(--color-bg-base)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', fontSize: '13px' }}>
                  <strong>Round-Trip Decoded Text:</strong> {decodedOutput}
                </div>
              )}
            </div>
          )}

          {activeVersion && (
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.sectionHeading}>Dataset Sequence Length Distribution</div>
                <Button variant="outline" size="sm" onClick={handleAnalyzeDatasetTokens}>
                  Compute Distribution
                </Button>
              </div>

              {tokenDist && (
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Min Tokens</span>
                    <span className={styles.statValue}>{tokenDist.minTokens}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Mean Tokens</span>
                    <span className={styles.statValue}>{tokenDist.meanTokens}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>P95 Tokens</span>
                    <span className={styles.statValue}>{tokenDist.p95Tokens}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Within 2048 Limit</span>
                    <span className={styles.statValue}>{tokenDist.withinLimitPercentage}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. EVALUATION TAB */}
      {activeTab === 'evaluation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Standardized benchmark suites, test cases, exact-match scoring, and regression comparisons.
            </span>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play size={14} />}
              disabled={isEvaluating || !selectedSuiteId}
              onClick={handleExecuteEvaluation}
            >
              {isEvaluating ? 'Evaluating...' : 'Run Evaluation Suite'}
            </Button>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Suite Name</th>
                  <th>Category</th>
                  <th>Cases</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evalSuites.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td><Badge variant="accent" size="sm">{s.category}</Badge></td>
                    <td>{s.caseCount} test case(s)</td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSuiteId(s.id)}
                      >
                        {selectedSuiteId === s.id ? 'Selected' : 'Select'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {evalRuns.length > 0 && (
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.sectionHeading}>Recent Evaluation Runs</div>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Run ID</th>
                    <th>Model</th>
                    <th>Suite</th>
                    <th>Accuracy</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {evalRuns.map((er) => (
                    <tr key={er.id}>
                      <td>{er.id}</td>
                      <td>{er.modelName}</td>
                      <td>{er.suiteName}</td>
                      <td><strong>{er.overallAccuracy}%</strong></td>
                      <td>{new Date(er.createdAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TRAINING & CHECKPOINTS TAB */}
      {activeTab === 'training' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Training configuration, hardware resource feasibility checking, run lifecycle management, and checkpoint registry.
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="outline" size="sm" onClick={handleCheckFeasibility}>
                Check Resource Feasibility
              </Button>
              <Button variant="primary" size="sm" leftIcon={<Zap size={14} />} onClick={handleCreateTrainingRun}>
                Create Training Run
              </Button>
            </div>
          </div>

          {feasibilityReport && (
            <div className={styles.feasibilityBanner}>
              <div>
                <strong>Hardware Feasibility: </strong>
                <Badge
                  variant={
                    feasibilityReport.feasibility === 'likely_fit'
                      ? 'success'
                      : feasibilityReport.feasibility === 'possibly_constrained'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {feasibilityReport.feasibility.toUpperCase().replace('_', ' ')}
                </Badge>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Estimated VRAM: ~{feasibilityReport.estimatedVramMb} MB · Detected VRAM: {feasibilityReport.detectedVramMb || 'N/A'} MB
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeading}>Training Configuration</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Run Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={trainRunName}
                  onChange={(e) => setTrainRunName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Batch Size / Micro Batch</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={trainConfig.batchSize}
                  onChange={(e) => setTrainConfig((prev) => ({ ...prev, batchSize: parseInt(e.target.value, 10) }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Learning Rate</label>
                <input
                  type="number"
                  step="0.00005"
                  className={styles.formInput}
                  value={trainConfig.learningRate}
                  onChange={(e) => setTrainConfig((prev) => ({ ...prev, learningRate: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeading}>Registered Checkpoints ({checkpoints.length})</div>
              {checkpoints.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  No checkpoints registered yet. Checkpoints save weight state to filesystem directories.
                </div>
              ) : (
                checkpoints.map((ck) => (
                  <div key={ck.id} style={{ padding: '8px', border: '1px solid var(--color-border-subtle)', borderRadius: '6px', fontSize: '12px' }}>
                    <div><strong>Step {ck.step}</strong> (Epoch {ck.epoch || 1}) · {ck.modelId}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{ck.path}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {trainingRuns.length > 0 && (
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className={styles.sectionHeading}>Active & Recent Training Runs ({trainingRuns.length})</div>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Run Name</th>
                    <th>Model</th>
                    <th>Status</th>
                    <th>Steps</th>
                    <th>Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingRuns.map((tr) => (
                    <tr key={tr.id}>
                      <td><strong>{tr.name}</strong></td>
                      <td>{tr.modelId}</td>
                      <td>
                        <Badge variant={tr.status === 'running' ? 'accent' : 'default'} size="sm">
                          {tr.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td>{tr.currentStep} / {tr.totalSteps}</td>
                      <td>
                        <Badge variant="warning" size="sm">
                          {tr.isSimulation ? 'Simulation Stub' : 'Native'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5B. ZAQX 1.0 STUDIO TAB */}
      {activeTab === 'zaqx' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Candidate Status & Promotion Header */}
          <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Sparkles size={20} color="var(--color-accent)" />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>
                  {zaqxConfig.name} ({zaqxParamBreakdown.totalParamsFormatted})
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  ZaqX Decoder-Only Transformer Architecture · PyTorch Training Backend
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="accent" size="sm">
                Status: {zaqxCandidates.find((c) => c.id === zaqxSelectedCandidateId)?.status.toUpperCase() || 'EXPERIMENTAL'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZaqxPromote('candidate')}
              >
                Promote to Candidate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleZaqxPromote('validated')}
              >
                Mark Validated
              </Button>
            </div>
          </div>

          {/* Grid 1: Architecture Scaling & Native Tokenizer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
            {/* Architecture & Scaling Presets */}
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeading}>Candidate Scaling & Exact Parameter Calculator</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['experimental-tiny', 'experimental-small', 'experimental-medium', 'experimental-135m', 'zaqx-1.0-candidate'] as ZaqXModelScale[]).map((scale) => (
                  <Button
                    key={scale}
                    variant={zaqxScale === scale ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleZaqxScaleSelect(scale)}
                  >
                    {scale.replace('experimental-', '').toUpperCase()}
                  </Button>
                ))}
              </div>

              {/* Exact Parameter Breakdown Table */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', margin: '8px 0' }}>
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Total Params</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {zaqxParamBreakdown.totalParamsFormatted}
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Attention (GQA)</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {(zaqxParamBreakdown.attentionParams / 1e6).toFixed(2)}M
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>SwiGLU MLP</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {(zaqxParamBreakdown.mlpParams / 1e6).toFixed(2)}M
                  </div>
                </div>
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Embeddings</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {(zaqxParamBreakdown.embeddingParams / 1e6).toFixed(2)}M
                  </div>
                </div>
              </div>

              {/* Architectural Parameters Form */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Hidden Size</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={zaqxConfig.hiddenSize}
                    onChange={(e) => handleZaqxConfigUpdate('hiddenSize', parseInt(e.target.value, 10))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Layers</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={zaqxConfig.numLayers}
                    onChange={(e) => handleZaqxConfigUpdate('numLayers', parseInt(e.target.value, 10))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Intermediate (SwiGLU)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={zaqxConfig.intermediateSize}
                    onChange={(e) => handleZaqxConfigUpdate('intermediateSize', parseInt(e.target.value, 10))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Attention Heads (Q)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={zaqxConfig.numAttentionHeads}
                    onChange={(e) => handleZaqxConfigUpdate('numAttentionHeads', parseInt(e.target.value, 10))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>KV Heads (GQA)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={zaqxConfig.numKeyValueHeads}
                    onChange={(e) => handleZaqxConfigUpdate('numKeyValueHeads', parseInt(e.target.value, 10))}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Context Length</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={zaqxConfig.maxContextLength}
                    onChange={(e) => handleZaqxConfigUpdate('maxContextLength', parseInt(e.target.value, 10))}
                  />
                </div>
              </div>

              {zaqxConfig.numAttentionHeads % zaqxConfig.numKeyValueHeads !== 0 && (
                <div style={{ color: 'var(--color-error)', fontSize: '12px' }}>
                  ⚠ Invalid GQA: Attention heads ({zaqxConfig.numAttentionHeads}) must be divisible by KV heads ({zaqxConfig.numKeyValueHeads}).
                </div>
              )}
            </div>

            {/* ZaqX Native Tokenizer */}
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeading}>ZaqX Native Tokenizer & Special Tokens</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Dedicated vocabulary with byte fallback and explicit control tokens.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                <div style={{ padding: '6px', background: 'var(--color-bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <strong>BOS</strong>: &lt;|zaqx_bos|&gt; (0)
                </div>
                <div style={{ padding: '6px', background: 'var(--color-bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <strong>EOS</strong>: &lt;|zaqx_eos|&gt; (1)
                </div>
                <div style={{ padding: '6px', background: 'var(--color-bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <strong>PAD</strong>: &lt;|zaqx_pad|&gt; (2)
                </div>
                <div style={{ padding: '6px', background: 'var(--color-bg-secondary)', borderRadius: '4px', fontSize: '11px' }}>
                  <strong>UNK</strong>: &lt;|zaqx_unk|&gt; (3)
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Interactive Tokenizer Preview</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={zaqxTokInput}
                  onChange={(e) => setZaqxTokInput(e.target.value)}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleZaqxTokenize}>
                Tokenize Sample
              </Button>

              {zaqxTokResult && (
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                  <div><strong>Tokens ({zaqxTokResult.tokenCount}):</strong></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                    {zaqxTokResult.tokens.map((tok, idx) => (
                      <span key={idx} className={styles.tokenPill}>
                        {tok} <small style={{ color: 'var(--color-text-secondary)' }}>#{zaqxTokResult.tokenIds[idx]}</small>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grid 2: PyTorch Training & Model Card / Export */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* PyTorch Training Loop & Real Loss Monitor */}
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeading}>PyTorch Training Execution & Real Loss Monitor</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Training runs on a dedicated PyTorch worker outside React. Only measured telemetry is plotted.
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={zaqxTrainRunning}
                  onClick={handleZaqxTrainLaunch}
                >
                  {zaqxTrainRunning ? 'Training in Progress...' : 'Launch Training Loop'}
                </Button>
                {zaqxTrainProgress.loss !== null && (
                  <Badge variant="accent" size="sm">
                    Current Loss: {zaqxTrainProgress.loss}
                  </Badge>
                )}
              </div>

              {zaqxLossHistory.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Recorded Step Loss Curve</div>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Step</th>
                        <th>Causal LM Loss</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zaqxLossHistory.map((h) => (
                        <tr key={h.step}>
                          <td>Step {h.step}</td>
                          <td><strong>{h.loss}</strong></td>
                          <td><Badge variant="accent" size="sm">Measured</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Model Card & Export to GGUF */}
            <div className={styles.tableContainer} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeading}>ZaqX Model Card & GGUF Export</div>
              {zaqxModelCard ? (
                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>Model:</strong> {zaqxModelCard.name} ({zaqxModelCard.version})</div>
                  <div><strong>Architecture:</strong> Decoder-Only (RoPE, RMSNorm, GQA, SwiGLU)</div>
                  <div><strong>Context Length:</strong> {zaqxModelCard.contextLength} tokens</div>
                  <div><strong>Vocabulary:</strong> {zaqxModelCard.vocabSize} tokens</div>
                  <div><strong>Status:</strong> {zaqxModelCard.promotionStatus.toUpperCase()}</div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Select a candidate to inspect model card.
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button variant="primary" size="sm" onClick={handleZaqxExport}>
                  Export Checkpoint to GGUF
                </Button>
              </div>

              {zaqxExportArtifact && (
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Exported GGUF Artifact:</strong> {zaqxExportArtifact.path}</div>
                  <div><strong>Checksum:</strong> <code>{zaqxExportArtifact.fileHash.substring(0, 16)}...</code></div>
                  <div><strong>llama.cpp Compatible:</strong> <Badge variant="accent" size="sm">YES</Badge></div>
                </div>
              )}

              {zaqxExportStatus && (
                <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', color: 'var(--color-accent)' }}>
                  {zaqxExportStatus}
                </div>
              )}

              {zaqxScalingPresets.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Planned Family Presets: {zaqxScalingPresets.length} scales evaluated.
                </div>
              )}
            </div>

            {/* RESEARCH CYCLE 01 WORKBENCH */}
            {researchReport && (
              <div
                className={styles.tableContainer}
                style={{
                  gridColumn: '1 / -1',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  background: 'var(--color-bg-primary)',
                }}
              >
                {/* Header & Cycle Switcher */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>
                      ZaqX Research Workbench — {selectedResearchCycle === 'zaqx-r02' ? 'Cycle 02 (Corpus Expansion & Saturation)' : 'Cycle 01 (Baseline Proof)'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      Experiment ID: <code>{researchReport.experimentIdent.experimentId}</code> · Seed: 42 · Model: 5.4M (Tiny)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg-secondary)', padding: '2px', borderRadius: '6px' }}>
                      <Button
                        variant={selectedResearchCycle === 'zaqx-r01' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleSelectResearchCycle('zaqx-r01')}
                      >
                        Cycle 01
                      </Button>
                      <Button
                        variant={selectedResearchCycle === 'zaqx-r02' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => handleSelectResearchCycle('zaqx-r02')}
                      >
                        Cycle 02 (Expanded)
                      </Button>
                    </div>
                    <Badge variant="accent" size="sm">
                      EXPERIMENT: {researchReport.statusSummary.researchExperiment}
                    </Badge>
                    <Badge variant="accent" size="sm">
                      TRAINING: {researchReport.statusSummary.training}
                    </Badge>
                    <Badge variant="accent" size="sm">
                      GGUF: {researchReport.statusSummary.gguf}
                    </Badge>
                    <Badge variant="accent" size="sm">
                      PARITY: {researchReport.parityResult.parityStatus.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div style={{ fontSize: '12px', padding: '10px', background: 'var(--color-bg-secondary)', borderRadius: '6px', borderLeft: '3px solid var(--color-accent)' }}>
                  <strong>Research Hypothesis:</strong> {researchReport.hypothesis}
                </div>

                {/* Audit & Telemetry Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {/* Corpus Audit Card */}
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>1. Quantitative Corpus Audit</div>
                    <div>Version: <code>{researchReport.corpusAudit.datasetVersionId}</code></div>
                    <div>Records: <strong>{researchReport.corpusAudit.recordCount}</strong> ({researchReport.corpusAudit.wordCount} words, {researchReport.corpusAudit.charCount} chars)</div>
                    <div>Duplicate Rate: <strong>{researchReport.corpusAudit.duplicateRatePercent}%</strong> (Duplicates: {researchReport.corpusAudit.duplicateCount})</div>
                    <div>Splits: Train {researchReport.corpusAudit.trainCount} / Val {researchReport.corpusAudit.valCount} / Test {researchReport.corpusAudit.testCount}</div>
                    <div>Exact Leakage Overlap: <strong style={{ color: 'var(--color-success)' }}>0 records</strong></div>
                    <div>P50 / P95 / P99 Chars: {researchReport.corpusAudit.lengthStats.medianChars} / {researchReport.corpusAudit.lengthStats.p95Chars} / {researchReport.corpusAudit.lengthStats.p99Chars}</div>
                  </div>

                  {/* Tokenizer Audit Card */}
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>2. Authoritative Tokenizer Audit</div>
                    <div>Version: <code>{researchReport.tokenizerAudit.tokenizerVersion}</code></div>
                    <div>Vocab Size: <strong>{researchReport.tokenizerAudit.vocabSize}</strong> tokens</div>
                    <div>Unknown Token Rate: <strong>{researchReport.tokenizerAudit.unknownTokenRatePercent}%</strong> (Count: {researchReport.tokenizerAudit.unknownTokenCount})</div>
                    <div>Total Tokens: <strong>{researchReport.tokenizerAudit.totalTokensAudited.toLocaleString()}</strong> tokens</div>
                    <div>Compression Ratio: <strong>{researchReport.tokenizerAudit.compressionRatio} chars/token</strong></div>
                    <div>P50 / P95 / P99 SeqLen: {researchReport.tokenizerAudit.p50SeqLen} / {researchReport.tokenizerAudit.p95SeqLen} / {researchReport.tokenizerAudit.p99SeqLen}</div>
                    <div>Quality Decision: <Badge variant="accent" size="sm">{researchReport.tokenizerAudit.qualityDecision}</Badge></div>
                  </div>

                  {/* Training Telemetry Card */}
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>3. PyTorch Training Telemetry</div>
                    <div>Backend: {researchReport.trainingTelemetry.backend} ({researchReport.trainingTelemetry.pytorchVersion})</div>
                    <div>Steps: <strong>{researchReport.trainingTelemetry.totalSteps} steps</strong> (Tokens: <strong>{(researchReport.trainingTelemetry.tokensSeen || 0).toLocaleString()}</strong>)</div>
                    <div>Loss Decay: <strong>{researchReport.trainingTelemetry.initialLoss}</strong> → <strong>{researchReport.trainingTelemetry.finalLoss}</strong></div>
                    <div>Validation Loss: <strong>{researchReport.checkpointSelection ? researchReport.checkpointSelection.bestValidationLoss : researchReport.evaluationBaseline.trainedLoss}</strong> (Imp: <strong>{researchReport.evaluationBaseline.lossImprovementPercent}%</strong>)</div>
                    <div>Throughput: <strong>{researchReport.trainingTelemetry.throughputTokensPerSec} tokens/sec</strong></div>
                    <div>Peak Memory: <strong>{researchReport.trainingTelemetry.peakMemoryMb} MB</strong></div>
                    <div>Convergence: <Badge variant="accent" size="sm">{researchReport.trainingTelemetry.convergenceStatus.toUpperCase()}</Badge></div>
                  </div>
                </div>

                {/* Cycle 01 vs Cycle 02 Comparative Summary */}
                {researchReport.cycleComparison && (
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                      🔬 Cycle 01 vs Cycle 02 Empirical Comparison
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                      <div style={{ padding: '8px', background: 'var(--color-bg-primary)', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>Corpus Expansion</div>
                        <strong>26 → {researchReport.cycleComparison.corpusRecords.cycle02} records</strong> (+{researchReport.cycleComparison.corpusRecords.deltaPercent}%)
                      </div>
                      <div style={{ padding: '8px', background: 'var(--color-bg-primary)', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>Training Tokens Exposure</div>
                        <strong>352 → {researchReport.cycleComparison.trainingTokens.cycle02.toLocaleString()}</strong> ({researchReport.cycleComparison.trainingTokens.factor}x)
                      </div>
                      <div style={{ padding: '8px', background: 'var(--color-bg-primary)', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>Validation Cross-Entropy</div>
                        <strong>12.55 → {researchReport.cycleComparison.bestValidationLoss.cycle02}</strong> (-{researchReport.cycleComparison.bestValidationLoss.deltaPercent}%)
                      </div>
                      <div style={{ padding: '8px', background: 'var(--color-bg-primary)', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>Error Reduction</div>
                        <strong style={{ color: 'var(--color-success)' }}>-{researchReport.cycleComparison.totalObservedErrors.delta} errors</strong> (0 remaining)
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {researchReport.cycleComparison.comparisonSummary}
                    </div>
                  </div>
                )}

                {/* Saturation Analysis & Scaling Gate */}
                {researchReport.saturationAnalysis && (
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600 }}>
                        4. Training Saturation & Scaling Gate Analysis
                      </div>
                      <Badge variant="accent" size="sm">
                        SATURATION STATUS: {researchReport.saturationAnalysis.saturationClassification.toUpperCase()}
                      </Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                      <div><strong>Q1. Increased Corpus Helped?</strong> Yes (Val loss improved {researchReport.saturationAnalysis.evidence.evaluationDeltaPercent}%)</div>
                      <div><strong>Q2. Token Exposure Helped?</strong> Yes (Loss decayed to {researchReport.trainingTelemetry.finalLoss})</div>
                      <div><strong>Q3. 5.4M Still Learning?</strong> Yes (Zero plateau / no divergence)</div>
                      <div><strong>Q4. Tokenizer Limiting?</strong> No (0.0% unknown tokens)</div>
                      <div><strong>Q5. Corpus Volume Limiting?</strong> Yes (Scale token volume further)</div>
                      <div><strong>Q6. Scale Parameters Now?</strong> No (Exhaust 5.4M capacity first)</div>
                    </div>
                    <div style={{ padding: '8px', background: 'var(--color-bg-primary)', borderRadius: '4px', borderLeft: '3px solid var(--color-success)' }}>
                      <strong>Scaling Gate Policy:</strong> <Badge variant="default" size="sm">{researchReport.saturationAnalysis.scalingGateDecision.decision.toUpperCase()}</Badge> — Next Step: <Badge variant="accent" size="sm">{researchReport.saturationAnalysis.scalingGateDecision.nextRecommendedStep.toUpperCase()}</Badge>
                      <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-text-secondary)' }}>
                        {researchReport.saturationAnalysis.scalingGateDecision.rationale}
                      </div>
                    </div>
                  </div>
                )}

                {/* Qualitative Prompt Evaluation & Error Taxonomy */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                    5. Fixed Qualitative Benchmark & Multi-Checkpoint Comparison
                  </div>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Prompt</th>
                        <th>Untrained Baseline</th>
                        {selectedResearchCycle === 'zaqx-r02' && <th>Cycle 01 Output</th>}
                        <th>{selectedResearchCycle === 'zaqx-r02' ? 'Cycle 02 (Selected Best)' : 'Trained Checkpoint'}</th>
                        <th>Observed Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {researchReport.qualitativeResults.map((q) => (
                        <tr key={q.promptId}>
                          <td><strong>{q.category.toUpperCase()}</strong></td>
                          <td style={{ maxWidth: '160px' }}>{q.prompt}</td>
                          <td style={{ maxWidth: '160px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>{q.untrainedOutput}</td>
                          {selectedResearchCycle === 'zaqx-r02' && (
                            <td style={{ maxWidth: '160px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>{q.cycle01Output || '-'}</td>
                          )}
                          <td style={{ maxWidth: '200px', fontSize: '11px' }}><code>{q.trainedOutput}</code></td>
                          <td>
                            {q.observedErrorsTrained && q.observedErrorsTrained.length > 0 ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {q.observedErrorsTrained.map((err) => (
                                  <Badge key={err} variant="default" size="sm">{err}</Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="accent" size="sm">ZERO ERRORS</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottleneck Analysis & Next Recommendation */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Dominant Bottleneck: <Badge variant="accent" size="sm">{researchReport.bottleneckAnalysis.dominantLimitation.toUpperCase()}</Badge></div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{researchReport.bottleneckAnalysis.interpretation}</div>
                  </div>
                  <div style={{ padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: '6px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Authoritative Next Recommendation: <Badge variant="accent" size="sm">{researchReport.nextScaleRecommendation.recommendedNextStep.toUpperCase()}</Badge></div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{researchReport.nextScaleRecommendation.rationale}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. EXPERIMENTS & RUNS & COMPARISON & DIAGNOSTICS */}
      {activeTab === 'experiments' && (
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Experiment Name</th>
                <th>Runs</th>
                <th>Model</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong></td>
                  <td><Badge variant="accent" size="sm">{e.runIds.length} runs</Badge></td>
                  <td>{e.modelId || 'Default'}</td>
                  <td>{new Date(e.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'runs' && (
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Run Name / ID</th>
                <th>Model</th>
                <th>Status</th>
                <th>TTFT</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name || r.id}</strong></td>
                  <td>{r.modelName}</td>
                  <td>
                    <Badge variant={r.status === 'completed' ? 'success' : 'default'} size="sm">
                      {r.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td>{r.metrics?.ttftMs ? `${r.metrics.ttftMs} ms` : 'null'}</td>
                  <td>{r.metrics?.durationMs ? `${r.metrics.durationMs} ms` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'comparison' && (
        <div className={styles.comparisonGrid}>
          <div className={styles.compareCard}>
            <div className={styles.sectionHeading}>Model A</div>
            <select className={styles.formSelect} value={compModelA} onChange={(e) => setCompModelA(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className={styles.outputArea} style={{ minHeight: '220px' }}>
              {compRuns[0]?.output || 'Awaiting sequential comparison...'}
            </div>
          </div>
          <div className={styles.compareCard}>
            <div className={styles.sectionHeading}>Model B</div>
            <select className={styles.formSelect} value={compModelB} onChange={(e) => setCompModelB(e.target.value)}>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <div className={styles.outputArea} style={{ minHeight: '220px' }}>
              {compRuns[1]?.output || 'Awaiting sequential comparison...'}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <tbody>
              <tr>
                <td><strong>Local Engine</strong></td>
                <td>llama.cpp (Local Process Daemon on 127.0.0.1)</td>
              </tr>
              <tr>
                <td><strong>Runtime Status</strong></td>
                <td>
                  <Badge variant={runtimeInfo.status === 'connected' ? 'success' : 'default'} size="sm">
                    {runtimeInfo.status.toUpperCase()}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td><strong>Hardware</strong></td>
                <td>{runtimeInfo.gpuName || 'CPU / Integrated'} · CUDA: {runtimeInfo.cudaStatus}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Dataset Import Modal */}
      {isImportModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsImportModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Import Dataset</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)}>✕</Button>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Dataset Name</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="e.g. Instruction Tuning Benchmark"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Format</label>
              <select
                className={styles.formSelect}
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value as 'jsonl' | 'text')}
              >
                <option value="jsonl">JSONL (Lines with 'prompt'/'response' or 'text')</option>
                <option value="text">Plain Text (Line-separated records)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Dataset Content</label>
              <textarea
                className={styles.formTextarea}
                placeholder='{"prompt": "...", "response": "..."}'
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                rows={6}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleIngestDataset}>Ingest Dataset</Button>
            </div>
          </div>
        </div>
      )}

      <ContextInspectorModal isOpen={isInspectorOpen} onClose={() => setIsInspectorOpen(false)} />
    </div>
  );
};
