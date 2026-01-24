import React, { memo, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { colors } from '@/lib/theme';
import type { ToolUIProps } from './types';

/**
 * DefaultTool component
 * Fallback display for tools without custom UI components
 * Shows tool name, input args, and collapsible JSON output
 */
export const DefaultTool = memo(function DefaultTool({
  toolName,
  state,
  args,
  result,
}: ToolUIProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLoading = state === 'partial-call' || state === 'call';
  const hasResult = (state === 'result' || state === 'output-available') && result !== undefined;

  return (
    <View
      className="my-2 rounded-lg bg-secondary p-3"
      style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}
    >
      {/* Header */}
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-base">{'\uD83D\uDD27'}</Text>
        <Text className="flex-1 text-sm font-semibold text-primary">{toolName}</Text>
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Input args */}
      {args && Object.keys(args).length > 0 && (
        <View className="mt-2">
          <Text variant="muted" className="mb-1 text-xs uppercase tracking-wide">
            Input
          </Text>
          <View className="rounded-md bg-card p-2">
            <Text
              className="text-xs"
              style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
            >
              {JSON.stringify(args, null, 2)}
            </Text>
          </View>
        </View>
      )}

      {/* Result */}
      {hasResult && (
        <View className="mt-2">
          <Button
            variant="ghost"
            className="h-auto flex-row items-center justify-between p-0"
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Result
            </Text>
            <Text variant="muted" className="text-xs">
              {isExpanded ? '\u25BC' : '\u25B6'}
            </Text>
          </Button>

          {isExpanded && (
            <View className="mt-1 rounded-md bg-card p-2">
              <Text
                className="text-xs"
                style={{ fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' }}
              >
                {JSON.stringify(result, null, 2)}
              </Text>
            </View>
          )}

          {!isExpanded && (
            <Text variant="muted" className="text-xs italic">
              Tap to expand result
            </Text>
          )}
        </View>
      )}
    </View>
  );
});
