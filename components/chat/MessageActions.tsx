import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import type { MessageActionsProps } from './types';

export function MessageActions({
  content,
  isStreaming,
  onCopy,
}: MessageActionsProps) {
  const handleCopy = () => {
    onCopy?.(content);
  };

  // Don't show actions while streaming - stop button is in the input area
  if (isStreaming) {
    return null;
  }

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
  button: {
    padding: spacing.xs,
  },
});
