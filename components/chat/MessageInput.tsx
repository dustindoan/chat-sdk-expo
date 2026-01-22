import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { AttachmentPreview } from './AttachmentPreview';
import { ReasoningToggle } from './ReasoningToggle';
import type { MessageInputProps } from './types';

export function MessageInput({
  value,
  onChangeText,
  onSend,
  onStop,
  placeholder = 'Send a message...',
  isLoading,
  selectedModel,
  onModelSelect,
  attachments = [],
  onAddAttachment,
  onRemoveAttachment,
  reasoningEnabled = false,
  onToggleReasoning,
  supportsReasoning = false,
}: MessageInputProps) {
  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web') {
      const webEvent = e.nativeEvent as { key: string; shiftKey?: boolean };
      if (webEvent.key === 'Enter' && !webEvent.shiftKey) {
        e.preventDefault();
        onSend();
      }
    }
  };

  const hasContent = value?.trim() || attachments.length > 0;
  const canSend = hasContent && !isLoading;

  return (
    <View className="items-center pb-6">
      <View className="w-full max-w-3xl md:max-w-4xl px-4">
        <View className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row gap-2 px-4 py-2"
              className="max-h-[100px] border-b border-zinc-800"
            >
              {attachments.map((attachment) => (
                <AttachmentPreview
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={
                    onRemoveAttachment
                      ? () => onRemoveAttachment(attachment.id)
                      : undefined
                  }
                />
              ))}
            </ScrollView>
          )}

          <TextInput
            className="min-h-[44px] max-h-[120px] px-5 pt-4 pb-1 text-base text-zinc-100"
            style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            multiline
            blurOnSubmit={false}
            onKeyPress={handleKeyPress}
            editable={!isLoading}
          />
          <View className="flex-row items-center px-4 pb-2 gap-1">
            {/* Attachment Button */}
            {onAddAttachment && (
              <TouchableOpacity
                className="size-8 rounded-full justify-center items-center"
                style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
                onPress={onAddAttachment}
                disabled={isLoading}
                accessibilityLabel="Add attachment"
                accessibilityRole="button"
              >
                <Feather
                  name="paperclip"
                  size={18}
                  color={isLoading ? '#71717a' : '#a1a1aa'}
                />
              </TouchableOpacity>
            )}

            {/* Reasoning Toggle - icon only, next to attachment */}
            {supportsReasoning && onToggleReasoning && (
              <ReasoningToggle
                enabled={reasoningEnabled}
                onToggle={onToggleReasoning}
                disabled={isLoading}
              />
            )}

            <TouchableOpacity
              className="flex-row items-center gap-1 px-2 py-1 flex-1"
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
              onPress={onModelSelect}
              disabled={isLoading}
            >
              <Text className="text-sm text-zinc-500">✦</Text>
              <Text className="text-sm text-zinc-500">{selectedModel}</Text>
            </TouchableOpacity>

            {isLoading ? (
              <TouchableOpacity
                className="size-9 rounded-full bg-red-500 justify-center items-center"
                style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
                onPress={onStop}
                accessibilityLabel="Stop generating"
                accessibilityRole="button"
              >
                <Feather name="square" size={16} color="#fafafa" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className={`size-9 rounded-full justify-center items-center ${
                  canSend ? 'bg-zinc-100' : 'bg-zinc-800'
                }`}
                style={Platform.OS === 'web' ? ({ cursor: canSend ? 'pointer' : 'default' } as any) : undefined}
                onPress={onSend}
                disabled={!canSend}
                accessibilityLabel="Send message"
                accessibilityRole="button"
              >
                <Text className={`text-lg font-bold ${canSend ? 'text-zinc-900' : 'text-zinc-600'}`}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
