import React, { memo, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '../primitives/text';
import { SimpleMarkdown } from './SimpleMarkdown';
import { Actions } from './Actions';
import { MessageEditor } from './MessageEditor';
import { ImagePreview } from './ImagePreview';
import { Reasoning } from './Reasoning';
import type { MessageProps, ToolPart, FilePart, ReasoningPart, MessageMode } from './types';

export const Message = memo(function Message({
  message,
  isStreaming = false,
  isLoading = false,
  onCopy,
  onStopStreaming,
  onEdit,
  onRegenerate,
  onApprovalResponse,
  voteState,
  onVote,
  renderTool,
}: MessageProps) {
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

  // Handle vote
  const handleVote = useCallback((type: 'up' | 'down') => {
    if (onVote) {
      onVote(message.id, type);
    }
  }, [message.id, onVote]);

  if (isUser) {
    // Edit mode for user messages
    if (mode === 'edit') {
      return (
        <View className="flex-row items-start justify-end gap-2">
          <View className="max-w-[85%] flex-1">
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
      <View className="flex-row items-start justify-end gap-2">
        <View className="max-w-[70%] items-end">
          <View className="rounded-2xl bg-secondary px-4 py-3">
            {/* Render file attachments first */}
            {fileParts.length > 0 && (
              <View className="mb-2">
                {fileParts.map((part, index) => (
                  <ImagePreview
                    key={`file-${index}`}
                    url={part.url}
                    filename={part.filename}
                  />
                ))}
              </View>
            )}
            {textContent && (
              <Text className="text-base leading-[22px]">{textContent}</Text>
            )}
          </View>
          {/* Only show edit actions when not loading */}
          {!isLoading && (
            <Actions
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
    <View className="items-start pl-3">
      <View className="max-w-[90%]">
        {/* Reasoning sections (extended thinking) - render before main content */}
        {reasoningParts.map((part, index) => (
          <Reasoning
            key={`reasoning-${index}`}
            text={part.text || ''}
            isStreaming={part.state === 'streaming' || (isStreaming && !part.text)}
          />
        ))}

        {toolParts.map((part, index) => (
          <React.Fragment key={index}>
            {renderTool ? renderTool(part, onApprovalResponse) : null}
          </React.Fragment>
        ))}

        {textContent && (
          <SimpleMarkdown text={textContent} onCopyCode={onCopy} />
        )}

        <Actions
          content={textContent}
          role="assistant"
          isStreaming={isStreaming}
          onCopy={onCopy}
          onStopStreaming={onStopStreaming}
          onRegenerate={onRegenerate ? handleRegenerate : undefined}
          voteState={voteState}
          onVote={onVote ? handleVote : undefined}
        />
      </View>
    </View>
  );
});
