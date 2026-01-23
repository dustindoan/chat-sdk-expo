import React, { useRef, useEffect, memo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { WelcomeMessage } from './WelcomeMessage';
import { MessageBubble } from './MessageBubble';
import type { MessageListProps } from './types';

export const MessageList = memo(function MessageList({
  messages,
  isLoading,
  error,
  welcomeTitle,
  welcomeSubtitle,
  onCopy,
  onStopStreaming,
  onEdit,
  onRegenerate,
  onApprovalResponse,
  votes,
  onVote,
}: MessageListProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const showThinkingIndicator =
    isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user';

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Centered content wrapper with max-width */}
      <View style={styles.content}>
        {messages.length === 0 ? (
          <WelcomeMessage title={welcomeTitle} subtitle={welcomeSubtitle} />
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isLoading && index === messages.length - 1 && message.role === 'assistant'}
              isLoading={isLoading}
              onCopy={onCopy}
              onStopStreaming={onStopStreaming}
              onEdit={onEdit}
              onRegenerate={onRegenerate}
              onApprovalResponse={onApprovalResponse}
              voteState={votes?.[message.id]}
              onVote={onVote}
            />
          ))
        )}

        {showThinkingIndicator && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error.message}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 896, // max-w-4xl equivalent
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: colors.accent.error + '20',
    borderRadius: 8,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  errorText: {
    fontSize: 14,
    color: colors.accent.error,
  },
});
