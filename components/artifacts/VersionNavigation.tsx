/**
 * VersionNavigation - Header controls for version history navigation
 *
 * Provides prev/next buttons, diff toggle, and version indicator.
 * Follows chat-sdk's index-based navigation pattern.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fontSize, spacing } from '../theme';

interface VersionNavigationProps {
  currentIndex: number;
  totalVersions: number;
  mode: 'view' | 'diff';
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleDiff: () => void;
}

export function VersionNavigation({
  currentIndex,
  totalVersions,
  mode,
  isLoading,
  onPrev,
  onNext,
  onToggleDiff,
}: VersionNavigationProps) {
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalVersions - 1;
  const canToggleDiff = currentIndex > 0; // Can't diff if at first version
  const isDiffMode = mode === 'diff';

  // Don't render if only one version
  if (totalVersions <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Prev button */}
      <TouchableOpacity
        style={[styles.button, !canGoPrev && styles.buttonDisabled]}
        onPress={onPrev}
        disabled={!canGoPrev || isLoading}
        accessibilityLabel="Previous version"
      >
        <UndoIcon color={canGoPrev ? colors.text.primary : colors.text.tertiary} />
      </TouchableOpacity>

      {/* Next button */}
      <TouchableOpacity
        style={[styles.button, !canGoNext && styles.buttonDisabled]}
        onPress={onNext}
        disabled={!canGoNext || isLoading}
        accessibilityLabel="Next version"
      >
        <RedoIcon color={canGoNext ? colors.text.primary : colors.text.tertiary} />
      </TouchableOpacity>

      {/* Diff toggle button */}
      <TouchableOpacity
        style={[
          styles.button,
          !canToggleDiff && styles.buttonDisabled,
          isDiffMode && styles.buttonActive,
        ]}
        onPress={onToggleDiff}
        disabled={!canToggleDiff || isLoading}
        accessibilityLabel={isDiffMode ? 'Hide diff' : 'Show diff'}
      >
        <ClockIcon
          color={
            isDiffMode
              ? colors.accent.primary
              : canToggleDiff
                ? colors.text.primary
                : colors.text.tertiary
          }
        />
      </TouchableOpacity>

      {/* Version indicator */}
      <Text style={styles.versionText}>
        {isLoading ? 'Loading...' : `Version ${currentIndex + 1} of ${totalVersions}`}
      </Text>
    </View>
  );
}

// Icon components using react-native-svg

function UndoIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7v6h6M3 13c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9a9 9 0 01-7.5-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function RedoIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 7v6h-6M21 13c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9a9 9 0 007.5-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 6v6l4 2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    padding: spacing.xs,
    borderRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonActive: {
    backgroundColor: colors.background.hover,
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
});
