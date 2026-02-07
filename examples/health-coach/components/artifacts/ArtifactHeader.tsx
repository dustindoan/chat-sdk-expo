/**
 * ArtifactHeader Component
 *
 * Header bar for the artifact panel showing title, kind badge, and actions.
 * Phase 7: Added version navigation controls.
 */

import React, { memo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text, Button } from '@chat-sdk-expo/ui/primitives';
import { VersionNavigation, type ArtifactKind, type ArtifactStatus } from '@chat-sdk-expo/ui/artifacts';

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
  /** View mode for artifacts that support preview (e.g., training-block) */
  viewMode?: 'preview' | 'code';
  /** Callback when view mode changes */
  onViewModeChange?: (mode: 'preview' | 'code') => void;
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
  viewMode,
  onViewModeChange,
}: ArtifactHeaderProps) {
  const tertiaryStyle = useResolveClassNames('text-tertiary');
  const primaryStyle = useResolveClassNames('text-primary');
  const disabledStyle = useResolveClassNames('text-disabled');

  const isStreaming = status === 'streaming';

  // Determine labels based on kind
  const getKindLabel = () => {
    switch (kind) {
      case 'code': return 'Code';
      case 'training-block': return 'Training Plan';
      default: return 'Document';
    }
  };
  const kindLabel = getKindLabel();
  const kindIcon = kind === 'code' ? 'code' : kind === 'training-block' ? 'calendar' : 'file-text';

  // Check if this kind supports preview mode
  const supportsPreview = kind === 'training-block';

  return (
    <View className="min-h-[56px] flex-row items-center justify-between border-b border-border bg-card px-3 py-2">
      {/* Left side: close button and title */}
      <View className="flex-1 flex-row items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onPress={onClose}
          accessibilityLabel="Close artifact panel"
        >
          <Feather name="x" size={20} color={tertiaryStyle.color as string} />
        </Button>

        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold" numberOfLines={1}>
            {title || 'Untitled'}
          </Text>
          <View className="flex-row items-center gap-1">
            <Feather name={kindIcon} size={12} color={tertiaryStyle.color as string} />
            <Text variant="muted" className="text-xs">{kindLabel}</Text>
          </View>
        </View>
      </View>

      {/* Right side: view toggle, version navigation, status and actions */}
      <View className="flex-row items-center gap-2">
        {/* Preview/Code toggle for supported kinds */}
        {supportsPreview && onViewModeChange && (
          <View className="flex-row items-center rounded-lg bg-secondary p-0.5">
            <Button
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onPress={() => onViewModeChange('preview')}
            >
              <Feather
                name="eye"
                size={14}
                color={viewMode === 'preview' ? '#fff' : (tertiaryStyle.color as string)}
              />
            </Button>
            <Button
              variant={viewMode === 'code' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onPress={() => onViewModeChange('code')}
            >
              <Feather
                name="code"
                size={14}
                color={viewMode === 'code' ? '#fff' : (tertiaryStyle.color as string)}
              />
            </Button>
          </View>
        )}

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
          <View className="flex-row items-center gap-1 rounded-md bg-secondary px-2 py-1">
            <ActivityIndicator size="small" color={primaryStyle.color as string} />
            <Text className="text-xs text-primary">Generating...</Text>
          </View>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onPress={onCopy}
          disabled={isStreaming}
          accessibilityLabel="Copy content"
        >
          <Feather
            name="copy"
            size={18}
            color={isStreaming ? disabledStyle.color as string : tertiaryStyle.color as string}
          />
        </Button>
      </View>
    </View>
  );
});
