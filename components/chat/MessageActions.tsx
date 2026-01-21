import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import type { MessageActionsProps } from './types';

export function MessageActions({
  content,
  role,
  isStreaming,
  onCopy,
  onEdit,
  onRegenerate,
}: MessageActionsProps) {
  const handleCopy = () => {
    onCopy?.(content);
  };

  // Don't show actions while streaming - stop button is in the input area
  if (isStreaming) {
    return null;
  }

  // User messages: Edit button + Copy button
  if (role === 'user') {
    return (
      <View style={styles.userContainer}>
        {onEdit && (
          <TouchableOpacity
            style={[
              styles.button,
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            onPress={onEdit}
          >
            <Feather name="edit-2" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.button,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={handleCopy}
        >
          <Feather name="copy" size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    );
  }

  // Assistant messages: Copy, Regenerate, Thumbs up/down
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        ]}
        onPress={handleCopy}
      >
        <Feather name="copy" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
      {onRegenerate && (
        <TouchableOpacity
          style={[
            styles.button,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={onRegenerate}
        >
          <Feather name="refresh-cw" size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.button,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        ]}
      >
        <Feather name="thumbs-up" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        ]}
      >
        <Feather name="thumbs-down" size={16} color={colors.text.tertiary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    padding: spacing.xs,
  },
});
