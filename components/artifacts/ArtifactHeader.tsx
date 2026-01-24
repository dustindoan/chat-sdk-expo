/**
 * ArtifactHeader Component
 *
 * Header bar for the artifact panel showing title, kind badge, and actions.
 * Phase 7: Added version navigation controls.
 */

import React, { memo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { colors } from '@/lib/theme';
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
          <Feather name="x" size={20} color={colors.tertiary} />
        </Button>

        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold" numberOfLines={1}>
            {title || 'Untitled'}
          </Text>
          <View className="flex-row items-center gap-1">
            <Feather name={kindIcon} size={12} color={colors.tertiary} />
            <Text variant="muted" className="text-xs">{kindLabel}</Text>
          </View>
        </View>
      </View>

      {/* Right side: version navigation, status and actions */}
      <View className="flex-row items-center gap-2">
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
            <ActivityIndicator size="small" color={colors.primary} />
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
            color={isStreaming ? colors.disabled : colors.tertiary}
          />
        </Button>
      </View>
    </View>
  );
});
