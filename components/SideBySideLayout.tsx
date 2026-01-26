/**
 * SideBySideLayout Component
 *
 * Wraps main content and artifact panel for side-by-side layout on web.
 * On mobile, the artifact panel overlays the content.
 * On desktop web, the content shrinks and artifact panel sits beside it.
 *
 * IMPORTANT: Uses a single render path to prevent children from remounting
 * when artifact visibility changes.
 */

import React, { memo, type ReactNode } from 'react';
import { View, Platform, useWindowDimensions } from 'react-native';
import { useArtifact } from '../contexts/ArtifactContext';
import { ArtifactPanel } from './artifacts/ArtifactPanel';
import { cn } from '@/lib/utils';

interface SideBySideLayoutProps {
  children: ReactNode;
}

/**
 * SideBySideLayout component
 * Handles responsive layout for chat + artifact panel
 */
export const SideBySideLayout = memo(function SideBySideLayout({
  children,
}: SideBySideLayoutProps) {
  const { artifact } = useArtifact();
  const { width: windowWidth } = useWindowDimensions();

  // Determine layout mode
  const isDesktopWeb = Platform.OS === 'web' && windowWidth >= 768;
  const isArtifactVisible = artifact.isVisible && artifact.documentId;

  // Calculate widths for side-by-side layout
  const artifactPanelWidth = isDesktopWeb
    ? Math.min(windowWidth * 0.5, 600)
    : windowWidth;

  // Use single render path to prevent children from remounting
  // On desktop: use flexbox row layout, show/hide artifact panel
  // On mobile: use overlay mode for artifact panel
  return (
    <View className={cn('flex-1 bg-background', isDesktopWeb && 'flex-row')}>
      {/* Main content - always rendered in same position */}
      <View className="flex-1 overflow-hidden">
        {children}
      </View>

      {/* Artifact panel */}
      {isDesktopWeb ? (
        // Desktop: inline panel with conditional width (0 when hidden)
        isArtifactVisible && (
          <View style={{ width: artifactPanelWidth }} className="border-l border-subtle">
            <ArtifactPanel mode="inline" />
          </View>
        )
      ) : (
        // Mobile: overlay mode
        <ArtifactPanel mode="overlay" />
      )}
    </View>
  );
});
