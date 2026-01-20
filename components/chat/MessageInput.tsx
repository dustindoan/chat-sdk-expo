import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { MessageInputProps } from './types';

const SEND_BUTTON_HEIGHT = 36;
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

  const canSend = value?.trim() && !isLoading;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
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
            >
              <Feather name="square" size={16} color={colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
                Platform.OS === 'web' && ({ cursor: canSend ? 'pointer' : 'default' } as any),
              ]}
              onPress={onSend}
              disabled={!canSend}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  container: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
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
