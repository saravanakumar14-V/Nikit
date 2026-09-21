import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import {
  Conversation,
  Message,
  GenerationState,
  ContextSnapshot,
  AttachmentReference,
  MessageError,
  MessagePart,
} from '@nikit/types';
import { conversationStore } from '../services/storage';
import { modelService } from '../services/models';
import { contextService, ToolConfiguration } from '../services/context';
import { parseContentToParts, partsToPlainText } from '../services/messageParser';
import { useApp } from './AppContext';

export interface ConversationContextValue {
  conversation: Conversation | null;
  messages: Message[];
  generationState: GenerationState;
  draft: string;
  streamingText: string | null;
  contextSnapshot: ContextSnapshot;
  sendMessage: (
    content: string,
    attachments?: AttachmentReference[],
    toolConfig?: ToolConfiguration
  ) => Promise<void>;
  stopGeneration: () => void;
  regenerate: (messageId?: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  setDraft: (draft: string) => void;
  reloadActiveConversation: () => Promise<void>;
}

const DEFAULT_GENERATION_STATE: GenerationState = {
  status: 'idle',
  activeMessageId: null,
  error: null,
  isStreaming: false,
};

const DEFAULT_CONTEXT_SNAPSHOT: ContextSnapshot = {
  modelTokens: null,
  systemTokens: null,
  projectTokens: null,
  memoryTokens: null,
  conversationTokens: null,
  fileTokens: null,
  toolTokens: null,
  userTokens: null,
  totalTokens: null,
  contextLimit: null,
  remainingTokens: null,
  isCalculated: false,
};

const ConversationContext = createContext<ConversationContextValue | undefined>(undefined);

export interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const { activeConversationId, workspace } = useApp();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraftState] = useState<string>('');
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<GenerationState>(DEFAULT_GENERATION_STATE);
  const [contextSnapshot, setContextSnapshot] = useState<ContextSnapshot>(DEFAULT_CONTEXT_SNAPSHOT);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentStreamMessageIdRef = useRef<string | null>(null);

  // 1. Load active conversation when activeConversationId changes
  useEffect(() => {
    let isCancelled = false;

    // Abort any ongoing stream from previous chat
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamingText(null);
    setGenerationState(DEFAULT_GENERATION_STATE);

    if (!activeConversationId) {
      setConversation(null);
      setMessages([]);
      setDraftState('');
      return;
    }

    async function load() {
      const conv = await conversationStore.get(activeConversationId!);
      if (isCancelled) return;

      if (conv) {
        setConversation(conv);
        setMessages(conv.messages || []);
        setContextSnapshot(conv.contextSnapshot || DEFAULT_CONTEXT_SNAPSHOT);

        const savedDraft = await conversationStore.getDraft(conv.id);
        if (!isCancelled) {
          setDraftState(savedDraft || conv.draft || '');
        }
      } else {
        setConversation(null);
        setMessages([]);
        setDraftState('');
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, [activeConversationId]);

  // 2. Draft change handler with debounced store sync
  const setDraft = useCallback(
    (newDraft: string) => {
      setDraftState(newDraft);
      if (activeConversationId) {
        conversationStore.saveDraft(activeConversationId, newDraft);
      }
    },
    [activeConversationId]
  );

  const reloadActiveConversation = useCallback(async () => {
    if (!activeConversationId) return;
    const conv = await conversationStore.get(activeConversationId);
    if (conv) {
      setConversation(conv);
      setMessages(conv.messages || []);
      setContextSnapshot(conv.contextSnapshot || DEFAULT_CONTEXT_SNAPSHOT);
    }
  }, [activeConversationId]);

  // 3. Stop active generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGenerationState((prev) => ({
      ...prev,
      status: 'cancelled',
      isStreaming: false,
    }));
  }, []);

  // 4. Stream executor helper
  const executeGeneration = useCallback(
    async (
      targetConversationId: string,
      currentMessages: Message[],
      assistantMessageId: string,
      modelId: string,
      attachments?: AttachmentReference[],
      toolConfig?: ToolConfiguration
    ) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      currentStreamMessageIdRef.current = assistantMessageId;

      setGenerationState({
        status: 'generating',
        activeMessageId: assistantMessageId,
        error: null,
        isStreaming: true,
      });
      let accumulatedContent = '';

      try {
        const resolution = await modelService.resolveModel({
          conversationId: targetConversationId,
          projectId: conversation?.projectId,
          explicitModelId: modelId,
          requiredCapability: 'streaming',
          workspaceDefaultModelId: workspace.activeModelId,
        });

        // 1. Prepare structured context (User Memory, Project Memory, Instructions, Retrieval, Budgeting)
        const lastUserMsg = [...currentMessages].reverse().find((m) => m.role === 'user');
        const userPrompt = lastUserMsg ? partsToPlainText(lastUserMsg.parts) : undefined;

        const preparedContext = await contextService.prepare({
          conversationId: targetConversationId,
          projectId: conversation?.projectId,
          userPrompt,
          workspaceModelId: workspace.activeModelId,
          workspaceModelName: workspace.activeModelName,
          attachments,
          toolConfig,
          modelContextLimit: resolution.model.contextLength || null,
          conversationOverride: conversation,
        });

        setContextSnapshot(preparedContext.snapshot);

        const provider = modelService.getProvider(resolution.providerId);
        if (!provider) {
          throw new Error(`Provider "${resolution.providerId}" is unavailable.`);
        }

        const stream = provider.generate({
          conversationId: targetConversationId,
          messages: currentMessages,
          modelId: resolution.model.id,
          abortSignal: abortController.signal,
        });

        for await (const event of stream) {
          if (abortController.signal.aborted) {
            break;
          }

          switch (event.type) {
            case 'started':
              setGenerationState((prev) => ({ ...prev, status: 'generating' }));
              break;

            case 'delta':
              accumulatedContent += event.textDelta;
              setStreamingText(accumulatedContent);
              break;

            case 'completed': {
              const finalParts = parseContentToParts(accumulatedContent || event.finalContent || '');
              const completedMessage: Message = {
                id: assistantMessageId,
                conversationId: targetConversationId,
                role: 'assistant',
                parts: finalParts,
                status: 'completed',
                modelId,
                modelName: workspace.activeModelName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                telemetry: event.telemetry || { isPrototypeData: true },
              };

              // Persist completed message and context snapshot to store
              await conversationStore.appendMessage(targetConversationId, completedMessage);
              await conversationStore.update(targetConversationId, {
                contextSnapshot: preparedContext.snapshot,
              });
              const updatedConv = await conversationStore.get(targetConversationId);
              if (updatedConv) {
                setConversation(updatedConv);
                setMessages(updatedConv.messages);
                setContextSnapshot(updatedConv.contextSnapshot || preparedContext.snapshot);
              }

              setStreamingText(null);
              setGenerationState({
                status: 'completed',
                activeMessageId: null,
                error: null,
                isStreaming: false,
              });
              abortControllerRef.current = null;
              currentStreamMessageIdRef.current = null;
              return;
            }

            case 'cancelled': {
              const partialParts = parseContentToParts(event.partialContent || accumulatedContent);
              const cancelledMessage: Message = {
                id: assistantMessageId,
                conversationId: targetConversationId,
                role: 'assistant',
                parts: partialParts.length > 0 ? partialParts : [{ type: 'text', content: 'Generation stopped.' }],
                status: 'cancelled',
                modelId,
                modelName: workspace.activeModelName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                telemetry: { isPrototypeData: true },
              };

              await conversationStore.appendMessage(targetConversationId, cancelledMessage);
              const updatedConv = await conversationStore.get(targetConversationId);
              if (updatedConv) {
                setConversation(updatedConv);
                setMessages(updatedConv.messages);
              }

              setStreamingText(null);
              setGenerationState({
                status: 'cancelled',
                activeMessageId: null,
                error: null,
                isStreaming: false,
              });
              abortControllerRef.current = null;
              currentStreamMessageIdRef.current = null;
              return;
            }

            case 'error': {
              const errParts = parseContentToParts(accumulatedContent);
              const errorMessage: Message = {
                id: assistantMessageId,
                conversationId: targetConversationId,
                role: 'assistant',
                parts: errParts.length > 0 ? errParts : [{ type: 'text', content: 'An error occurred during response generation.' }],
                status: 'error',
                modelId,
                modelName: workspace.activeModelName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                error: event.error,
              };

              await conversationStore.appendMessage(targetConversationId, errorMessage);
              const updatedConv = await conversationStore.get(targetConversationId);
              if (updatedConv) {
                setConversation(updatedConv);
                setMessages(updatedConv.messages);
              }

              setStreamingText(null);
              setGenerationState({
                status: 'error',
                activeMessageId: null,
                error: event.error,
                isStreaming: false,
              });
              abortControllerRef.current = null;
              currentStreamMessageIdRef.current = null;
              return;
            }
          }
        }

        // If loop finished without completed event (e.g. aborted)
        if (abortController.signal.aborted) {
          const partialParts = parseContentToParts(accumulatedContent);
          const cancelledMessage: Message = {
            id: assistantMessageId,
            conversationId: targetConversationId,
            role: 'assistant',
            parts: partialParts.length > 0 ? partialParts : [{ type: 'text', content: 'Generation stopped.' }],
            status: 'cancelled',
            modelId,
            modelName: workspace.activeModelName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            telemetry: { isPrototypeData: true },
          };

          await conversationStore.appendMessage(targetConversationId, cancelledMessage);
          const updatedConv = await conversationStore.get(targetConversationId);
          if (updatedConv) {
            setConversation(updatedConv);
            setMessages(updatedConv.messages);
          }

          setStreamingText(null);
          setGenerationState({
            status: 'cancelled',
            activeMessageId: null,
            error: null,
            isStreaming: false,
          });
        }
      } catch (err: unknown) {
        const errorObj: MessageError = {
          message: err instanceof Error ? err.message : 'Unknown generation stream fault',
          code: 'ERR_STREAM_EXCEPTION',
          details: String(err),
          retryable: true,
        };

        const partialParts = parseContentToParts(accumulatedContent);
        const errorMessage: Message = {
          id: assistantMessageId,
          conversationId: targetConversationId,
          role: 'assistant',
          parts: partialParts.length > 0 ? partialParts : [{ type: 'text', content: errorObj.message }],
          status: 'error',
          modelId,
          modelName: workspace.activeModelName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          error: errorObj,
        };

        await conversationStore.appendMessage(targetConversationId, errorMessage);
        const updatedConv = await conversationStore.get(targetConversationId);
        if (updatedConv) {
          setConversation(updatedConv);
          setMessages(updatedConv.messages);
        }

        setStreamingText(null);
        setGenerationState({
          status: 'error',
          activeMessageId: null,
          error: errorObj,
          isStreaming: false,
        });
      } finally {
        abortControllerRef.current = null;
        currentStreamMessageIdRef.current = null;
      }
    },
    [workspace.activeModelName]
  );

  // 5. Send message
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: AttachmentReference[],
      toolConfig?: ToolConfiguration
    ) => {
      if (!content.trim() || generationState.isStreaming) return;

      let convId = activeConversationId;
      let targetConv = conversation;

      // If no active conversation, create one
      if (!convId || !targetConv) {
        targetConv = await conversationStore.create({
          modelId: workspace.activeModelId,
          modelName: workspace.activeModelName,
        });
        convId = targetConv.id;
        setConversation(targetConv);
      }

      const userMessageId = `msg-user-${Date.now()}`;
      const assistantMessageId = `msg-asst-${Date.now()}`;

      const userParts: MessagePart[] = [{ type: 'text', content: content.trim() }];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.type === 'code') {
            userParts.push({
              type: 'code',
              content: att.content || '',
              language: att.mimeType || 'text',
              filename: att.name,
            });
          } else {
            userParts.push({
              type: 'file',
              name: att.name,
              sizeBytes: att.sizeBytes,
              mimeType: att.mimeType,
              path: att.path,
            });
          }
        }
      }

      const userMessage: Message = {
        id: userMessageId,
        conversationId: convId,
        role: 'user',
        parts: userParts,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Clear draft on send
      setDraftState('');
      await conversationStore.saveDraft(convId, '');

      // Append user message immediately
      await conversationStore.appendMessage(convId, userMessage);
      const updatedConv = await conversationStore.get(convId);
      const updatedMessages = updatedConv ? updatedConv.messages : [...messages, userMessage];

      setConversation(updatedConv);
      setMessages(updatedMessages);

      // Trigger streaming generation
      await executeGeneration(
        convId,
        updatedMessages,
        assistantMessageId,
        workspace.activeModelId,
        attachments,
        toolConfig
      );
    },
    [
      activeConversationId,
      conversation,
      generationState.isStreaming,
      messages,
      workspace.activeModelId,
      workspace.activeModelName,
      executeGeneration,
    ]
  );

  // 6. Regenerate response
  const regenerate = useCallback(
    async (messageId?: string) => {
      if (!activeConversationId || generationState.isStreaming) return;

      let conv = await conversationStore.get(activeConversationId);
      if (!conv || conv.messages.length === 0) return;

      let targetIdx = conv.messages.length - 1;
      if (messageId) {
        const found = conv.messages.findIndex((m) => m.id === messageId);
        if (found !== -1) targetIdx = found;
      }

      // If targeting an assistant message, we truncate everything at and after it
      // If targeting a user message, we truncate after it
      const targetMsg = conv.messages[targetIdx];
      let truncateAtId = targetMsg.id;

      if (targetMsg.role === 'assistant') {
        const prevIdx = targetIdx - 1;
        if (prevIdx >= 0 && conv.messages[prevIdx].role === 'user') {
          truncateAtId = conv.messages[prevIdx].id;
        }
      }

      // Truncate downstream messages
      conv = await conversationStore.truncateDownstreamMessages(activeConversationId, truncateAtId);
      setConversation(conv);
      setMessages(conv.messages);

      const assistantMessageId = `msg-asst-${Date.now()}`;
      await executeGeneration(
        activeConversationId,
        conv.messages,
        assistantMessageId,
        conv.modelId || workspace.activeModelId
      );
    },
    [activeConversationId, generationState.isStreaming, workspace.activeModelId, executeGeneration]
  );

  // 7. Edit previous user message
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeConversationId || !newContent.trim() || generationState.isStreaming) return;

      // 1. Truncate downstream messages after targetMessageId
      let conv = await conversationStore.truncateDownstreamMessages(
        activeConversationId,
        messageId
      );

      // 2. Update the target message content
      const updatedParts = parseContentToParts(newContent.trim());
      conv = await conversationStore.updateMessage(activeConversationId, messageId, {
        parts: updatedParts,
        updatedAt: new Date().toISOString(),
      });

      setConversation(conv);
      setMessages(conv.messages);

      // 3. Trigger new assistant generation branch
      const assistantMessageId = `msg-asst-${Date.now()}`;
      await executeGeneration(
        activeConversationId,
        conv.messages,
        assistantMessageId,
        conv.modelId || workspace.activeModelId
      );
    },
    [activeConversationId, generationState.isStreaming, workspace.activeModelId, executeGeneration]
  );

  const value: ConversationContextValue = {
    conversation,
    messages,
    generationState,
    draft,
    streamingText,
    contextSnapshot,
    sendMessage,
    stopGeneration,
    regenerate,
    editMessage,
    setDraft,
    reloadActiveConversation,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = (): ConversationContextValue => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

// Export helper for converting parts to string
export { partsToPlainText };
