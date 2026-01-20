/**
 * ChatUI - Pre-styled, dark-themed chat interface
 * Adapted from expo-gen-ui to work with @ai-sdk/react useChat hook
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Platform, StyleSheet, type ViewStyle } from 'react-native';
import { useChat } from '@ai-sdk/react';
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

export interface ChatUIProps {
  /** API endpoint for chat */
  api: string;
  /** Placeholder text for input */
  placeholder?: string;
  /** Welcome message when no messages */
  welcomeMessage?: string;
  /** Welcome subtitle */
  welcomeSubtitle?: string;
}

export function ChatUI({
  api,
  placeholder = 'Send a message...',
  welcomeMessage = 'Hello there!',
  welcomeSubtitle = 'How can I help you today?',
}: ChatUIProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { showToast } = useToast();
  const { copyToClipboard } = useClipboard();

  // Model selection state
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);

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
    transport: new DefaultChatTransport({
      api,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      body: {
        model: selectedModelId,
      },
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSend = useCallback(() => {
    if (localInput?.trim() && !isLoading) {
      sendMessage({ text: localInput.trim() });
      setLocalInput('');
    }
  }, [localInput, isLoading, sendMessage]);

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
