import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{'\uD83C\uDF21\uFE0F'}</Text>
        <Text style={styles.headerText}>Temperature Conversion</Text>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.accent.primary} />
          <Text style={styles.loadingText}>
            Converting {args?.fahrenheit !== undefined ? `${args.fahrenheit}°F` : '...'}
          </Text>
        </View>
      )}

      {/* Result state */}
      {hasResult && (
        <View style={styles.conversionDisplay}>
          {/* Fahrenheit side */}
          <View style={[styles.tempBox, styles.fahrenheitBox]}>
            <Text style={styles.tempValue}>{result.fahrenheit}°</Text>
            <Text style={styles.tempUnit}>Fahrenheit</Text>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>{'\u2192'}</Text>
          </View>

          {/* Celsius side */}
          <View style={[styles.tempBox, styles.celsiusBox]}>
            <Text style={styles.tempValue}>{result.celsius}°</Text>
            <Text style={styles.tempUnit}>Celsius</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerIcon: {
    fontSize: fontSize.base,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  conversionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  tempBox: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  fahrenheitBox: {
    backgroundColor: '#7f1d1d', // Warm red
  },
  celsiusBox: {
    backgroundColor: '#1e3a5f', // Cool blue
  },
  tempValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  tempUnit: {
    fontSize: fontSize.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.xs,
  },
  arrowContainer: {
    paddingHorizontal: spacing.sm,
  },
  arrow: {
    fontSize: fontSize.xl,
    color: colors.text.secondary,
  },
});
