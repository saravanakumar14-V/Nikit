/**
 * @nikit/types
 * Core domain types and contracts for Nikit AI Platform
 */

// ============================================================================
// UI Common Types
// ============================================================================

export type Size = 'sm' | 'md' | 'lg';
export type ExtendedSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'subtle' | 'outline' | 'ghost' | 'danger';
export type StatusVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'local';

export type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right';

// ============================================================================
// Model Architecture & Providers
// ============================================================================

export type ModelProviderType =
  | 'zaqx'
  | 'local'
  | 'llamacpp'
  | 'ollama'
  | 'openai'
  | 'anthropic'
  | 'custom'
  | 'mock';

export type ModelTrainingStatus =
  | 'uninitialized'
  | 'planning'
  | 'training'
  | 'fine_tuning'
  | 'ready'
  | 'prototype_placeholder';

export type ModelCapability =
  | 'chat'
  | 'streaming'
  | 'vision'
  | 'embeddings'
  | 'toolCalling'
  | 'reasoning'
  | 'longContext'
  | 'code'
  | 'structuredOutput'
  | 'local'
  | 'offline';

export type ModelStatus =
  | 'unavailable'
  | 'discovered'
  | 'available'
  | 'loading'
  | 'ready'
  | 'busy'
  | 'error'
  | 'unloading'
  | 'prototype';

export type ProviderType = 'local' | 'embedded' | 'remote' | 'mock';

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface ProviderHealth {
  providerId: string;
  status: ProviderHealthStatus;
  checkedAt?: string;
  latencyMs?: number | null;
  message?: string;
}

export type RuntimeType = 'zaqx' | 'llamacpp' | 'ollama' | 'remote' | 'mock';

export type RuntimeStatus =
  | 'not_connected'
  | 'available'
  | 'initializing'
  | 'loading'
  | 'ready'
  | 'busy'
  | 'error'
  | 'stopped';

export interface ModelRuntime {
  id: string;
  name: string;
  type: RuntimeType;
  status: RuntimeStatus;
  version?: string;
  deviceType?: string;
  hardwareInfo?: Record<string, unknown>;
}

export interface ModelSpecification {
  parameterCount: string; // e.g. "TBD (Future Model)" or "7B"
  contextLength: string; // e.g. "TBD" or "32,768 tokens (Target)"
  precision: string; // e.g. "Unset" or "FP16 (Target)"
  quantization?: string; // e.g. "Unset"
  estimatedVram?: string; // e.g. "TBD"
  status: ModelTrainingStatus;
  isPrototype: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  family: string;
  version: string;
  providerId: string;
  description?: string;
  architecture?: string | null;
  parameterCount?: number | string | null;
  contextLength?: number | null;
  vocabularySize?: number | null;
  precision?: string | null;
  quantization?: string | null;
  capabilities: ModelCapability[];
  local: boolean;
  prototype: boolean;
  runtimeId?: string;
  // Backward compatibility bridged fields
  provider?: ModelProviderType;
  streaming?: boolean;
  specification?: ModelSpecification;
  runtimeEngine?: string;
}

export interface RuntimeModelState {
  modelId: string;
  status: ModelStatus;
  loaded: boolean;
  runtimeId?: string;
  hardwareState?: string;
  lastError?: string | null;
  telemetry?: ModelTelemetry | null;
  updatedAt: string;
}

export type ModelLifecycleEventType =
  | 'model_discovered'
  | 'model_loading'
  | 'model_ready'
  | 'model_busy'
  | 'model_unloaded'
  | 'model_error';

export interface ModelLifecycleEvent {
  type: ModelLifecycleEventType;
  modelId: string;
  providerId?: string;
  runtimeId?: string;
  status: ModelStatus;
  timestamp: string;
  error?: string;
}

export type ModelResolutionSource =
  | 'conversation_override'
  | 'project_default'
  | 'workspace_default';

export interface ModelResolution {
  model: AIModel;
  providerId: string;
  resolvedSource: ModelResolutionSource;
  isPrototype: boolean;
  status: ModelStatus;
}

export type ModelErrorCode =
  | 'MODEL_NOT_FOUND'
  | 'PROVIDER_NOT_FOUND'
  | 'PROVIDER_UNAVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'CAPABILITY_UNSUPPORTED'
  | 'RUNTIME_NOT_READY'
  | 'MODEL_LOAD_FAILED'
  | 'GENERATION_UNAVAILABLE';

export interface ModelTelemetry {
  tokensPerSecond?: number | null;
  timeToFirstTokenMs?: number | null;
  totalTokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  memoryUsedMb?: number | null;
  vramUsedMb?: number | null;
  isPrototypeData: boolean;
}

// ============================================================================
// Local Runtime State & Hardware Detection
// ============================================================================

export type RuntimeConnectionStatus = 'not_connected' | 'initializing' | 'connected' | 'error';
export type HardwareDetectionStatus = 'detected' | 'unsupported' | 'unavailable' | 'unknown';

export interface LocalRuntimeInfo {
  status: RuntimeConnectionStatus;
  engineName: string; // e.g. "Not connected"
  deviceType: 'gpu' | 'cpu' | 'mps' | 'unknown';
  gpuName: string; // e.g. "Unknown" until detected
  vramTotalGb: number | null;
  vramUsedGb: number | null;
  ramTotalGb: number | null;
  ramUsedGb: number | null;
  cudaStatus: HardwareDetectionStatus;
  cudaVersion: string | null;
  driverVersion: string | null;
  isRealHardwareDetected: boolean;
  lastCheckedAt: string | null;
}

// ============================================================================
// Project & Workspace Domain (Phase 4)
// ============================================================================

