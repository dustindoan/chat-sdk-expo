/**
 * ChatUI - Pre-styled, dark-themed chat interface
 * Adapted from expo-gen-ui to work with @ai-sdk/react useChat hook
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { useChat, type UIMessage, type ChatTransport } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors } from './theme';
import { MessageList, MessageInput, ModelSelector } from './chat';
import type { VoteMap, MessageInputHandle } from './chat/types';
import { useToast } from './toast';
import { useClipboard } from '../hooks/useClipboard';
import { useAttachments } from '../hooks/useAttachments';
import { DEFAULT_MODEL_ID, getModelById, getModelName, modelSupportsReasoning } from '../lib/ai/models';
import { useArtifact } from '../contexts/ArtifactContext';
import { getAuthCookie, authFetchWithRetry } from '../lib/auth/client';
import { useAuth } from '../contexts/AuthContext';
import { generateAPIUrl } from '../utils';
import { useLocalLLM } from '../contexts/LocalLLMContext';
import { LocalChatTransport } from '../lib/local-llm';

// Generate a random UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ChatUIProps {
  /** Chat ID (optional - generates new ID if not provided) */
  chatId?: string;
  /** Initial messages to load */
  initialMessages?: UIMessage[];
  /** API endpoint for chat */
  api: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Welcome message when no messages */
  welcomeMessage?: string;
  /** Welcome subtitle */
  welcomeSubtitle?: string;
  /** Callback when chat ID is created/changed */
  onChatIdChange?: (chatId: string) => void;
  /** Callback when the first message is sent (chat is created in DB) */
  onChatCreated?: (chatId: string) => void;
  /** Callback when a new chat should be started (e.g., model type changed), receives the new model ID */
  onRequestNewChat?: (modelId: string) => void;
  /** Initial model ID to use (e.g., when switching to local model) */
  initialModelId?: string;
}

