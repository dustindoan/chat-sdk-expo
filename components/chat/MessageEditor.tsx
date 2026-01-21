import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { MessageEditorProps } from './types';

/**
 * Extract text content from a message
 */
function getTextFromMessage(message: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!message.parts) return '';
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text || '')
    .join('\n');
}

export function MessageEditor({
  message,
  onSave,
  onCancel,
  isSubmitting = false,
}: MessageEditorProps) {
  const [draftContent, setDraftContent] = useState(() => getTextFromMessage(message));
  const inputRef = useRef<TextInput>(null);

  // Focus the input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleSave = useCallback(() => {
    if (draftContent.trim() && !isSubmitting) {
      onSave(draftContent.trim());
    }
  }, [draftContent, isSubmitting, onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={draftContent}
        onChangeText={setDraftContent}
        placeholder="Edit your message..."
        placeholderTextColor={colors.text.tertiary}
        multiline
        textAlignVertical="top"
        editable={!isSubmitting}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            isSubmitting && styles.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSubmitting || !draftContent.trim()}
        >
          <Text style={styles.saveButtonText}>
            {isSubmitting ? 'Sending...' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text.primary,
    minHeight: 80,
    maxHeight: 200,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    } as any),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.accent.primary,
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
