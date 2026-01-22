import React, { memo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { SimpleMarkdown } from './SimpleMarkdown';
import { ToolInvocation } from './ToolInvocation';
import { MessageActions } from './MessageActions';
import { MessageEditor } from './MessageEditor';
import { ImagePreview } from './ImagePreview';
import { ReasoningSection } from './ReasoningSection';
import type { MessageBubbleProps, ToolPart, FilePart, ReasoningPart, MessageMode } from './types';

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
  isLoading = false,
  onCopy,
  onStopStreaming,
  onEdit,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [mode, setMode] = useState<MessageMode>('view');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract text content from parts or content
  let textContent = '';
  if (message.parts && Array.isArray(message.parts)) {
    textContent = message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('\n');
  } else if (typeof (message as any).content === 'string') {
    textContent = (message as any).content;
  }

  // Extract tool invocations
  const toolParts = (message.parts?.filter((p: any) => p.type?.startsWith('tool-')) || []) as ToolPart[];

  // Extract file parts (images)
  const fileParts = (message.parts?.filter((p: any) => p.type === 'file') || []) as FilePart[];

  // Extract reasoning parts (extended thinking)
  const reasoningParts = (message.parts?.filter((p: any) => p.type === 'reasoning') || []) as ReasoningPart[];

  // Handle edit button click
  const handleEditClick = useCallback(() => {
    setMode('edit');
  }, []);

  // Handle save from editor
  const handleSave = useCallback(async (newContent: string) => {
    if (!onEdit) return;

    setIsSubmitting(true);
    try {
      await onEdit(message.id, newContent);
      setMode('view');
    } finally {
      setIsSubmitting(false);
    }
  }, [message.id, onEdit]);

  // Handle cancel from editor
  const handleCancel = useCallback(() => {
    setMode('view');
  }, []);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
  }, [message.id, onRegenerate]);

  if (isUser) {
    // Edit mode for user messages
    if (mode === 'edit') {
      return (
        <View style={styles.userMessageRow}>
          <View style={styles.editorContainer}>
            <MessageEditor
              message={message}
              onSave={handleSave}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </View>
        </View>
      );
    }

    // View mode for user messages
    return (
      <View style={styles.userMessageRow}>
        <View style={styles.userColumn}>
          <View style={styles.userBubble}>
            {/* Render file attachments first */}
            {fileParts.length > 0 && (
              <View style={styles.userFilesContainer}>
                {fileParts.map((part, index) => (
                  <ImagePreview
                    key={`file-${index}`}
                    url={part.url}
                    filename={part.filename}
                  />
                ))}
              </View>
            )}
            {textContent && <Text style={styles.userText}>{textContent}</Text>}
          </View>
          {/* Only show edit actions when not loading */}
          {!isLoading && (
            <MessageActions
              content={textContent}
              role="user"
              isStreaming={isStreaming}
              onCopy={onCopy}
              onEdit={onEdit ? handleEditClick : undefined}
            />
          )}
        </View>
      </View>
    );
  }

  // Assistant message
  return (
    <View style={styles.assistantMessageRow}>
      <View style={styles.assistantContent}>
        {/* Reasoning sections (extended thinking) - render before main content */}
        {reasoningParts.map((part, index) => (
          <ReasoningSection
            key={`reasoning-${index}`}
            text={part.text || ''}
            isStreaming={part.state === 'streaming' || (isStreaming && !part.text)}
          />
        ))}

        {toolParts.map((part, index) => (
          <ToolInvocation key={index} part={part} />
        ))}

        {textContent && (
          <SimpleMarkdown text={textContent} onCopyCode={onCopy} />
        )}

        <MessageActions
          content={textContent}
          role="assistant"
          isStreaming={isStreaming}
          onCopy={onCopy}
          onStopStreaming={onStopStreaming}
          onRegenerate={onRegenerate ? handleRegenerate : undefined}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  userColumn: {
    maxWidth: '70%',
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: colors.message.user.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  userText: {
    fontSize: fontSize.base,
    lineHeight: 22,
    color: colors.message.user.text,
  },
  userFilesContainer: {
    marginBottom: spacing.sm,
  },
  editorContainer: {
    flex: 1,
    maxWidth: '85%',
  },
  assistantMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  assistantContent: {
    flex: 1,
    maxWidth: '90%',
  },
});
