/**
 * ChatUI - Pre-styled, dark-themed chat interface
 * Adapted from expo-gen-ui to work with @ai-sdk/react useChat hook
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors } from './theme';
import { MessageList, MessageInput, ModelSelector } from './chat';
import { useToast } from './toast';
import { useClipboard } from '../hooks/useClipboard';
import { useAttachments } from '../hooks/useAttachments';
import { chatModels, DEFAULT_MODEL_ID, getModelName, modelSupportsReasoning } from '../lib/ai/models';
import { useArtifact } from '../contexts/ArtifactContext';

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
}: ChatUIProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { showToast } = useToast();
  const { copyToClipboard } = useClipboard();
  const { processStreamPart, openFirstDocument } = useArtifact();

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

  // Model selection state
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const selectedModelIdRef = useRef(selectedModelId);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Reasoning toggle state (extended thinking)
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const reasoningEnabledRef = useRef(reasoningEnabled);

  // Check if current model supports reasoning
  const supportsReasoning = modelSupportsReasoning(selectedModelId);

  // Track if we've notified about chat creation
  const hasNotifiedCreationRef = useRef(false);

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

  // Set body background color on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.background.primary;
      document.documentElement.style.backgroundColor = colors.background.primary;
    }
  }, []);

  // Local state for input (works better with RN TextInput than useChat's input)
  const [localInput, setLocalInput] = useState('');

  // Chat state using @ai-sdk/react
  const { messages, sendMessage, setMessages, regenerate, status, error, stop } = useChat({
    id: currentChatId,
    messages: initialMessages,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        return {
          body: {
            id: currentChatIdRef.current,
            message: lastMessage,
            model: selectedModelIdRef.current,
            reasoning: reasoningEnabledRef.current,
            ...request.body,
          },
        };
      },
    }),
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
    const hasText = localInput?.trim();
    const hasAttachments = attachments.length > 0;

    if ((hasText || hasAttachments) && !isLoading) {
      // If this is a new chat (no initial messages and first send), notify parent
      const isNewChat = initialMessages.length === 0 && messages.length === 0;

      // Build message parts
      const fileParts = toFileParts();
      const parts: any[] = [...fileParts];

      if (hasText) {
        parts.push({ type: 'text', text: localInput.trim() });
      }

      // Send message with parts
      sendMessage({
        role: 'user',
        parts,
      });

      // Clear input and attachments
      setLocalInput('');
      clearAttachments();

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
    setSelectedModelId(modelId);
  }, []);

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
        const response = await expoFetch(`/api/messages/${messageId}`, {
          method: 'DELETE',
        });

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
        const response = await expoFetch(`/api/messages/${messageId}`, {
          method: 'DELETE',
        });

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
        />

        <MessageInput
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
