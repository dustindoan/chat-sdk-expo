import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
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
    <View className="flex-1 gap-3">
      <Textarea
        ref={inputRef}
        className="min-h-[80px] max-h-[200px] resize-none rounded-lg bg-card focus-visible:ring-0"
        value={draftContent}
        onChangeText={setDraftContent}
        placeholder="Edit your message..."
        editable={!isSubmitting}
      />

      <View className="flex-row justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onPress={handleCancel}
          disabled={isSubmitting}
        >
          <Text>Cancel</Text>
        </Button>

        <Button
          variant="default"
          size="sm"
          onPress={handleSave}
          disabled={isSubmitting || !draftContent.trim()}
        >
          <Text>{isSubmitting ? 'Sending...' : 'Send'}</Text>
        </Button>
      </View>
    </View>
  );
}
