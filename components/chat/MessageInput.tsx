import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import { AttachmentPreview } from './AttachmentPreview';
import type { MessageInputProps } from './types';

const SEND_BUTTON_HEIGHT = 36;
const TOOLBAR_BUTTON_SIZE = 32;
const INPUT_TOOLBAR_PADDING_BOTTOM = spacing.sm;

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
    <View style={styles.wrapper}>
      <View style={styles.innerWrapper}>
        <View style={styles.container}>
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attachmentsContainer}
              style={styles.attachmentsScroll}
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
            style={[
              styles.input,
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.text.tertiary}
            multiline
            blurOnSubmit={false}
            onKeyPress={handleKeyPress}
            editable={!isLoading}
          />
          <View style={styles.toolbar}>
            {/* Attachment Button */}
            {onAddAttachment && (
              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={onAddAttachment}
                disabled={isLoading}
                accessibilityLabel="Add attachment"
                accessibilityRole="button"
              >
                <Feather
                  name="paperclip"
                  size={18}
                  color={isLoading ? colors.text.tertiary : colors.text.secondary}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.modelSelector,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={onModelSelect}
              disabled={isLoading}
            >
              <Text style={styles.sparkle}>✦</Text>
              <Text style={styles.modelText}>{selectedModel}</Text>
            </TouchableOpacity>

            {isLoading ? (
              <TouchableOpacity
                style={[
                  styles.stopButton,
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                onPress={onStop}
                accessibilityLabel="Stop generating"
                accessibilityRole="button"
              >
                <Feather name="square" size={16} color={colors.text.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                  Platform.OS === 'web' &&
                    ({ cursor: canSend ? 'pointer' : 'default' } as any),
                ]}
                onPress={onSend}
                disabled={!canSend}
                accessibilityLabel="Send message"
                accessibilityRole="button"
              >
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  innerWrapper: {
    width: '100%',
    maxWidth: 896, // max-w-4xl equivalent
    paddingHorizontal: spacing.md,
  },
  container: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  attachmentsScroll: {
    maxHeight: 100,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  attachmentsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: INPUT_TOOLBAR_PADDING_BOTTOM,
    gap: spacing.xs,
  },
  toolbarButton: {
    width: TOOLBAR_BUTTON_SIZE,
    height: TOOLBAR_BUTTON_SIZE,
    borderRadius: TOOLBAR_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flex: 1,
  },
  sparkle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  modelText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  sendButton: {
    width: SEND_BUTTON_HEIGHT,
    height: SEND_BUTTON_HEIGHT,
    borderRadius: SEND_BUTTON_HEIGHT / 2,
    backgroundColor: colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.secondary,
  },
  sendIcon: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
  },
  stopButton: {
    width: SEND_BUTTON_HEIGHT,
    height: SEND_BUTTON_HEIGHT,
    borderRadius: SEND_BUTTON_HEIGHT / 2,
    backgroundColor: colors.accent.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
