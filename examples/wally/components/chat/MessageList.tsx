import React, { useRef, useEffect, memo } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';
import { ConversationEmptyState } from './ConversationEmptyState';
import { Message } from './Message';
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
  header,
  selectedDate,
}: MessageListProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Use useResolveClassNames for ActivityIndicator color
  const primaryStyle = useResolveClassNames('text-primary');

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
    <View className="min-h-0 flex-1 bg-background">
      {/* Sticky header (e.g., WeekBar) - stays fixed while content scrolls */}
      {header && (
        <View className="w-full items-center">
          <View className="w-full max-w-4xl px-3 py-2">
            {header}
          </View>
        </View>
      )}

      {/* Scrollable content */}
      <ScrollView
        ref={scrollViewRef}
        className="min-h-0 flex-1"
        contentContainerClassName="grow items-center"
      >
        <View className="w-full max-w-4xl gap-3 px-3 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title={welcomeTitle}
              subtitle={welcomeSubtitle}
              selectedDate={selectedDate}
            />
          ) : (
            messages.map((message, index) => (
              <Message
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
            <View className="flex-row items-center gap-2 py-3">
              <ActivityIndicator size="small" color={primaryStyle.color as string} />
              <Text className="text-sm text-muted-foreground">Thinking...</Text>
            </View>
          )}

          {error && (
            <View className="my-2 rounded-lg bg-destructive/20 p-3">
              <Text className="text-sm text-destructive">Error: {error.message}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
});
