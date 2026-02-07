import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, TextInput, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Button } from '../primitives/button';
import { Text } from '../primitives/text';
import { Textarea } from '../primitives/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';
import { AttachmentPreview } from './AttachmentPreview';
import { ReasoningToggle } from './ReasoningToggle';
import type { PromptInputProps, PromptInputHandle } from './types';

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(
  function PromptInput(
    {
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
      extraToggles,
    },
    ref
  ) {
    const inputRef = useRef<TextInput>(null);

    // Use useResolveClassNames for icon colors and placeholderTextColor
    const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');
    const tertiaryStyle = useResolveClassNames('text-tertiary');

    // Expose clear method to parent via ref
    // This handles the iOS autocorrect race condition (React Native issue #29073)
    // where onChangeText fires AFTER onSubmitEditing with the autocorrect suggestion
    useImperativeHandle(ref, () => ({
      clear: () => {
        // 1. Call clear() on the native TextInput to dismiss pending iOS autocorrect
        inputRef.current?.clear();
        // 2. Update the controlled value
        onChangeText('');
        // 3. Fallback: clear again after a short delay to handle any race conditions
        //    This catches cases where iOS autocorrect callback fires after our clear
        if (Platform.OS === 'ios') {
          setTimeout(() => {
            inputRef.current?.clear();
            onChangeText('');
          }, 50);
        }
      },
    }));

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
      <View className="items-center pb-4">
        <View className="w-full max-w-4xl px-3">
          <View className="overflow-hidden rounded-2xl border border-border bg-secondary">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 8 }}
                className="max-h-[100px] border-b border-border"
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

            <Textarea
              ref={inputRef}
              className="min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent px-4 pt-3 pb-1 shadow-none focus-visible:ring-0"
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={mutedForegroundStyle.color as string}
              blurOnSubmit={false}
              onKeyPress={handleKeyPress}
              editable={!isLoading}
            />

            <View className="flex-row items-center gap-1 px-3 pb-2">
              {/* Attachment Button */}
              {onAddAttachment && (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onPress={onAddAttachment}
                      disabled={isLoading}
                      accessibilityLabel="Add attachment"
                    >
                      <Feather
                        name="paperclip"
                        size={18}
                        color={isLoading ? tertiaryStyle.color as string : mutedForegroundStyle.color as string}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>Attach file</Text>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Reasoning Toggle - icon only, next to attachment */}
              {supportsReasoning && onToggleReasoning && (
                <ReasoningToggle
                  enabled={reasoningEnabled}
                  onToggle={onToggleReasoning}
                  disabled={isLoading}
                />
              )}

              {/* App-specific extra toggles (e.g., ResearchToggle, CoachingToggle) */}
              {extraToggles}

              <View className="flex-1">
                <Button
                  variant="ghost"
                  className="justify-start gap-1 px-2 py-1"
                  onPress={onModelSelect}
                  disabled={isLoading}
                >
                  <Text className="text-sm text-muted-foreground">✦</Text>
                  <Text className="text-sm text-muted-foreground">{selectedModel}</Text>
                </Button>
              </View>

              {isLoading ? (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onPress={onStop}
                      accessibilityLabel="Stop generating"
                    >
                      <Feather name="square" size={16} color="white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>Stop</Text>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={canSend ? 'default' : 'secondary'}
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      onPress={onSend}
                      disabled={!canSend}
                      accessibilityLabel="Send message"
                    >
                      <Text className={`text-lg font-bold ${canSend ? 'text-primary-foreground' : 'text-muted-foreground'}`}>↑</Text>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Text>Send</Text>
                  </TooltipContent>
                </Tooltip>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }
);
