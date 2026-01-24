import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import type { ConversationEmptyStateProps } from './types';

export function ConversationEmptyState({ title, subtitle }: ConversationEmptyStateProps) {
  return (
    <View className="flex-1 px-6 pt-[100px]">
      <Text className="mb-2 text-2xl font-bold text-foreground">{title}</Text>
      <Text className="text-lg text-muted-foreground">{subtitle}</Text>
    </View>
  );
}
