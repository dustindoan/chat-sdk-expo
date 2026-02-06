/**
 * DocumentPreview Component
 *
 * Compact preview card shown inline in chat messages.
 * Clicking opens the full artifact panel.
 */

import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { useArtifact } from '../../contexts/ArtifactContext';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
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
  const primaryStyle = useResolveClassNames('text-primary');
  const disabledStyle = useResolveClassNames('text-disabled');

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
    <Button
      variant="ghost"
      className="my-2 h-auto flex-row items-center gap-3 rounded-lg border border-border bg-secondary p-3"
      onPress={handlePress}
      accessibilityLabel={`Open ${title} ${kindLabel}`}
    >
      {/* Icon */}
      <View className="h-11 w-11 items-center justify-center rounded-md bg-card">
        <Feather name={kindIcon} size={24} color={primaryStyle.color as string} />
      </View>

      {/* Content */}
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold" numberOfLines={1}>
          {title || 'Untitled'}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="rounded bg-primary/20 px-2 py-0.5">
            <Text className="text-xs font-medium text-primary">{kindLabel}</Text>
          </View>
        </View>
        <Text variant="muted" className="text-sm leading-[18px]" numberOfLines={2}>
          {previewText}
        </Text>
      </View>

      {/* Arrow */}
      <View className="p-1">
        <Feather name="chevron-right" size={20} color={disabledStyle.color as string} />
      </View>
    </Button>
  );
});
