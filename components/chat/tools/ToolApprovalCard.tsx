import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { ToolUIProps, ToolApproval } from './types';

/**
 * ToolApprovalCard component
 * Displays a card prompting user to approve or deny a tool execution
 */
export const ToolApprovalCard = memo(function ToolApprovalCard({
  toolName,
  args,
  approval,
  onApprovalResponse,
}: ToolUIProps) {
  const handleApprove = () => {
    if (approval?.id && onApprovalResponse) {
      onApprovalResponse({ id: approval.id, approved: true });
    }
  };

  const handleDeny = () => {
    if (approval?.id && onApprovalResponse) {
      onApprovalResponse({
        id: approval.id,
        approved: false,
        reason: `User denied ${toolName} execution`,
      });
    }
  };

  // Format tool name for display
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  // Get a friendly description based on tool name
  const getToolDescription = () => {
    switch (toolName) {
      case 'weather':
        const city = (args as any)?.city;
        return city
          ? `Look up weather for "${city}"`
          : 'Look up weather at the specified location';
      case 'convertTemperature':
        return 'Convert temperature between Fahrenheit and Celsius';
      case 'createDocument':
        return 'Create a new document';
      case 'updateDocument':
        return 'Update an existing document';
      default:
        return `Execute ${displayName}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{'\u26A0\uFE0F'}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Action Required</Text>
          <Text style={styles.subtitle}>{displayName} wants to execute</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{getToolDescription()}</Text>

        {/* Show args if present */}
        {args && Object.keys(args).length > 0 && (
          <View style={styles.argsContainer}>
            <Text style={styles.argsLabel}>Parameters:</Text>
            <View style={styles.argsBox}>
              <Text style={styles.argsText}>
                {JSON.stringify(args, null, 2)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.denyButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleDeny}
        >
          <Text style={styles.denyButtonText}>Deny</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.approveButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleApprove}
        >
          <Text style={styles.approveButtonText}>Allow</Text>
        </Pressable>
      </View>
    </View>
  );
});

/**
 * ToolApprovedCard component
 * Shows a brief confirmation that a tool was approved
 */
export const ToolApprovedCard = memo(function ToolApprovedCard({
  toolName,
}: Pick<ToolUIProps, 'toolName'>) {
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return (
    <View style={styles.approvedContainer}>
      <Text style={styles.approvedIcon}>{'\u2705'}</Text>
      <Text style={styles.approvedText}>{displayName} approved</Text>
    </View>
  );
});

/**
 * ToolDeniedCard component
 * Shows that a tool execution was denied
 */
export const ToolDeniedCard = memo(function ToolDeniedCard({
  toolName,
  approval,
}: Pick<ToolUIProps, 'toolName' | 'approval'>) {
  const displayName = toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  return (
    <View style={styles.deniedContainer}>
      <Text style={styles.deniedIcon}>{'\u274C'}</Text>
      <View style={styles.deniedTextContainer}>
        <Text style={styles.deniedText}>{displayName} was denied</Text>
        {approval?.reason && (
          <Text style={styles.deniedReason}>{approval.reason}</Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.accent.warning,
    marginVertical: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // warning color with opacity
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  icon: {
    fontSize: fontSize.lg,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.accent.warning,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  descriptionContainer: {
    padding: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  argsContainer: {
    marginTop: spacing.sm,
  },
  argsLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  argsBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  argsText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    fontSize: fontSize.xs,
    color: colors.text.primary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  denyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  denyButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  approveButton: {
    backgroundColor: colors.accent.primary,
  },
  approveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: 'white',
  },
  // Approved card styles
  approvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.success,
  },
  approvedIcon: {
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
  approvedText: {
    fontSize: fontSize.sm,
    color: colors.accent.success,
    fontWeight: fontWeight.medium,
  },
  // Denied card styles
  deniedContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.error,
  },
  deniedIcon: {
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
  deniedTextContainer: {
    flex: 1,
  },
  deniedText: {
    fontSize: fontSize.sm,
    color: colors.accent.error,
    fontWeight: fontWeight.medium,
  },
  deniedReason: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
