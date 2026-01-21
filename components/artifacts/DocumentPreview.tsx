/**
 * DocumentPreview Component
 *
 * Compact preview card shown inline in chat messages.
 * Clicking opens the full artifact panel.
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useArtifact } from '../../contexts/ArtifactContext';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../theme';
import type { ArtifactKind } from '../../lib/artifacts/types';

interface DocumentPreviewProps {
  /** Document ID */
  id: string;
  /** Document title */
  title: string;
  /** Document kind */
  kind: ArtifactKind;
  /** Document content (for preview) */
  content?: string;
  /** Programming language (for code) */
  language?: string;
}

/**
 * DocumentPreview component
 * Shows a clickable card preview of an artifact in the message bubble
 */
export const DocumentPreview = memo(function DocumentPreview({
  id,
  title,
  kind,
  content,
  language,
}: DocumentPreviewProps) {
  const { setArtifact, showArtifact } = useArtifact();

  const handlePress = useCallback(() => {
    // Set the artifact state and show the panel
    setArtifact({
      documentId: id,
      title,
      kind,
      content: content || '',
      language,
      status: 'idle',
      isVisible: true,
    });
  }, [id, title, kind, content, language, setArtifact]);

  const kindLabel = kind === 'code' ? 'Code' : 'Document';
  const kindIcon = kind === 'code' ? 'code' : 'file-text';
  const previewText = content
    ? content.slice(0, 100) + (content.length > 100 ? '...' : '')
    : 'Click to view';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={`Open ${title} ${kindLabel}`}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Feather name={kindIcon} size={24} color={colors.accent.primary} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'Untitled'}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.kindBadge}>
            <Text style={styles.kindText}>{kindLabel}</Text>
          </View>
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {previewText}
        </Text>
      </View>

      {/* Arrow */}
      <View style={styles.arrowContainer}>
        <Feather name="chevron-right" size={20} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.md,
    ...(Platform.OS === 'web' && ({ cursor: 'pointer' } as any)),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kindBadge: {
    backgroundColor: colors.accent.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  kindText: {
    fontSize: fontSize.xs,
    color: colors.accent.primary,
    fontWeight: fontWeight.medium,
  },
  preview: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  arrowContainer: {
    padding: spacing.xs,
  },
});
