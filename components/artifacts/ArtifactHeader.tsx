/**
 * ArtifactHeader Component
 *
 * Header bar for the artifact panel showing title, kind badge, and actions.
 * Phase 7: Added version navigation controls.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { ArtifactKind, ArtifactStatus } from '../../lib/artifacts/types';
import { VersionNavigation } from './VersionNavigation';

interface VersionProps {
  currentIndex: number;
  totalVersions: number;
  mode: 'view' | 'diff';
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleDiff: () => void;
}

interface ArtifactHeaderProps {
  title: string;
  kind: ArtifactKind;
  status: ArtifactStatus;
  onCopy: () => void;
  onClose: () => void;
  versionProps?: VersionProps;
}

/**
 * ArtifactHeader component
 * Shows title, kind badge, copy button, and close button
 */
export const ArtifactHeader = memo(function ArtifactHeader({
  title,
  kind,
  status,
  onCopy,
  onClose,
  versionProps,
}: ArtifactHeaderProps) {
  const isStreaming = status === 'streaming';
  const kindLabel = kind === 'code' ? 'Code' : 'Document';
  const kindIcon = kind === 'code' ? 'code' : 'file-text';

  return (
    <View style={styles.container}>
      {/* Left side: close button and title */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close artifact panel"
        >
          <Feather name="x" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Untitled'}
          </Text>
          <View style={styles.kindBadge}>
            <Feather name={kindIcon} size={12} color={colors.text.secondary} />
            <Text style={styles.kindText}>{kindLabel}</Text>
          </View>
        </View>
      </View>

      {/* Right side: version navigation, status and actions */}
      <View style={styles.rightSection}>
        {/* Version navigation (only when not streaming and has versions) */}
        {!isStreaming && versionProps && versionProps.totalVersions > 1 && (
          <VersionNavigation
            currentIndex={versionProps.currentIndex}
            totalVersions={versionProps.totalVersions}
            mode={versionProps.mode}
            isLoading={versionProps.isLoading}
            onPrev={versionProps.onPrev}
            onNext={versionProps.onNext}
            onToggleDiff={versionProps.onToggleDiff}
          />
        )}

        {isStreaming && (
          <View style={styles.streamingIndicator}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
            <Text style={styles.streamingText}>Generating...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.actionButton, isStreaming && styles.actionButtonDisabled]}
          onPress={onCopy}
          disabled={isStreaming}
          accessibilityLabel="Copy content"
        >
          <Feather
            name="copy"
            size={18}
            color={isStreaming ? colors.text.tertiary : colors.text.secondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.md,
  },
  titleSection: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kindText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
  },
  streamingText: {
    fontSize: fontSize.xs,
    color: colors.accent.primary,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    ...(Platform.OS === 'web' && ({ cursor: 'pointer' } as any)),
  },
  actionButtonDisabled: {
    opacity: 0.5,
    ...(Platform.OS === 'web' && ({ cursor: 'default' } as any)),
  },
});
