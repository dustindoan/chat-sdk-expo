import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { colors } from '@/lib/theme';
import type { ActionsProps } from './types';

export function Actions({
  content,
  role,
  isStreaming,
  onCopy,
  onEdit,
  onRegenerate,
  voteState,
  onVote,
}: ActionsProps) {
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
      <View className="mt-2 flex-row justify-end gap-3">
        {onEdit && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onPress={onEdit}
                accessibilityLabel="Edit message"
              >
                <Feather name="edit-2" size={16} color={colors.tertiary} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <Text>Edit</Text>
            </TooltipContent>
          </Tooltip>
        )}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onPress={handleCopy}
              accessibilityLabel="Copy message"
            >
              <Feather name="copy" size={16} color={colors.tertiary} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <Text>Copy</Text>
          </TooltipContent>
        </Tooltip>
      </View>
    );
  }

  // Assistant messages: Copy, Regenerate, Thumbs up/down
  return (
    <View className="mt-3 flex-row gap-3">
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={handleCopy}
            accessibilityLabel="Copy response"
          >
            <Feather name="copy" size={16} color={colors.tertiary} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <Text>Copy</Text>
        </TooltipContent>
      </Tooltip>

      {onRegenerate && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onPress={onRegenerate}
              accessibilityLabel="Regenerate response"
            >
              <Feather name="refresh-cw" size={16} color={colors.tertiary} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <Text>Regenerate</Text>
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => onVote?.('up')}
            accessibilityLabel="Good response"
          >
            <Feather
              name="thumbs-up"
              size={16}
              color={voteState === 'up' ? colors.success : colors.tertiary}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <Text>Good response</Text>
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onPress={() => onVote?.('down')}
            accessibilityLabel="Bad response"
          >
            <Feather
              name="thumbs-down"
              size={16}
              color={voteState === 'down' ? colors.destructive : colors.tertiary}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <Text>Bad response</Text>
        </TooltipContent>
      </Tooltip>
    </View>
  );
}