export function ChatUI({
  chatId: initialChatId,
  initialMessages = [],
  api,
  placeholder = 'Send a message...',
  welcomeMessage = 'Hello there!',
  welcomeSubtitle = 'How can I help you today?',
  onChatIdChange,
  onChatCreated,
  onRequestNewChat,
  initialModelId,
}: ChatUIProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { showToast } = useToast();
  const { copyToClipboard } = useClipboard();
  const { processStreamPart, openFirstDocument } = useArtifact();
  const { refreshSession } = useAuth();
  const { model: localModel, isPrepared: isLocalModelPrepared } = useLocalLLM();

  // File attachments
  const {
    attachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    toFileParts,
  } = useAttachments();

  // Chat ID - generate one if not provided
  const [currentChatId] = useState(() => initialChatId || generateUUID());
  const currentChatIdRef = useRef(currentChatId);

  // Vote state - map of messageId to vote state
  const [votes, setVotes] = useState<VoteMap>({});

  // Model selection state - use initialModelId if provided
  const [selectedModelId, setSelectedModelId] = useState(initialModelId || DEFAULT_MODEL_ID);
  const selectedModelIdRef = useRef(selectedModelId);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Reasoning toggle state (extended thinking)
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const reasoningEnabledRef = useRef(reasoningEnabled);

  // Check if current model supports reasoning
  const supportsReasoning = modelSupportsReasoning(selectedModelId);

  // Track if we've notified about chat creation
  const hasNotifiedCreationRef = useRef(false);

  // Ref to MessageInput for clearing (handles iOS autocorrect race condition)
  const messageInputRef = useRef<MessageInputHandle>(null);

  // Keep refs in sync
  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

  useEffect(() => {
    reasoningEnabledRef.current = reasoningEnabled;
  }, [reasoningEnabled]);

  // Reset reasoning toggle when switching to a model that doesn't support it
  useEffect(() => {
    if (!supportsReasoning && reasoningEnabled) {
      setReasoningEnabled(false);
    }
  }, [supportsReasoning, reasoningEnabled]);

  // Notify parent of chat ID
  useEffect(() => {
    onChatIdChange?.(currentChatId);
  }, [currentChatId, onChatIdChange]);

  // Fetch votes when loading an existing chat
  useEffect(() => {
    if (initialChatId && initialMessages.length > 0) {
      authFetchWithRetry(`/api/vote?chatId=${initialChatId}`, {}, refreshSession)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const voteMap: VoteMap = {};
            data.forEach((v: { messageId: string; isUpvoted: boolean }) => {
              voteMap[v.messageId] = v.isUpvoted ? 'up' : 'down';
            });
            setVotes(voteMap);
          }
        })
        .catch((err) => console.error('Error fetching votes:', err));
    }
  }, [initialChatId, initialMessages.length, refreshSession]);

  // Set body background color on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.background.primary;
      document.documentElement.style.backgroundColor = colors.background.primary;
    }
  }, []);

  // Local state for input (works better with RN TextInput than useChat's input)
  const [localInput, setLocalInput] = useState('');

  // Wrapper for transport fetch that uses expo/fetch with auth and 401 retry
  const transportFetch = useCallback(async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const urlString = typeof url === 'string' ? url : url.toString();
    const cookie = await getAuthCookie();

    const makeRequest = () => expoFetch(urlString, {
      ...options,
      credentials: Platform.OS === 'web' ? 'include' : 'omit',
      headers: {
        ...options?.headers,
        ...(cookie ? { Cookie: cookie } : {}),
      },
    } as RequestInit);

    const response = await makeRequest();

    // If unauthorized, refresh session and retry once
    if (response.status === 401) {
      await refreshSession();
      return makeRequest();
    }

    return response;
  }, [refreshSession]);

  // Check if selected model is local and ready
  const selectedModel = getModelById(selectedModelId);
  const isUsingLocalModel = !!(selectedModel?.isLocal && isLocalModelPrepared && localModel);

  // Debug logging
  console.log('[ChatUI] Model state:', {
    selectedModelId,
    isLocal: selectedModel?.isLocal,
    isLocalModelPrepared,
    hasLocalModel: !!localModel,
    isUsingLocalModel,
  });

  // Create transport based on model type
  // Dependencies include selectedModelId to ensure transport updates when model changes
  const transport: ChatTransport = useMemo(() => {
    console.log('[ChatUI] Creating transport:', { isUsingLocalModel, selectedModelId, isLocalModelPrepared, hasLocalModel: !!localModel });

    if (isUsingLocalModel && localModel) {
      console.log('[ChatUI] Using LocalChatTransport');
      return new LocalChatTransport(localModel);
    }

    console.log('[ChatUI] Using DefaultChatTransport');
    return new DefaultChatTransport({
      api,
      fetch: transportFetch,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);

        // Check if this is a tool approval continuation flow
        // (when the last message is not from user or contains approval-responded states)
        const isToolApprovalContinuation =
          lastMessage?.role !== 'user' ||
          request.messages.some((msg) =>
            msg.parts?.some((part: any) => {
              const state = part.state;
              return state === 'approval-responded' || state === 'output-denied';
            })
          );

        return {
          body: {
            id: currentChatIdRef.current,
            // For approval flows, send all messages; otherwise just the new message
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            model: selectedModelIdRef.current,
            reasoning: reasoningEnabledRef.current,
            ...request.body,
          },
        };
      },
    });
  }, [isUsingLocalModel, localModel, api, transportFetch, selectedModelId, isLocalModelPrepared]);

  // Chat state using @ai-sdk/react
  const { messages, sendMessage, setMessages, regenerate, status, error, stop, addToolApprovalResponse } = useChat({
    id: currentChatId,
    messages: initialMessages,
    generateId: generateUUID,
    transport,
    // Auto-send when user approves a tool
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      const shouldContinue =
        lastMessage?.parts?.some(
          (part: any) =>
            part.state === 'approval-responded' &&
            part.approval?.approved === true
        ) ?? false;
      return shouldContinue;
    },
    // Process artifact stream parts
    onData: (dataPart) => {
      processStreamPart(dataPart);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Track previous status to detect when streaming ends
  const prevStatusRef = useRef(status);
  useEffect(() => {
    // When status changes from streaming to ready, auto-open first document
    if (prevStatusRef.current === 'streaming' && status === 'ready') {
      openFirstDocument();
    }
    prevStatusRef.current = status;
  }, [status, openFirstDocument]);

  const handleSend = useCallback(() => {
    const textToSend = localInput?.trim();
    const hasText = !!textToSend;
    const hasAttachments = attachments.length > 0;

    if ((hasText || hasAttachments) && !isLoading) {
      // If this is a new chat (no initial messages and first send), notify parent
      const isNewChat = initialMessages.length === 0 && messages.length === 0;

      // Build message parts
      const fileParts = toFileParts();
      const parts: any[] = [...fileParts];

      if (hasText) {
        parts.push({ type: 'text', text: textToSend });
      }

      // Clear input and attachments BEFORE sending to avoid race conditions
      // Use the ref's clear() method to properly dismiss iOS autocorrect
      messageInputRef.current?.clear();
      clearAttachments();

      // Send message with parts
      console.log('[ChatUI] Sending message with transport:', { isUsingLocalModel, selectedModelId });
      sendMessage({
        role: 'user',
        parts,
      });

      // Notify about chat creation after a delay (to ensure it's saved)
      if (isNewChat && !hasNotifiedCreationRef.current && onChatCreated) {
        hasNotifiedCreationRef.current = true;
        setTimeout(() => {
          onChatCreated(currentChatId);
        }, 1000);
      }
    }
  }, [
    localInput,
    attachments,
    isLoading,
    sendMessage,
    toFileParts,
    clearAttachments,
    initialMessages.length,
    messages.length,
    onChatCreated,
    currentChatId,
  ]);

  const handleCopy = useCallback(
    async (text: string) => {
      const success = await copyToClipboard(text);
      if (success) {
        showToast('Copied to clipboard', 'success');
      } else {
        showToast('Failed to copy', 'error');
      }
    },
    [copyToClipboard, showToast]
  );

  const handleStopStreaming = useCallback(() => {
    stop();
    showToast('Stopped generating', 'info');
  }, [stop, showToast]);

  const handleModelSelect = useCallback(() => {
    setIsModelSelectorOpen(true);
  }, []);

  const handleModelChange = useCallback((modelId: string) => {
    const newModel = getModelById(modelId);
    const currentModel = getModelById(selectedModelId);
    const isCurrentLocal = currentModel?.isLocal;
    const isNewLocal = newModel?.isLocal;

    // If switching between local and cloud models, request a new chat
    // This is needed because the transport is different and AI SDK caches it
    if (isCurrentLocal !== isNewLocal && onRequestNewChat) {
      // Pass the new model ID so the new chat can start with it selected
      onRequestNewChat(modelId);
      return; // Don't set state here - the new chat will start with the new model
    }

    setSelectedModelId(modelId);
  }, [selectedModelId, onRequestNewChat]);

  const handleModelSelectorClose = useCallback(() => {
    setIsModelSelectorOpen(false);
  }, []);

  const handleToggleReasoning = useCallback(() => {
    setReasoningEnabled((prev) => !prev);
  }, []);

  // Handle editing a user message
  const handleEdit = useCallback(
    async (messageId: string, newContent: string) => {
      if (isLoading) return;

      try {
        // 1. Delete trailing messages from database
        const response = await authFetchWithRetry(
          `/api/messages/${messageId}`,
          { method: 'DELETE' },
          refreshSession
        );

        if (!response.ok) {
          throw new Error('Failed to delete trailing messages');
        }

        // 2. Update client state: keep messages up to (but not including) the edited one,
        // then add the edited message with new content
        setMessages((currentMessages) => {
          const index = currentMessages.findIndex((m) => m.id === messageId);
          if (index === -1) return currentMessages;

          const editedMessage: UIMessage = {
            ...currentMessages[index],
            parts: [{ type: 'text', text: newContent }],
          };

          return [...currentMessages.slice(0, index), editedMessage];
        });

        // 3. Regenerate response from the edited message
        // Small delay to ensure state is updated
        setTimeout(() => {
          regenerate();
        }, 100);
      } catch (err) {
        console.error('Error editing message:', err);
        showToast('Failed to edit message', 'error');
      }
    },
    [isLoading, setMessages, regenerate, showToast]
  );

  // Handle tool approval response
  const handleApprovalResponse = useCallback(
    (response: { id: string; approved: boolean; reason?: string }) => {
      addToolApprovalResponse(response);
    },
    [addToolApprovalResponse]
  );

  // Handle voting on a message
  const handleVote = useCallback(
    async (messageId: string, type: 'up' | 'down') => {
      // Optimistic update
      setVotes((prev) => ({
        ...prev,
        [messageId]: type,
      }));

      try {
        const response = await authFetchWithRetry(
          '/api/vote',
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: currentChatId,
              messageId,
              type,
            }),
          },
          refreshSession
        );

        if (!response.ok) {
          throw new Error('Failed to record vote');
        }
      } catch (err) {
        console.error('Error recording vote:', err);
        // Revert optimistic update on error
        setVotes((prev) => {
          const newVotes = { ...prev };
          delete newVotes[messageId];
          return newVotes;
        });
        showToast('Failed to record vote', 'error');
      }
    },
    [currentChatId, showToast]
  );

  // Handle regenerating an assistant response
  const handleRegenerate = useCallback(
    async (messageId: string) => {
      if (isLoading) return;

      try {
        // Find the message to regenerate
        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) return;

        // For assistant messages, we want to regenerate from the previous user message
        // Find the user message before this assistant message
        let userMessageIndex = messageIndex - 1;
        while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
          userMessageIndex--;
        }

        if (userMessageIndex < 0) {
          showToast('No user message to regenerate from', 'error');
          return;
        }

        const userMessage = messages[userMessageIndex];

        // 1. Delete the assistant message and all following messages from database
        const response = await authFetchWithRetry(
          `/api/messages/${messageId}`,
          { method: 'DELETE' },
          refreshSession
        );

        if (!response.ok) {
          throw new Error('Failed to delete messages');
        }

        // 2. Update client state: keep messages up to and including the user message
        setMessages((currentMessages) => {
          return currentMessages.slice(0, userMessageIndex + 1);
        });

        // 3. Regenerate response
        setTimeout(() => {
          regenerate();
        }, 100);
      } catch (err) {
        console.error('Error regenerating response:', err);
        showToast('Failed to regenerate response', 'error');
      }
    },
    [isLoading, messages, setMessages, regenerate, showToast]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 56 + insets.top}
    >
      <View style={styles.mainContent}>
        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          welcomeTitle={welcomeMessage}
          welcomeSubtitle={welcomeSubtitle}
          onCopy={handleCopy}
          onStopStreaming={handleStopStreaming}
          onEdit={handleEdit}
          onRegenerate={handleRegenerate}
          onApprovalResponse={handleApprovalResponse}
          votes={votes}
          onVote={handleVote}
        />

        <MessageInput
          ref={messageInputRef}
          value={localInput}
          onChangeText={setLocalInput}
          onSend={handleSend}
          onStop={handleStopStreaming}
          placeholder={placeholder}
          isLoading={isLoading}
          selectedModel={getModelName(selectedModelId)}
          onModelSelect={handleModelSelect}
          attachments={attachments}
          onAddAttachment={addAttachment}
          onRemoveAttachment={removeAttachment}
          reasoningEnabled={reasoningEnabled}
          onToggleReasoning={handleToggleReasoning}
          supportsReasoning={supportsReasoning}
        />
      </View>

      <ModelSelector
        selectedModelId={selectedModelId}
        onSelectModel={handleModelChange}
        isOpen={isModelSelectorOpen}
        onClose={handleModelSelectorClose}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
  } as ViewStyle,
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
});

ChatUI.displayName = 'ChatUI';
