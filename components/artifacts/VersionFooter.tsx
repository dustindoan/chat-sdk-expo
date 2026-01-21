/**
 * VersionFooter - Sticky footer shown when viewing a historical version
 *
 * Provides "Restore this version" and "Back to latest" actions.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../theme';

interface VersionFooterProps {
  onRestore: () => void;
  onBackToLatest: () => void;
  isRestoring?: boolean;
}

export function VersionFooter({
  onRestore,
  onBackToLatest,
  isRestoring = false,
}: VersionFooterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>You are viewing a previous version</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.restoreButton]}
          onPress={onRestore}
          disabled={isRestoring}
        >
          <Text style={[styles.buttonText, styles.restoreButtonText]}>
            {isRestoring ? 'Restoring...' : 'Restore this version'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.latestButton]}
          onPress={onBackToLatest}
          disabled={isRestoring}
        >
          <Text style={[styles.buttonText, styles.latestButtonText]}>
            Back to latest
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  restoreButton: {
    backgroundColor: colors.accent.primary,
  },
  latestButton: {
    backgroundColor: colors.background.hover,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  restoreButtonText: {
    color: colors.text.primary,
  },
  latestButtonText: {
    color: colors.text.secondary,
  },
});
