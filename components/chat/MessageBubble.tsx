import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import { SimpleMarkdown } from './SimpleMarkdown';
import { ToolInvocation } from './ToolInvocation';
import { MessageActions } from './MessageActions';
import type { MessageBubbleProps, ToolPart } from './types';

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
  onCopy,
  onStopStreaming,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

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

  if (isUser) {
    return (
      <View style={styles.userMessageRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{textContent}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantMessageRow}>
      <View style={styles.assistantContent}>
        {toolParts.map((part, index) => (
          <ToolInvocation key={index} part={part} />
        ))}

        {textContent && (
          <SimpleMarkdown text={textContent} onCopyCode={onCopy} />
        )}

        <MessageActions
          content={textContent}
          isStreaming={isStreaming}
          onCopy={onCopy}
          onStopStreaming={onStopStreaming}
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
  userBubble: {
    maxWidth: '70%',
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
