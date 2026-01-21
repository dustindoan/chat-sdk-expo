import React, { memo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>{'\uD83D\uDD27'}</Text>
        <Text style={styles.name}>{toolName}</Text>
        {isLoading && (
          <ActivityIndicator size="small" color={colors.accent.primary} />
        )}
      </View>

      {/* Input args */}
      {args && Object.keys(args).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Input</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>{JSON.stringify(args, null, 2)}</Text>
          </View>
        </View>
      )}

      {/* Result */}
      {hasResult && (
        <View style={styles.section}>
          <Pressable
            style={styles.resultHeader}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <Text style={styles.sectionLabel}>Result</Text>
            <Text style={styles.expandIcon}>
              {isExpanded ? '\u25BC' : '\u25B6'}
            </Text>
          </Pressable>

          {isExpanded && (
            <View style={styles.codeBlock}>
              <Text style={styles.code}>
                {JSON.stringify(result, null, 2)}
              </Text>
            </View>
          )}

          {!isExpanded && (
            <Text style={styles.collapsedHint}>
              Tap to expand result
            </Text>
          )}
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
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: fontSize.base,
  },
  name: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent.primary,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandIcon: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  codeBlock: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  code: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: fontSize.xs,
    color: colors.text.primary,
  },
  collapsedHint: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
});
