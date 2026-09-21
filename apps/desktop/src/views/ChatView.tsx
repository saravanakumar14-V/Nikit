import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Sparkles, MessageSquare, Folder } from 'lucide-react';
import { Badge } from '@nikit/ui';
import { SuggestionCards } from '../components/chat/SuggestionCards';
import { MessageItem } from '../components/chat/MessageItem';
import { Composer } from '../components/chat/Composer';
import { ScrollToLatest } from '../components/chat/ScrollToLatest';
import { useConversation } from '../state/ConversationContext';
import { useApp } from '../state/AppContext';
import { useProject } from '../state/ProjectContext';
import { parseContentToParts } from '../services/messageParser';
import { Message, AttachmentReference } from '@nikit/types';
import { ContextInspectorModal } from '../components/chat/ContextInspectorModal';
import { ToolConfiguration } from '../services/context';
import { derivePlatformStatus } from '../services/runtime/runtimeStatusResolver';
import styles from './ChatView.module.css';

export const ChatView: React.FC = () => {
  const { preferences, workspace, activeModel, runtimeInfo } = useApp();
  const { projects } = useProject();
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const {
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
  } = useConversation();

  const platformStatus = useMemo(() => {
    return derivePlatformStatus({
      runtimeInfo,
      activeModel,
    });
  }, [runtimeInfo, activeModel]);

  const activeProject = conversation?.projectId
    ? projects.find((p) => p.id === conversation.projectId)
    : null;

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Auto-scroll handler
  const checkIfNearBottom = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const threshold = 140;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distanceToBottom <= threshold);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setIsNearBottom(true);
  }, []);

  // Follow stream output when user is near the bottom
  useEffect(() => {
    if (isNearBottom && preferences.autoScroll) {
      scrollToBottom(false);
    }
  }, [messages, streamingText, isNearBottom, preferences.autoScroll, scrollToBottom]);

  // Handle scroll events on viewport
  const handleScroll = () => {
    checkIfNearBottom();
  };

  const handleSend = (
    attachments?: AttachmentReference[],
    toolConfig?: ToolConfiguration
  ) => {
    if (
      (draft.trim() || (attachments && attachments.length > 0)) &&
      !generationState.isStreaming
    ) {
      sendMessage(draft.trim(), attachments, toolConfig);
    }
  };

  const handleSelectSuggestion = (prompt: string) => {
    sendMessage(prompt);
  };

  // Construct transient streaming message for assistant output
  const activeStreamingMessage: Message | null = useMemo(() => {
    if (!generationState.isStreaming || streamingText === null) return null;
    return {
      id: generationState.activeMessageId || 'msg-streaming',
      conversationId: conversation?.id || 'temp',
      role: 'assistant',
      parts: parseContentToParts(streamingText),
      status: 'generating',
      modelId: workspace.activeModelId,
      modelName: workspace.activeModelName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    generationState.isStreaming,
    generationState.activeMessageId,
    streamingText,
    conversation?.id,
    workspace.activeModelId,
    workspace.activeModelName,
  ]);

  const hasMessages = messages.length > 0 || activeStreamingMessage !== null;

  return (
    <div className={styles.chatViewContainer}>
      {/* Top Status & Context Bar */}
      <div className={styles.topStatusBar}>
        <div className={styles.statusLeft}>
          <MessageSquare size={13} style={{ color: 'var(--nikit-accent-base)' }} />
          <span className={styles.convTitleText}>
            {conversation?.title || 'New Conversation'}
          </span>
          {activeProject && (
            <Badge variant="accent" size="sm">
              <Folder size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              {activeProject.name}
            </Badge>
          )}
          <Badge
            variant={
              platformStatus.runtimeStatus === 'ONLINE'
                ? 'local'
                : platformStatus.runtimeStatus === 'STANDBY'
                ? 'default'
                : 'accent'
            }
            size="sm"
          >
            {platformStatus.runtimeStatusLabel}
          </Badge>
        </div>

        <div className={styles.statusRight}>
          <span>
            Model: <strong style={{ color: 'var(--nikit-text-primary)' }}>{workspace.activeModelName}</strong>
          </span>
          <span>·</span>
          <span
            onClick={() => setIsInspectorOpen(true)}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            title="Open Structured Context Inspector"
          >
            Context: {contextSnapshot.isCalculated && contextSnapshot.totalTokens ? `${contextSnapshot.totalTokens} tok` : 'Inspect'}
          </span>
        </div>
      </div>

      {/* Main Scrollable Viewport */}
      <div
        ref={scrollAreaRef}
        className={styles.chatScrollArea}
        onScroll={handleScroll}
      >
        {/* Welcome / Empty Greeting Section */}
        {!hasMessages && (
          <div className={styles.greetingSection}>
            <div className={styles.greetingBadge}>
              <Sparkles size={13} />
              <span>{workspace.activeModelName} · Intelligence Architecture</span>
            </div>
            <h1 className={styles.greetingTitle}>What can I help you build?</h1>
            <p className={styles.greetingSubtitle}>
              Ask architectural questions, generate low-rank tensor code, inspect attention weights, or draft technical specifications.
            </p>
            <SuggestionCards onSelect={handleSelectSuggestion} />
          </div>
        )}

        {/* Message Thread */}
        {hasMessages && (
          <div className={styles.threadContainer}>
            {messages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                onRegenerate={msg.role === 'assistant' ? () => regenerate(msg.id) : undefined}
                onEdit={msg.role === 'user' ? (newText) => editMessage(msg.id, newText) : undefined}
              />
            ))}

            {/* Active streaming assistant message */}
            {activeStreamingMessage && (
              <MessageItem
                key={activeStreamingMessage.id}
                message={activeStreamingMessage}
                isStreaming
              />
            )}
          </div>
        )}
      </div>

      {/* Floating Scroll to Latest Button */}
      {!isNearBottom && hasMessages && (
        <ScrollToLatest
          onClick={() => scrollToBottom(true)}
          hasUnread={generationState.isStreaming}
        />
      )}

      {/* Real-Time Composer Dock */}
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSend}
        onStop={stopGeneration}
        isStreaming={generationState.isStreaming}
      />

      {/* Developer Mode Context Inspector Modal */}
      <ContextInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </div>
  );
};
