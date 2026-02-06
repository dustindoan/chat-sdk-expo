/**
 * VersionNavigation - Header controls for version history navigation
 *
 * Provides prev/next buttons, diff toggle, and version indicator.
 * Follows chat-sdk's index-based navigation pattern.
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

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
  const foregroundStyle = useResolveClassNames('text-foreground');
  const disabledStyle = useResolveClassNames('text-disabled');
  const primaryStyle = useResolveClassNames('text-primary');

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalVersions - 1;
  const canToggleDiff = currentIndex > 0; // Can't diff if at first version
  const isDiffMode = mode === 'diff';

  // Don't render if only one version
  if (totalVersions <= 1) {
    return null;
  }

  return (
    <View className="flex-row items-center gap-1">
      {/* Prev button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onPress={onPrev}
        disabled={!canGoPrev || isLoading}
        accessibilityLabel="Previous version"
      >
        <UndoIcon color={canGoPrev ? foregroundStyle.color as string : disabledStyle.color as string} />
      </Button>

      {/* Next button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onPress={onNext}
        disabled={!canGoNext || isLoading}
        accessibilityLabel="Next version"
      >
        <RedoIcon color={canGoNext ? foregroundStyle.color as string : disabledStyle.color as string} />
      </Button>

      {/* Diff toggle button */}
      <Button
        variant={isDiffMode ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onPress={onToggleDiff}
        disabled={!canToggleDiff || isLoading}
        accessibilityLabel={isDiffMode ? 'Hide diff' : 'Show diff'}
      >
        <ClockIcon
          color={
            isDiffMode
              ? primaryStyle.color as string
              : canToggleDiff
                ? foregroundStyle.color as string
                : disabledStyle.color as string
          }
        />
      </Button>

      {/* Version indicator */}
      <Text variant="muted" className="ml-1 text-xs">
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
