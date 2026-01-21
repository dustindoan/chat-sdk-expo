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
import { chatModels, DEFAULT_MODEL_ID, getModelName } from '../lib/ai/models';
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

  // Chat ID - generate one if not provided
  const [currentChatId] = useState(() => initialChatId || generateUUID());
  const currentChatIdRef = useRef(currentChatId);

  // Model selection state
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const selectedModelIdRef = useRef(selectedModelId);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

  // Track if we've notified about chat creation
  const hasNotifiedCreationRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    selectedModelIdRef.current = selectedModelId;
  }, [selectedModelId]);

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
  const { messages, sendMessage, status, error, stop } = useChat({
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
    if (localInput?.trim() && !isLoading) {
      // If this is a new chat (no initial messages and first send), notify parent
      const isNewChat = initialMessages.length === 0 && messages.length === 0;

      sendMessage({ text: localInput.trim() });
      setLocalInput('');

      // Notify about chat creation after a delay (to ensure it's saved)
      if (isNewChat && !hasNotifiedCreationRef.current && onChatCreated) {
        hasNotifiedCreationRef.current = true;
        setTimeout(() => {
          onChatCreated(currentChatId);
        }, 1000);
      }
    }
  }, [localInput, isLoading, sendMessage, initialMessages.length, messages.length, onChatCreated, currentChatId]);

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
