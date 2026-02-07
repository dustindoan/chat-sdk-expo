import React from 'react';
import { View } from 'react-native';
import { Text } from '@chat-sdk-expo/ui/primitives';
import { SessionsTool } from './tools/SessionsTool';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import type { ConversationEmptyStateProps } from './types';

export function ConversationEmptyState({
  title,
  subtitle,
  selectedDate,
}: ConversationEmptyStateProps) {
  // If we have a selected date, show sessions for that day
  const sessionsData = useTodaySessions(selectedDate || new Date());

  // Show sessions view when we have a date
  if (selectedDate) {
    return (
      <View className="flex-1 pt-4">
        <SessionsTool
          toolName="getTodaySessions"
          toolCallId="empty-state-preview"
          state="output-available"
          result={sessionsData}
        />
      </View>
    );
  }

  // Fallback to standard welcome message
  return (
    <View className="flex-1 px-6 pt-[100px]">
      <Text className="mb-2 text-2xl font-bold text-foreground">{title}</Text>
      <Text className="text-lg text-muted-foreground">{subtitle}</Text>
    </View>
  );
}