export interface ProjectContext {
  instructions?: string;
  defaultModelId?: string;
  defaultModelName?: string;
  fileReferences: string[];
  memoryReferences: string[];
  knowledgeReferences: string[];
  toolReferences: string[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  accent?: string;
  createdAt: string;
  updatedAt: string;
  defaultModelId: string;
  defaultModelName: string;
  instructions: string;
  context: ProjectContext;
  conversationIds: string[];
  archived: boolean;
  schemaVersion: string; // 'v1'
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  accent?: string;
  updatedAt: string;
  defaultModelId: string;
  defaultModelName: string;
  conversationCount: number;
  archived: boolean;
}

// Retain legacy AIProject alias for backward compatibility
export type AIProject = ProjectSummary;

// ============================================================================
// Conversation Domain & Message Contracts (Phase 3 & 4)
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus =
  | 'idle'
  | 'draft'
  | 'sending'
  | 'generating'
  | 'stopping'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'retrying';

export interface TextPart {
  type: 'text';
  content: string;
}

export interface CodePart {
  type: 'code';
  language: string;
  filename?: string;
  content: string;
}

export interface ImagePart {
  type: 'image';
  url: string;
  alt?: string;
  mimeType?: string;
}

export interface FilePart {
  type: 'file';
  name: string;
  sizeBytes?: number;
  mimeType?: string;
  path?: string;
}

export interface CitationPart {
  type: 'citation';
  source: string;
  url?: string;
  title?: string;
}

export interface ToolResultPart {
  type: 'tool_result';
  toolName: string;
  callId: string;
  output: string;
  isError?: boolean;
}

export interface ReasoningPart {
  type: 'reasoning';
  content: string;
  durationMs?: number;
}

export type MessagePart =
  | TextPart
  | CodePart
  | ImagePart
  | FilePart
  | CitationPart
  | ToolResultPart
  | ReasoningPart;

export interface MessageError {
  message: string;
  code?: string;
  details?: string;
  retryable?: boolean;
}

export interface AttachmentReference {
  id: string;
  name: string;
  type: 'image' | 'file' | 'code';
  sizeBytes: number;
  content?: string;
  mimeType?: string;
  path?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  parts: MessagePart[];
  status: MessageStatus;
  modelId?: string;
  modelName?: string;
  createdAt: string;
  updatedAt: string;
  telemetry?: ModelTelemetry | null;
  error?: MessageError | null;
  parentId?: string | null;
}

/**
 * Platform Context Accounting Snapshot.
 * Represents boundary token allocations across architectural context buckets.
 */
export interface ContextSnapshot {
  modelTokens?: number | null;
  systemTokens?: number | null;
  projectTokens?: number | null;
  memoryTokens?: number | null;
  conversationTokens?: number | null;
  fileTokens?: number | null;
  toolTokens?: number | null;
  userTokens?: number | null;
  totalTokens?: number | null;
  contextLimit?: number | null;
  remainingTokens?: number | null;
  isCalculated: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  modelName: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  draft?: string;
  contextSnapshot?: ContextSnapshot;
  pinned?: boolean;
  schemaVersion: string; // e.g. "v1"
  projectId?: string | null; // Authoritative project membership
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  modelId: string;
  modelName?: string;
  messageCount: number;
  pinned?: boolean;
  preview?: string;
  projectId?: string | null; // Authoritative project membership
}

// ============================================================================
// Structured Context Assembly Contracts (Phase 4 & 5A)
// ============================================================================

export type ContextBlockType =
  | 'system'
  | 'user_memory'
  | 'project_instructions'
  | 'project_memory'
  | 'retrieved_knowledge'
  | 'conversation_history'
  | 'current_user'
  | 'tools'
  | 'project'
  | 'conversation'
  | 'memory'
  | 'files';

export interface FileContextReference {
  fileId: string;
  name: string;
  status: FileStatus;
  sizeBytes: number;
  normalizedDocumentId?: string;
}

export interface ContextBlock {
  id?: string;
  type: ContextBlockType;
  title: string;
  content: string;
  priority?: number; // 1 = highest priority (System), 10 = lowest (Older conversation)
  tokenEstimate?: number | null;
  sourceId?: string;
  enabled?: boolean;
  required?: boolean;
  metadata?: Record<string, unknown>;
  fileReferences?: FileContextReference[];
  isAvailable: boolean;
  exclusionReason?: string;
}

export interface ContextBudgetReport {
  contextLimit: number | null;
  totalTokensEstimated: number | null;
  remainingTokens: number | null;
  includedBlocks: ContextBlock[];
  omittedBlocks: ContextBlock[];
  isConstrained: boolean;
  budgetApplied: boolean;
}

export interface StructuredContext {
  blocks: ContextBlock[];
  effectiveModelId: string;
  effectiveModelName: string;
  projectId?: string | null;
  conversationId?: string | null;
  snapshot: ContextSnapshot;
  budgetReport?: ContextBudgetReport;
}

// ============================================================================
// Memory & Context Intelligence Domain Contracts (Phase 8)
// ============================================================================

export type MemoryScope = 'user' | 'project';

export type MemoryStatus = 'active' | 'archived' | 'deleted';

export type MemoryConfidence = 'explicit' | 'high' | 'medium' | 'low';

export type MemorySource = 'user_saved' | 'project_instruction' | 'conversation';

export interface MemoryProvenance {
  source: MemorySource;
  sourceConversationId?: string | null;
  sourceMessageId?: string | null;
  sourceProjectId?: string | null;
  recordedBy?: string;
  originalText?: string;
}

export interface Memory {
  id: string;
  scope: MemoryScope;
  projectId?: string | null;
  title?: string;
  content: string;
  status: MemoryStatus;
  confidence: MemoryConfidence;
  source: MemorySource;
  provenance: MemoryProvenance;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
  usageCount: number;
  schemaVersion: 'v1';
}

export interface MemoryQuery {
  scope?: MemoryScope;
  projectId?: string | null;
  status?: MemoryStatus | MemoryStatus[];
  source?: MemorySource;
  search?: string;
  limit?: number;
}

export interface MemoryUpdate {
  title?: string;
  content?: string;
  status?: MemoryStatus;
  confidence?: MemoryConfidence;
}

export interface MemoryPolicy {
  enabled: boolean;
  allowConversationMemory: boolean;
  allowProjectMemory: boolean;
  requireExplicitSave: boolean;
  maxUserMemories?: number;
  maxProjectMemories?: number;
}

export interface MemoryConflict {
  memoryA: Memory;
  memoryB: Memory;
  reason: string;
  detectedAt: string;
}

// ============================================================================
// Files & Document Ingestion Domain Contracts (Phase 5A)
// ============================================================================

export type FileStatus =
  | 'registered'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'unsupported'
  | 'unavailable'
  | 'removed';

export type FileType =
  | 'text'
  | 'markdown'
  | 'json'
  | 'csv'
  | 'code'
  | 'pdf'
  | 'unsupported';

export type IngestionStage =
  | 'detecting'
  | 'reading'
  | 'parsing'
  | 'normalizing'
  | 'finalizing';

export interface IngestionState {
  status: FileStatus;
  progress?: number | null; // percentage or null if indeterminate
  stage?: IngestionStage | string;
  startedAt?: string;
  completedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface FileMetadata {
  lineCount?: number;
  characterCount?: number;
  wordCount?: number;
  approximateTokens?: number | null; // null until real tokenizer connects
  detectedEncoding?: string;
  customProperties?: Record<string, unknown>;
}

export interface FileRecord {
  id: string;
  projectId?: string | null;
  name: string;
  extension: string;
  mimeType?: string;
  fileType: FileType;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  status: FileStatus;
  ingestion: IngestionState;
  metadata: FileMetadata;
  sourcePath?: string;
  contentHash?: string; // SHA-256
  normalizedDocumentId?: string;
  schemaVersion: string; // 'v1'
}

export interface FileSummary {
  id: string;
  projectId?: string | null;
  name: string;
  extension: string;
  fileType: FileType;
  sizeBytes: number;
  updatedAt: string;
  status: FileStatus;
  characterCount?: number;
  lineCount?: number;
}

export interface DocumentMetadata {
  title?: string;
  sourceName: string;
  sourceType: FileType;
  characterCount: number;
  lineCount: number;
  wordCount: number;
  parsedAt: string;
  checksum?: string;
  detectedEncoding?: string;
}

export interface NormalizedDocument {
  id: string;
  fileId: string;
  title?: string;
  text: string;
  metadata: DocumentMetadata;
  createdAt: string;
  schemaVersion: string; // 'v1'
}

export interface DocumentParser {
  id: string;
  supportedExtensions: string[];
  supportedMimeTypes: string[];
  canParse(filename: string, mimeType?: string): boolean;
  parse(
    fileId: string,
    filename: string,
    content: string | ArrayBuffer,
    mimeType?: string
  ): Promise<NormalizedDocument>;
}

// ============================================================================
// Document Chunking & Knowledge Index Contracts (Phase 5B)
// ============================================================================

export type DocumentIndexStatus =
  | 'not_started'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'stale';

export interface ChunkLocation {
  documentId: string;
  startOffset: number;
  endOffset: number;
  startLine?: number;
  endLine?: number;
}

export interface ChunkMetadata {
  title?: string;
  headings?: string[]; // e.g. ["Transformer", "Attention", "Multi-Head Attention"]
  section?: string;
  path?: string; // for JSON path like customer.orders[0].items
  startCharacter?: number;
  endCharacter?: number;
  startLine?: number;
  endLine?: number;
  language?: string;
  sourceName: string;
  sourceExtension: string;
  approximateTokens?: number | null; // null in Phase 5B (no token claims)
  chunkerVersion?: string;
  configHash?: string;
  chunkingStrategy?: string;
}

export interface DocumentChunk {
  id: string; // Deterministic: documentId + contentHash + section
  documentId: string;
  fileId: string;
  projectId?: string | null;
  text: string;
  metadata: ChunkMetadata;
  location: ChunkLocation;
  contentHash: string; // SHA-256
  sequence: number; // Ordering sequence
  createdAt: string;
  updatedAt: string;
  schemaVersion: 'v1';
}

export interface ChunkingConfig {
  targetChunkSize: number; // in characters, e.g. 1000
  maxChunkSize: number; // in characters, e.g. 1500
  minChunkSize: number; // in characters, e.g. 100
  overlapSize: number; // in characters, e.g. 150
  preserveHeadings: boolean;
  preserveParagraphs: boolean;
  chunkerVersion: string;
}

export interface ChunkingResult {
  documentId: string;
  fileId: string;
  chunks: DocumentChunk[];
  totalChunks: number;
  chunkingDurationMs: number;
  documentChecksum: string;
  chunkerVersion: string;
  configHash: string;
}

export interface ChunkReference {
  chunkId: string;
  documentId: string;
  fileId: string;
  sequence: number;
  snippet: string;
  headingPath?: string;
}

// ============================================================================
// Embedding & Hybrid Knowledge Retrieval Contracts (Phase 5C)
// ============================================================================

export interface EmbeddingModel {
  id: string; // e.g. 'local-deterministic-v1' or future 'bge-small-en-v1.5'
  name: string;
  provider: string;
  dimensions: number; // Model-defined dimension (not hardcoded globally)
  version: string;
  isLocal: boolean;
  isPrototypeBaseline?: boolean; // true for local-deterministic-v1
}

export type EmbeddingVector = number[];

export interface EmbeddingRecord {
  id: string; // Deterministic: emb-${chunkId}
  chunkId: string;
  documentId: string;
  fileId: string;
  projectId?: string | null;
  modelId: string;
  modelVersion: string;
  dimensions: number;
  vector: EmbeddingVector;
  inputHash: string; // SHA-256 of text input for stale detection
  createdAt: string;
  updatedAt: string;
  schemaVersion: 'v1';
}

export interface EmbeddingRequest {
  chunkId: string;
  text: string;
  documentId: string;
  fileId: string;
  projectId?: string | null;
}

export type RetrievalSource = 'vector' | 'lexical' | 'hybrid';
export type HybridRankingStrategy = 'rrf' | 'weighted_normalized';

export interface RetrievedChunk {
  chunkId: string;
  score: number; // Final combined score
  vectorScore?: number; // In-process vector similarity score [0..1]
  lexicalScore?: number; // Lexical keyword matching score [0..1]
  rank: number;
  chunk: DocumentChunk;
  source: RetrievalSource;
}

export interface RetrievalFilters {
  projectId?: string | null;
  fileId?: string;
  documentId?: string;
  fileType?: string;
}

export interface RetrievalConfig {
  topK: number; // default: 5
  vectorTopK: number; // default: 10
  lexicalTopK: number; // default: 10
  vectorWeight: number; // default: 0.7
  lexicalWeight: number; // default: 0.3
  minScore: number; // default: 0.05
  rankingStrategy: HybridRankingStrategy; // default: 'rrf'
  rrfK: number; // default: 60 (smoothing constant for Reciprocal Rank Fusion)
  deduplicateByDocument: boolean; // default: false
}

export interface RetrievalResult {
  query: string;
  results: RetrievedChunk[];
  totalCandidates: number;
  durationMs: number;
  config: RetrievalConfig;
  filters?: RetrievalFilters;
  modelId: string;
  executedAt: string;
}

export interface EvaluationItem {
  query: string;
  expectedChunkIds: string[];
  filters?: RetrievalFilters;
}

export interface EvaluationMetrics {
  totalQueries: number;
  meanRecallAtK: number;
  meanPrecisionAtK: number;
  hitRateAtK: number;
  meanReciprocalRank: number; // MRR
  topK: number;
  evaluations: Array<{
    query: string;
    recallAtK: number;
    precisionAtK: number;
    hitAtK: boolean;
    reciprocalRank: number;
    retrievedChunkIds: string[];
    expectedChunkIds: string[];
  }>;
}

// ============================================================================
// Streaming & Provider Contracts
// ============================================================================

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface GenerationRequest {
  conversationId: string;
  messages: Message[];
  modelId: string;
  abortSignal?: AbortSignal;
  options?: GenerationOptions;
}

export type GenerationEvent =
  | { type: 'started'; messageId: string; modelId: string }
  | { type: 'delta'; messageId: string; textDelta: string; partIndex?: number }
  | { type: 'completed'; messageId: string; finalContent?: string; telemetry?: ModelTelemetry }
  | { type: 'error'; messageId: string; error: MessageError }
  | { type: 'cancelled'; messageId: string; partialContent?: string }
  | { type: 'metadata'; messageId: string; telemetry?: ModelTelemetry };

export interface GenerationState {
  status: MessageStatus;
  activeMessageId: string | null;
  error: MessageError | null;
  isStreaming: boolean;
}

// ============================================================================
// Command Palette
// ============================================================================

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string[];
  description?: string;
  icon?: string;
  action: () => void;
  disabled?: boolean;
}

// ============================================================================
// Phase 9: LLM Lab & Model Playground Contracts
// ============================================================================

export interface GenerationConfig {
  temperature: number; // 0.0 to 2.0 (default: 0.7)
  topP: number; // 0.0 to 1.0 (default: 0.9)
  topK?: number | null; // 1 to 100 (default: 40)
  maxTokens?: number | null; // 1 to 8192 (default: 1024)
  stopSequences?: string[];
}

export interface LabContextConfig {
  includeUserMemory: boolean; // default: false
  includeProjectInstructions: boolean; // default: false
  includeProjectMemory: boolean; // default: false
  includeRetrievedKnowledge: boolean; // default: false
  includeConversationHistory: boolean; // default: false
  projectId?: string | null;
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

export type RunMetricSource = 'runtime' | 'local_measurement' | 'tokenizer' | 'unavailable';

export interface RunMetrics {
  ttftMs?: number | null; // Time to First Token in milliseconds
  durationMs?: number | null; // Total generation duration in milliseconds
  promptTokens?: number | null; // Exact prompt tokens from runtime
  completionTokens?: number | null; // Exact completion tokens from runtime
  tokensPerSecond?: number | null; // True generation throughput
  contextTokens?: number | null;
  modelLoadTimeMs?: number | null;
  metricSource: RunMetricSource;
}

export interface ReproducibilityMetadata {
  modelId: string;
  modelVersion?: string | null;
  modelFileHash?: string | null;
  providerId: string;
  runtimeId?: string | null;
  runtimeVersion?: string | null;
  llamaCppVersion?: string | null;
  runtimeBackend?: string | null;
  runtimeConfig?: Record<string, unknown>;
}

export interface RunContextSummary {
  contextConfig: LabContextConfig;
  includedBlockIds: string[];
  omittedBlockIds: string[];
  budgetReport?: ContextBudgetReport;
  tokenEstimate?: number | null;
  fullContentIncluded: boolean;
  rawFullContent?: string | null; // Optional: only captured when explicitly requested in dev/research mode
}

export interface RunRecord {
  id: string;
  experimentId?: string | null;
  name?: string;
  modelId: string;
  modelName: string;
  providerId: string;
  runtimeId?: string;
  systemPrompt: string;
  userPrompt: string;
  developerPrompt?: string;
  generationConfig: GenerationConfig;
  contextSummary?: RunContextSummary;
  reproducibility?: ReproducibilityMetadata;
  status: RunStatus;
  output?: string;
  metrics?: RunMetrics | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  schemaVersion: 'v1';
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  userPrompt: string;
  developerPrompt?: string;
  generationConfig: GenerationConfig;
  contextConfig: LabContextConfig;
  modelId?: string | null;
  runIds: string[];
  notes?: string;
  tags?: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 'v1';
}

export interface ExperimentExport {
  exportVersion: 'nikit-lab-v1';
  exportedAt: string;
  experiment: Experiment;
  runs: RunRecord[];
}

// ============================================================================
// Phase 10: Dataset, Evaluation & Training Infrastructure Contracts
// ============================================================================

// --- Dataset Domain ---
export type DatasetFormat = 'jsonl' | 'text';
export type DatasetStatus = 'ready' | 'processing' | 'failed' | 'archived';
export type DatasetSplit = 'train' | 'validation' | 'test';

export interface DatasetSplitRatio {
  train: number; // e.g. 0.8
  validation: number; // e.g. 0.1
  test: number; // e.g. 0.1
}

export interface DatasetRecord {
  id: string;
  datasetVersionId: string;
  split: DatasetSplit;
  text: string;
  input?: string;
  output?: string;
  messages?: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
  contentHash: string;
}

export type DatasetValidationSeverity = 'error' | 'warning' | 'info';

export interface DatasetValidationIssue {
  recordIndex?: number;
  field?: string;
  message: string;
  severity: DatasetValidationSeverity;
}

export interface DatasetValidationResult {
  valid: boolean;
  totalRecords: number;
  errorCount: number;
  warningCount: number;
  issues: DatasetValidationIssue[];
}

export interface LeakageOverlap {
  splitA: DatasetSplit;
  splitB: DatasetSplit;
  overlapCount: number;
  sampleHashes: string[];
}

export interface DatasetStatistics {
  recordCount: number;
  uniqueRecordCount: number;
  duplicateCount: number;
  totalChars: number;
  totalWords: number;
  minLengthChars: number;
  maxLengthChars: number;
  meanLengthChars: number;
  medianLengthChars: number;
  splitSizes: {
    train: number;
    validation: number;
    test: number;
  };
  leakageCount: number;
  leakageOverlaps: LeakageOverlap[];
}

export interface DatasetVersion {
  id: string;
  datasetId: string;
  versionNumber: number;
  contentHash: string;
  recordCount: number;
  source: string;
  statistics: DatasetStatistics;
  splitRatio: DatasetSplitRatio;
  splitSeed: number;
  splitAlgorithmVersion: 'v1';
  sourceVersionHash?: string;
  validationResult: DatasetValidationResult;
  createdAt: string;
  schemaVersion: 'v1';
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  format: DatasetFormat;
  recordCount: number;
  activeVersionId?: string;
  versionIds: string[];
  tags?: string[];
  status: DatasetStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 'v1';
}

// --- Tokenizer Domain ---
export type TokenizerType = 'llamacpp' | 'heuristic_analyzer' | 'custom';

export interface TokenizationResult {
  text: string;
  tokens: string[];
  tokenIds: number[];
  tokenCount: number;
  isAuthoritative: boolean;
  tokenizerName: string;
}

export interface TokenLengthDistribution {
  minTokens: number;
  maxTokens: number;
  meanTokens: number;
  medianTokens: number;
  p95Tokens: number;
  p99Tokens: number;
  contextLimit: number;
  withinLimitPercentage: number;
  exceededPercentage: number;
  isAuthoritative: boolean;
}

export interface PackingAnalysisResult {
  targetContextLength: number;
  totalTokens: number;
  packingEfficiency: number;
  truncationRate: number;
  estimatedWastedTokens: number;
}

export interface ITokenizerProvider {
  readonly id: string;
  readonly name: string;
  readonly type: TokenizerType;
  readonly version: string;
  readonly isAuthoritative: boolean;
  tokenize(text: string): Promise<TokenizationResult>;
  countTokens(text: string): Promise<number>;
  decode(tokenIds: number[]): Promise<string>;
}

// --- Evaluation Domain ---
export type EvaluationMetricType =
  | 'exact_match'
  | 'token_exact_match'
  | 'char_similarity'
  | 'length_check'
  | 'perplexity';

export type EvaluationCategory =
  | 'General QA'
  | 'Code'
  | 'Reasoning'
  | 'Instruction Following'
  | 'Knowledge'
  | 'Safety'
  | 'Custom';

export interface EvaluationTarget {
  id: string;
  name: string;
  modelId: string;
  generationConfig?: GenerationConfig;
}

export interface EvaluationCase {
  id: string;
  suiteId: string;
  prompt: string;
  expectedOutput?: string;
  systemPrompt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvaluationResult {
  id: string;
  caseId: string;
  runId: string;
  targetId: string;
  notes?: string;
  manualRating?: number; // 1-5
  createdAt: string;
}

export interface EvaluationSuite {
  id: string;
  name: string;
  description?: string;
  category: EvaluationCategory;
  caseCount: number;
  caseIds: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: 'v1';
}

export interface EvaluationMetricResult {
  metric: EvaluationMetricType;
  score: number;
  details?: string;
  isAvailable: boolean;
}

export interface EvaluationCaseResult {
  caseId: string;
  prompt: string;
  expectedOutput?: string;
  actualOutput: string;
  passed?: boolean;
  metrics: EvaluationMetricResult[];
  latencyMs?: number | null;
}

export interface EvaluationRun {
  id: string;
  suiteId: string;
  suiteName: string;
  modelId: string;
  modelName: string;
  modelVersion?: string;
  modelFileHash?: string;
  providerId: string;
  runtimeId?: string;
  runtimeVersion?: string;
  tokenizerId?: string;
  tokenizerVersion?: string;
  generationConfig: GenerationConfig;
  overallAccuracy: number;
  metricSummaries: Record<string, number>;
  caseResults: EvaluationCaseResult[];
  createdAt: string;
  schemaVersion: 'v1';
}

// --- Training & Checkpoint Domain ---
export type TrainingPrecision = 'fp16' | 'bf16' | 'fp32' | 'q4_0' | 'q8_0';

export type ResourceFeasibility =
  | 'likely_fit'
  | 'possibly_constrained'
  | 'likely_insufficient'
  | 'unknown';

export interface ResourceFeasibilityReport {
  feasibility: ResourceFeasibility;
  estimatedVramMb?: number | null;
  estimatedRamMb?: number | null;
  detectedVramMb?: number | null;
  detectedRamMb?: number | null;
  warnings: string[];
  recommendations: string[];
}

export interface TrainingConfiguration {
  modelId: string;
  datasetVersionId: string;
  tokenizerId: string;
  contextLength: number;
  batchSize: number;
  microBatchSize: number;
  gradientAccumulation: number;
  learningRate: number;
  weightDecay: number;
  epochs: number;
  maxSteps: number;
  warmupSteps: number;
  evaluationInterval: number;
  checkpointInterval: number;
  precision: TrainingPrecision;
  gradientCheckpointing: boolean;
  seed: number;
}

export type TrainingRunStatus =
  | 'created'
  | 'validating'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TrainingResourceSnapshot {
  gpuUsagePercentage?: number | null;
  vramUsedMb?: number | null;
  vramTotalMb?: number | null;
  ramUsedMb?: number | null;
  ramTotalMb?: number | null;
  isRealMeasurement: boolean;
}

export interface TrainingRun {
  id: string;
  name: string;
  modelId: string;
  datasetVersionId: string;
  tokenizerId: string;
  config: TrainingConfiguration;
  status: TrainingRunStatus;
  currentStep: number;
  totalSteps: number;
  currentEpoch: number;
  totalEpochs: number;
  loss?: number | null;
  learningRate?: number | null;
  checkpointIds: string[];
  resourceSnapshot?: TrainingResourceSnapshot;
  isSimulation: boolean;
  simulationNotice?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  error?: string | null;
  schemaVersion: 'v1';
}

export interface Checkpoint {
  id: string;
  trainingRunId: string;
  modelId: string;
  step: number;
  epoch?: number;
  path: string;
  sizeBytes?: number;
  modelFileHash?: string;
  metrics?: Record<string, number | null>;
  status: 'available' | 'missing' | 'corrupt';
  createdAt: string;
  schemaVersion: 'v1';
}

export interface ResumeMetadata {
  trainingRunId: string;
  checkpointId: string;
  step: number;
  epoch: number;
  datasetVersionId: string;
  tokenizerId: string;
  config: TrainingConfiguration;
  seed: number;
  isVerified: boolean;
}

// ============================================================================
// Phase 11: ZaqX 1.0 Model Development & Integration Contracts
// ============================================================================

export type ZaqXActivation = 'swiglu' | 'gelu' | 'silu';
export type ZaqXNormType = 'rmsnorm' | 'layernorm';

export type ZaqXModelScale =
  | 'experimental-tiny'
  | 'experimental-small'
  | 'experimental-medium'
  | 'experimental-135m'
  | 'zaqx-1.0-candidate'
  | 'custom';

export type ZaqXPromotionStatus =
  | 'experimental'
  | 'candidate'
  | 'validated'
  | 'released';

export interface ZaqXConfig {
  name: string;
  scale: ZaqXModelScale;
  hiddenSize: number;
  numLayers: number;
  numAttentionHeads: number;
  numKeyValueHeads: number;
  intermediateSize: number;
  vocabSize: number;
  maxContextLength: number;
  ropeTheta: number;
  normEpsilon: number;
  activation: ZaqXActivation;
  normType: ZaqXNormType;
  useGQA: boolean;
  useRoPE: boolean;
  tieWordEmbeddings: boolean;
}

export interface ZaqXParameterBreakdown {
  totalParams: number;
  trainableParams: number;
  embeddingParams: number;
  attentionParams: number;
  mlpParams: number;
  lmHeadParams: number;
  normParams: number;
  totalParamsFormatted: string;
}

export interface ZaqXScalingEstimate {
  scale: ZaqXModelScale;
  config: ZaqXConfig;
  parameters: ZaqXParameterBreakdown;
  estimatedWeightsMb: number;
  estimatedTrainingMemoryMb: number;
  estimatedInferenceMemoryMb: number;
  feasibility: ResourceFeasibility;
  feasibilityReport: ResourceFeasibilityReport;
}

export interface ZaqXModelCard {
  modelId: string;
  name: string;
  version: string;
  promotionStatus: ZaqXPromotionStatus;
  config: ZaqXConfig;
  parameters: ZaqXParameterBreakdown;
  tokenizerId: string;
  vocabSize: number;
  contextLength: number;
  activeCheckpointId?: string;
  latestEvalAccuracy?: number | null;
  exportFormat?: string | null;
  isRunnableLocal: boolean;
  runtimeCompatibility: 'llama.cpp' | 'pytorch_native' | 'not_connected';
  createdAt: string;
  updatedAt: string;
}

export interface ZaqXExportArtifact {
  id: string;
  modelId: string;
  checkpointId: string;
  format: 'pytorch_bin' | 'safetensors' | 'gguf';
  path: string;
  fileSizeBytes: number;
  fileHash: string;
  quantization?: string;
  isValid: boolean;
  compatibility: {
    llamacppCompatible: boolean;
    tensorCount: number;
    kvPairs: Record<string, string | number>;
  };
  exportedAt: string;
}

export type TrainingEventType =
  | 'training_started'
  | 'step_completed'
  | 'metrics'
  | 'checkpoint_created'
  | 'evaluation_completed'
  | 'training_paused'
  | 'training_resumed'
  | 'training_completed'
  | 'training_failed'
  | 'training_cancelled';

export interface TrainingEvent {
  type: TrainingEventType;
  runId: string;
  step?: number;
  epoch?: number;
  loss?: number | null;
  learningRate?: number | null;
  checkpointId?: string;
  checkpointPath?: string;
  metrics?: Record<string, number | null>;
  message?: string;
  timestamp: string;
}

// ============================================================================
// Phase 12: ZaqX Production, GGUF Runtime Integration & Hardening Contracts
// ============================================================================

export interface ZaqXArtifactManifest {
  schemaVersion: 'v1';
  modelId: string;
  modelVersion: string;
  architecture: string;
  configHash: string;
  tokenizerHash: string;
  datasetHash: string;
  checkpointHash: string;
  ggufHash: string;
  converterVersion: string;
  llamaCppVersion: string;
  quantization: string;
  createdAt: string;
  promotionStatus: ZaqXPromotionStatus;
  metadata: {
    totalParams: number;
    contextLength: number;
    hiddenSize: number;
    layers: number;
    heads: number;
    kvHeads: number;
    vocabSize: number;
  };
}

export interface ZaqXCorpusValidationStats {
  totalSamples: number;
  totalTokens: number;
  uniqueTokensUsed: number;
  vocabCoveragePercent: number;
  unknownTokenCount: number;
  unknownTokenRatePercent: number;
  minSeqLen: number;
  maxSeqLen: number;
  p50SeqLen: number;
  p95SeqLen: number;
  p99SeqLen: number;
  meanSeqLen: number;
  truncationRatePercent: number;
  packingEfficiencyPercent: number;
  specialTokensValid: boolean;
  tokenizerHash: string;
  validatedAt: string;
}

export interface ZaqXHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checkedAt: string;
  checks: {
    artifactIntegrity: boolean;
    tokenizerCompatibility: boolean;
    runtimeAvailability: boolean;
    modelAvailability: boolean;
    ggufValidity: boolean;
  };
  details: {
    activeModelId?: string;
    ggufPath?: string;
    tokenizerHash?: string;
    llamaCppStatus?: string;
    errors: string[];
    warnings: string[];
  };
}

export interface ZaqXParityComparison {
  prompt: string;
  pytorchOutput: string;
  ggufOutput: string;
  logitsMaxDiff: number;
  generatedTokenCount: number;
  stopReason: 'eos' | 'max_tokens' | 'cancelled';
  parityStatus: 'pass' | 'diverged';
}

// ============================================================================
// Research Cycle 01: Corpus, Tokenizer & Training Baseline Contracts
// ============================================================================

export type ZaqXErrorTaxonomyTag =
  | 'hallucination'
  | 'repetition'
  | 'incoherence'
  | 'instruction_failure'
  | 'format_failure'
  | 'code_failure'
  | 'tokenization_failure'
  | 'truncation'
  | 'context_failure'
  | 'eos_failure';

export interface ZaqXCorpusAuditReport {
  datasetVersionId: string;
  datasetHash: string;
  recordCount: number;
  charCount: number;
  wordCount: number;
  duplicateCount: number;
  duplicateRatePercent: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  exactLeakageOverlapCount: number;
  evaluationContaminationCount?: number;
  categoryDistribution?: Record<string, number>;
  sourceDistribution?: Record<string, number>;
  syntheticCount?: number;
  syntheticRatioPercent?: number;
  lengthStats: {
    minChars: number;
    maxChars: number;
    meanChars: number;
    medianChars: number;
    p95Chars: number;
    p99Chars: number;
    minWords: number;
    maxWords: number;
    meanWords: number;
    medianWords: number;
    p95Words: number;
    p99Words: number;
  };
  invalidRecordCount: number;
  qualityClassification: {
    dataQuantity: string;
    dataDiversity: string;
    dataCleanliness: string;
    duplication: string;
    formatConsistency: string;
    evaluationContaminationRisk: string;
  };
  auditedAt: string;
}

export interface ZaqXTokenizerAuditReport {
  tokenizerVersion: string;
  tokenizerHash: string;
  vocabSize: number;
  unknownTokenCount: number;
  unknownTokenRatePercent: number;
  totalTokensAudited: number;
  trainTokens?: number;
  valTokens?: number;
  testTokens?: number;
  tokensPerChar?: number;
  tokensPerWord?: number;
  averageTokensPerSample: number;
  medianTokensPerSample: number;
  p50SeqLen: number;
  p95SeqLen: number;
  p99SeqLen: number;
  maxSeqLen: number;
  contextOverflowRatePercent: number;
  compressionRatio: number;
  specialTokensUsage: Record<string, number>;
  qualityDecision: 'DEVELOPMENT ONLY' | 'RESEARCH BASELINE' | 'SUITABLE FOR TRAINING';
  auditedAt: string;
}

export interface ZaqXQualitativeEvalResult {
  promptId: string;
  category: 'language' | 'factual' | 'instruction' | 'code' | 'context';
  prompt: string;
  expectedBehavior: string;
  untrainedOutput: string;
  trainedOutput: string;
  cycle01Output?: string;
  cycle02Output?: string;
  observedErrorsUntrained: ZaqXErrorTaxonomyTag[];
  observedErrorsTrained: ZaqXErrorTaxonomyTag[];
  observedErrorsCycle01?: ZaqXErrorTaxonomyTag[];
  observedErrorsCycle02?: ZaqXErrorTaxonomyTag[];
  qualitativeAssessment: string;
}

export interface ZaqXSaturationAnalysis {
  saturationClassification:
    | 'still_learning'
    | 'approaching_plateau'
    | 'plateau'
    | 'overfitting'
    | 'unstable'
    | 'insufficient_evidence';
  evidence: {
    trainingLossSlope: number;
    validationLossSlope: number;
    trainValGap: number;
    evaluationDeltaPercent: number;
    errorReductionCount: number;
  };
  researchAnswers: {
    q1_increasedCorpusHelped: boolean;
    q1_evidence: string;
    q2_increasedTokenExposureHelped: boolean;
    q2_evidence: string;
    q3_is54MStillLearning: boolean;
    q3_evidence: string;
    q4_isTokenizerLimiting: boolean;
    q4_evidence: string;
    q5_isCorpusLimiting: boolean;
    q5_evidence: string;
    q6_isScalingJustified: boolean;
    q6_evidence: string;
  };
  scalingGateDecision: {
    decision: 'proceed_scaling' | 'block_scaling';
    nextRecommendedStep:
      | 'continue 5.4M'
      | 'improve corpus'
      | 'improve tokenizer'
      | 'change training strategy'
      | 'test ~20–30M';
    rationale: string;
  };
}

export interface ZaqXCycleComparison {
  corpusRecords: { cycle01: number; cycle02: number; deltaPercent: number };
  trainingTokens: { cycle01: number; cycle02: number; factor: number };
  steps: { cycle01: number; cycle02: number };
  initialLoss: { cycle01: number; cycle02: number };
  finalLoss: { cycle01: number; cycle02: number; deltaPercent: number };
  bestValidationLoss: { cycle01: number; cycle02: number; deltaPercent: number };
  totalObservedErrors: { cycle01: number; cycle02: number; delta: number };
  throughputTokensPerSec: { cycle01: number; cycle02: number };
  comparisonSummary: string;
}

export interface ZaqXResearchCycleReport {
  cycleId: 'zaqx-r01' | 'zaqx-r02';
  hypothesis: string;
  experimentIdent: {
    experimentId: string;
    datasetVersionHash: string;
    tokenizerHash: string;
    modelConfigHash: string;
    trainingConfigHash: string;
    evaluationSuiteVersion: string;
  };
  corpusAudit: ZaqXCorpusAuditReport;
  tokenizerAudit: ZaqXTokenizerAuditReport;
  trainingTelemetry: {
    backend: string;
    pythonVersion: string;
    pytorchVersion: string;
    totalSteps: number;
    epochs?: number;
    tokensSeen?: number;
    effectiveBatchSize?: number;
    gradientAccumulation?: number;
    stoppingReason?: 'max_steps' | 'manual_stop' | 'resource_limit' | 'training_failure' | 'early_stop';
    initialLoss: number;
    finalLoss: number;
    bestValidationLoss?: number;
    validationLosses: Array<{ step: number; loss: number }>;
    stepLossHistory?: Array<{ step: number; loss: number; lr?: number; gradNorm?: number }>;
    trainingDurationMs: number;
    throughputTokensPerSec: number;
    samplesPerSec?: number;
    peakMemoryMb: number;
    convergenceStatus: 'learning' | 'unstable' | 'undertrained' | 'plateaued' | 'unknown';
  };
  checkpointSelection?: {
    policy: 'best_validation_loss' | 'lowest_training_loss' | 'final_step';
    bestStep: number;
    bestCheckpointPath: string;
    bestCheckpointHash: string;
    bestValidationLoss: number;
  };
  evaluationBaseline: {
    untrainedLoss: number;
    trainedLoss: number;
    untrainedAccuracyPercent: number;
    trainedAccuracyPercent: number;
    lossImprovementPercent: number;
  };
  qualitativeResults: ZaqXQualitativeEvalResult[];
  errorTaxonomySummary: Record<ZaqXErrorTaxonomyTag, number>;
  parityResult: {
    parityStatus: 'pass' | 'diverged';
    logitsMaxDiff: number;
  };
  statusSummary: {
    researchExperiment: 'PASS' | 'FAIL';
    training: 'PASS' | 'FAIL' | 'SKIPPED';
    evaluation: 'PASS' | 'FAIL';
    gguf: 'PASS' | 'SKIPPED' | 'BLOCKED';
    llamaCpp: 'PASS' | 'SKIPPED' | 'BLOCKED';
    nikitRuntime: 'PASS' | 'SKIPPED' | 'BLOCKED';
  };
  bottleneckAnalysis: {
    dominantLimitation:
      | 'data'
      | 'tokenizer'
      | 'architecture'
      | 'training duration'
      | 'optimization'
      | 'hardware'
      | 'context'
      | 'evaluation'
      | 'runtime'
      | 'unknown';
    evidence: string;
    interpretation: string;
  };
  saturationAnalysis?: ZaqXSaturationAnalysis;
  cycleComparison?: ZaqXCycleComparison;
  nextScaleRecommendation: {
    recommendedNextStep:
      | 'continue 5.4M'
      | 'improve dataset'
      | 'improve corpus'
      | 'improve tokenizer'
      | 'change training strategy'
      | 'test ~20–30M'
      | 'test different architecture';
    rationale: string;
  };
  createdAt: string;
}








