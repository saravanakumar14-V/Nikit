import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Check,
  DownloadCloud,
  Server,
  ShieldAlert,
  FolderOpen,
  Play,
  Square,
} from 'lucide-react';
import { Badge, Button } from '@nikit/ui';
import { useApp } from '../state/AppContext';
import { useRouter } from '../router/RouterContext';
import { modelService } from '../services/models';
import {
  modelDiscoveryService,
  hardwareDetectionService,
  llamaCppRuntime,
  MemoryGuard,
  HardwareMetrics,
} from '../services/runtimes/llamacpp';
import styles from './ModelsView.module.css';

export const ModelsView: React.FC = () => {
  const { workspace, setWorkspaceModel } = useApp();
  const { navigate } = useRouter();
  const [hardware, setHardware] = useState<HardwareMetrics>(hardwareDetectionService.getCachedMetrics());
  const [activeRuntimeStatus, setActiveRuntimeStatus] = useState(llamaCppRuntime.getStatus());
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    hardwareDetectionService.detectHardware().then(setHardware);
    modelDiscoveryService.scanDirectory();
    const interval = setInterval(() => {
      setActiveRuntimeStatus(llamaCppRuntime.getStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const registeredModels = modelService.getAvailableModels();

  const handleStartRuntime = async (modelId: string) => {
    setRuntimeError(null);
    try {
      const discovered = modelDiscoveryService.listDiscovered();
      const match = discovered.find(
        (m) =>
          'gguf-' +
            m.fileName
              .toLowerCase()
              .replace(/\.gguf$/i, '')
              .replace(/[^a-z0-9_-]/g, '-') === modelId
      );
      const filePath = match ? match.filePath : 'models/smollm2-135m-q4_k_m.gguf';
      await llamaCppRuntime.loadModel(modelId, filePath);
      setActiveRuntimeStatus(llamaCppRuntime.getStatus());
      const model = modelService.getModel(modelId);
      setWorkspaceModel(modelId, model?.name || modelId);
    } catch (err: unknown) {
      setRuntimeError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStopRuntime = async () => {
    try {
      await llamaCppRuntime.unloadModel(workspace.activeModelId);
      setActiveRuntimeStatus(llamaCppRuntime.getStatus());
    } catch (err: unknown) {
      setRuntimeError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleScanSampleModel = async () => {
    try {
      await modelDiscoveryService.scanDirectory();
    } catch {
      // Ignore
    }
  };

  const providers = [
    {
      id: 'llamacpp',
      name: 'llama.cpp Local Server',
      description: 'Local GGUF Streaming Engine',
      status: activeRuntimeStatus === 'ready' ? 'healthy' : 'unavailable',
      label:
        activeRuntimeStatus === 'ready'
          ? 'Online (127.0.0.1)'
          : activeRuntimeStatus === 'loading'
          ? 'Loading GGUF Model...'
          : activeRuntimeStatus === 'busy'
          ? 'Inference Busy'
          : 'Standby / Stopped',
    },
    {
      id: 'mock',
      name: 'Mock Provider',
      description: 'Development Streaming Provider',
      status: 'healthy',
      label: 'Development Ready',
    },
    {
      id: 'zaqx',
      name: 'ZaqX Runtime',
      description: 'Proprietary Local Engine',
      status: 'unavailable',
      label: 'Prototype / Not Connected',
    },
    {
      id: 'ollama',
      name: 'Ollama',
      description: 'Open-weights Local Daemon',
      status: 'unavailable',
      label: 'Not Configured',
    },
  ];

  return (
    <div className={styles.viewContainer}>
      <header className={styles.viewHeader}>
        <div className={styles.badgeRow}>
          <Badge variant="accent" size="sm">
            Phase 7
          </Badge>
          <Badge variant="default" size="sm">
            Local Inference & llama.cpp
          </Badge>
          {hardware.gpuName ? (
            <Badge variant="local" size="sm" dot>
              {hardware.gpuName} Detected
            </Badge>
          ) : (
            <Badge variant="default" size="sm">
              CPU Inference Ready
            </Badge>
          )}
        </div>
        <h1 className={styles.viewTitle}>Local Inference & Runtime Management</h1>
        <p className={styles.viewDescription}>
          Manage local GGUF models, monitor real hardware detection state, and control the llama.cpp server execution lifecycle with authentic telemetry.
        </p>
      </header>

      {/* Hardware Runtime Status Banner */}
      <div className={styles.runtimeBanner}>
        <div className={styles.runtimeInfoLeft}>
          <div className={styles.runtimeIconBox}>
            <Cpu size={22} />
          </div>
          <div className={styles.runtimeDetails}>
            <span className={styles.runtimeTitle}>
              GPU: {hardware.gpuName || 'Not Detected / Unknown'} · Backend:{' '}
              {hardware.cudaAvailable ? 'CUDA' : 'CPU (Standard)'}
            </span>
            <span className={styles.runtimeMeta}>
              VRAM: {hardware.vramTotalMb ? `${hardware.vramTotalMb} MB` : 'Unknown / Shared'} · System RAM:{' '}
              {hardware.totalRamMb ? `${(hardware.totalRamMb / 1024).toFixed(1)} GB` : 'Unknown'} · Driver:{' '}
              {hardware.driverVersion || 'Unknown'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeRuntimeStatus === 'ready' ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Square size={14} />}
              onClick={handleStopRuntime}
            >
              Stop llama-server
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FolderOpen size={14} />}
              onClick={handleScanSampleModel}
            >
              Discover GGUF
            </Button>
          )}
        </div>
      </div>

      {runtimeError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--nikit-danger-base)',
            borderRadius: 'var(--nikit-radius-md)',
            color: 'var(--nikit-text-primary)',
            fontSize: '13px',
          }}
        >
          <strong>Runtime Error:</strong> {runtimeError}
        </div>
      )}

      {/* Section 1: Registered Models */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Local Model Registry</h2>
        <span style={{ fontSize: '12px', color: 'var(--nikit-text-tertiary)' }}>
          {registeredModels.length} models indexed
        </span>
      </div>

      <div className={styles.modelGrid}>
        {registeredModels.map((m) => {
          const isActive = workspace.activeModelId === m.id;
          const isMock = m.id === 'mock-dev';
          const isZaqx = m.id === 'zaqx-1.0';
          const isLlama = m.providerId === 'llamacpp';

          const isAvailable = isMock || (isLlama && activeRuntimeStatus === 'ready');

          // Evaluate Memory Feasibility conservatively
          const feasibility = MemoryGuard.checkFeasibility(
            {
              validGguf: true,
              filePath: m.id,
              fileName: m.name,
              fileSizeBytes: m.specification?.estimatedVram ? 1024 * 1024 * 500 : 0,
              discoveryStatus: 'available',
            },
            hardware
          );

          return (
            <div
              key={m.id}
              className={`${styles.modelCard} ${isActive ? styles.modelCardActive : ''}`}
            >
              <div className={styles.modelCardHeader}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className={styles.modelName}>{m.name}</span>
                  {m.prototype && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--nikit-accent-base)',
                        fontWeight: 500,
                      }}
                    >
                      (Prototype / Design Phase)
                    </span>
                  )}
                  {isLlama && (
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--nikit-local-base)',
                        fontWeight: 500,
                      }}
                    >
                      Local GGUF Checkpoint
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {m.prototype ? (
                    <Badge variant="warning" size="sm">
                      Prototype
                    </Badge>
                  ) : isLlama ? (
                    <Badge variant="local" size="sm" dot={activeRuntimeStatus === 'ready'}>
                      {activeRuntimeStatus === 'ready' ? 'llama-server Ready' : 'GGUF'}
                    </Badge>
                  ) : null}

                  {isActive ? (
                    <Badge variant="local" size="sm" dot>
                      Selected
                    </Badge>
                  ) : isAvailable ? (
                    <Badge variant="default" size="sm">
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm">
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>

              <p className={styles.modelCardDesc}>{m.description}</p>

              {/* Technical Specifications */}
              <div className={styles.modelSpecTable}>
                <div className={styles.specRow}>
                  <span>Family / Architecture</span>
                  <span className={styles.specVal}>
                    {m.family} · {m.architecture || 'Transformer'}
                  </span>
                </div>
                <div className={styles.specRow}>
                  <span>Provider ID</span>
                  <span className={styles.specVal}>{m.providerId}</span>
                </div>
                <div className={styles.specRow}>
                  <span>Parameters / Precision</span>
                  <span className={styles.specVal}>
                    {m.parameterCount || 'TBD'} · {m.precision || m.quantization || 'Unknown'}
                  </span>
                </div>
                <div className={styles.specRow}>
                  <span>Target Context</span>
                  <span className={styles.specVal}>
                    {m.contextLength ? `${m.contextLength.toLocaleString()} tokens` : 'Unknown / TBD'}
                  </span>
                </div>
                <div className={styles.specRow}>
                  <span>Resource Feasibility</span>
                  <span className={styles.specVal}>
                    {isZaqx
                      ? 'Untrained (TBD)'
                      : isMock
                      ? 'Simulated (0 MB)'
                      : feasibility.status === 'likely_fit'
                      ? 'Likely Fit (Smooth)'
                      : feasibility.status === 'possibly_constrained'
                      ? 'Constrained (Warning)'
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              {/* Capabilities */}
              <div className={styles.capabilityRow}>
                {m.capabilities.map((cap) => (
                  <span key={cap} className={styles.capabilityBadge}>
                    {cap}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              {isActive ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Check size={14} />}
                    disabled
                    style={{ flex: 1 }}
                  >
                    Active Selection
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Play size={14} />}
                    onClick={() => navigate('chat')}
                    style={{ flex: 1 }}
                  >
                    Open in Chat
                  </Button>
                </div>
              ) : isLlama ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Play size={14} />}
                    onClick={() => {
                      setWorkspaceModel(m.id, m.name);
                      handleStartRuntime(m.id);
                    }}
                    style={{ flex: 1 }}
                  >
                    Load & Select
                  </Button>
                </div>
              ) : m.id === 'zaqx-1.0' || m.family?.toLowerCase() === 'zaqx' ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Cpu size={14} />}
                  onClick={() => navigate('lab')}
                  fullWidth
                >
                  Inspect Architecture in Lab
                </Button>
              ) : isAvailable ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<DownloadCloud size={14} />}
                  onClick={() => setWorkspaceModel(m.id, m.name)}
                  fullWidth
                >
                  Select Model
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<ShieldAlert size={14} />}
                  disabled
                  fullWidth
                >
                  Model Unavailable · Runtime Disconnected
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Section 2: Execution Providers */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Inference Execution Engines</h2>
      </div>
      <div className={styles.providersGrid}>
        {providers.map((p) => (
          <div key={p.id} className={styles.providerCard}>
            <div className={styles.providerCardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} style={{ color: 'var(--nikit-accent-base)' }} />
                <span className={styles.providerName}>{p.name}</span>
              </div>
              <Badge variant={p.status === 'healthy' ? 'local' : 'default'} size="sm">
                {p.status === 'healthy' ? 'Online' : 'Standby'}
              </Badge>
            </div>
            <span className={styles.providerStatusMsg}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
