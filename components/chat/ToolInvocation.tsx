import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { ToolInvocationProps } from './types';

export function ToolInvocation({ part }: ToolInvocationProps) {
  const toolName = part.toolName || part.type?.replace('tool-', '') || 'tool';
  const isComplete = part.state === 'result';
  const isPending = part.state === 'partial-call' || part.state === 'call';

  // Support both new format (args/result) and legacy format (input/output)
  const inputData = part.args || part.input;
  const outputData = part.result || part.output;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>🔧</Text>
        <Text style={styles.name}>{toolName}</Text>
        {isPending && <ActivityIndicator size="small" color={colors.accent.primary} />}
      </View>
      {inputData && (
        <Text style={styles.input}>Input: {JSON.stringify(inputData)}</Text>
      )}
      {isComplete && outputData && (
        <View style={styles.outputContainer}>
          <Text style={styles.output}>{JSON.stringify(outputData, null, 2)}</Text>
        </View>
      )}
    </View>
  );
}

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
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: fontSize.base,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent.primary,
  },
  input: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  outputContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  output: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: fontSize.xs,
    color: colors.text.primary,
  },
});
