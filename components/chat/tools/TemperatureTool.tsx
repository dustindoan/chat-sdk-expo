import React, { memo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors, temperatureColors } from '@/lib/theme';
import type { ToolUIProps } from './types';
import type { TemperatureInput, TemperatureResult } from '../../../lib/ai/tools';

type TemperatureToolProps = ToolUIProps<TemperatureInput, TemperatureResult>;

/**
 * TemperatureTool component
 * Displays temperature conversion with side-by-side comparison
 */
export const TemperatureTool = memo(function TemperatureTool({
  state,
  args,
  result,
}: TemperatureToolProps) {
  const isLoading = state === 'partial-call' || state === 'call';
  const hasResult = (state === 'result' || state === 'output-available') && result;

  return (
    <View
      className="my-2 rounded-lg bg-secondary p-3"
      style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}
    >
      {/* Header */}
      <View className="mb-3 flex-row items-center gap-2">
        <Text className="text-base">{'\uD83C\uDF21\uFE0F'}</Text>
        <Text variant="muted" className="text-sm font-semibold">Temperature Conversion</Text>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="muted" className="text-sm">
            Converting {args?.fahrenheit !== undefined ? `${args.fahrenheit}°F` : '...'}
          </Text>
        </View>
      )}

      {/* Result state */}
      {hasResult && (
        <View className="flex-row items-center justify-center gap-3">
          {/* Fahrenheit side */}
          <View
            className="flex-1 items-center rounded-md p-3"
            style={{ backgroundColor: temperatureColors.hot }}
          >
            <Text className="text-2xl font-bold">{result.fahrenheit}°</Text>
            <Text className="mt-1 text-xs text-white/70">Fahrenheit</Text>
          </View>

          {/* Arrow */}
          <View className="px-2">
            <Text variant="muted" className="text-xl">{'\u2192'}</Text>
          </View>

          {/* Celsius side */}
          <View
            className="flex-1 items-center rounded-md p-3"
            style={{ backgroundColor: temperatureColors.cold }}
          >
            <Text className="text-2xl font-bold">{result.celsius}°</Text>
            <Text className="mt-1 text-xs text-white/70">Celsius</Text>
          </View>
        </View>
      )}
    </View>
  );
});
