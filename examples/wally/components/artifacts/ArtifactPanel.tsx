/**
 * ArtifactPanel Component
 *
 * Slide-in panel for displaying artifact content.
 * Supports two modes:
 * - 'overlay': Slides in from right with backdrop (mobile)
 * - 'inline': Rendered inline in side-by-side layout (desktop web)
 *
 * Phase 7: Added version history navigation and diff view.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useArtifact } from '../../contexts/ArtifactContext';
import { ArtifactHeader } from './ArtifactHeader';
import { TextContent } from './TextContent';
import { CodeContent } from './CodeContent';
import { TrainingBlockContent } from './TrainingBlockContent';
import { DiffView } from './DiffView';
import { VersionFooter } from './VersionFooter';

const ANIMATION_DURATION = 250;

interface ArtifactPanelProps {
  /** Display mode: 'overlay' for mobile, 'inline' for desktop side-by-side */
  mode?: 'overlay' | 'inline';
}

/**
 * ArtifactPanel component
 * Animated slide-in panel from the right (overlay) or inline panel (side-by-side)
 */
export const ArtifactPanel = memo(function ArtifactPanel({
  mode = 'overlay',
}: ArtifactPanelProps) {
  const {
    artifact,
    hideArtifact,
    versionState,
    fetchVersions,
    handleVersionChange,
    restoreVersion,
    getDocumentContentByIndex,
    isCurrentVersion,
  } = useArtifact();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isRestoring, setIsRestoring] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  // Fetch versions when panel opens with a document
  const lastDocumentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      artifact.isVisible &&
      artifact.documentId &&
      artifact.status === 'idle' &&
      artifact.documentId !== lastDocumentIdRef.current
    ) {
      lastDocumentIdRef.current = artifact.documentId;
      fetchVersions(artifact.documentId);
    }
  }, [artifact.isVisible, artifact.documentId, artifact.status, fetchVersions]);

  // Calculate panel width based on screen size (for overlay mode, 50% on desktop)
  const isMobile = windowWidth < 768;
  const panelWidth = isMobile ? windowWidth : windowWidth * 0.5;

  // Animation values (only used in overlay mode)
  const slideAnim = useRef(new Animated.Value(panelWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Track visibility for animation
  const isVisible = artifact.isVisible;

  useEffect(() => {
    // Only animate in overlay mode
    if (mode !== 'overlay') return;

    if (isVisible) {
      // Slide in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: panelWidth,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, panelWidth, slideAnim, fadeAnim, mode]);

  const handleCopy = useCallback(async () => {
    // Copy the content of the current version being viewed
    const contentToCopy =
      versionState.currentVersionIndex >= 0 && versionState.versions.length > 0
        ? getDocumentContentByIndex(versionState.currentVersionIndex)
        : artifact.content;

    if (contentToCopy) {
      await Clipboard.setStringAsync(contentToCopy);
      // Could add a toast notification here
    }
  }, [artifact.content, versionState, getDocumentContentByIndex]);

  const handleClose = useCallback(() => {
    hideArtifact();
    lastDocumentIdRef.current = null;
  }, [hideArtifact]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      await restoreVersion();
    } finally {
      setIsRestoring(false);
    }
  }, [restoreVersion]);

  const handleBackToLatest = useCallback(() => {
    handleVersionChange('latest');
  }, [handleVersionChange]);

  // Get the content to display based on current version
  const displayContent =
    versionState.currentVersionIndex >= 0 && versionState.versions.length > 0
      ? getDocumentContentByIndex(versionState.currentVersionIndex)
      : artifact.content;

  // For diff view, get previous version's content
  const previousContent =
    versionState.currentVersionIndex > 0
      ? getDocumentContentByIndex(versionState.currentVersionIndex - 1)
      : '';

  // Determine if we should show diff view
  const showDiff =
    versionState.mode === 'diff' && versionState.currentVersionIndex > 0;

  // Version props for header
  const versionProps = {
    currentIndex: versionState.currentVersionIndex,
    totalVersions: versionState.versions.length,
    mode: versionState.mode,
    isLoading: versionState.isLoadingVersions,
    onPrev: () => handleVersionChange('prev'),
    onNext: () => handleVersionChange('next'),
    onToggleDiff: () => handleVersionChange('toggle-diff'),
  };

  // Render content based on kind and view mode
  const getContentComponent = () => {
    if (artifact.kind === 'training-block') {
      return viewMode === 'preview' ? TrainingBlockContent : CodeContent;
    }
    return artifact.kind === 'code' ? CodeContent : TextContent;
  };
  const ContentComponent = getContentComponent();

  // Don't render if no document ID
  if (!artifact.documentId) {
    return null;
  }

  // Inline mode - render directly without overlay/animation
  if (mode === 'inline') {
    return (
      <View className="flex-1 bg-background">
        <ArtifactHeader
          title={artifact.title}
          kind={artifact.kind}
          status={artifact.status}
          onCopy={handleCopy}
          onClose={handleClose}
          versionProps={versionProps}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <View className="flex-1">
          {showDiff ? (
            <DiffView
              oldContent={previousContent}
              newContent={displayContent}
              kind={artifact.kind}
            />
          ) : (
            <ContentComponent
              content={displayContent}
              status={artifact.status}
              language={artifact.language}
            />
          )}
        </View>

        {/* Show footer when viewing a historical version */}
        {!isCurrentVersion && artifact.status !== 'streaming' && (
          <VersionFooter
            onRestore={handleRestore}
            onBackToLatest={handleBackToLatest}
            isRestoring={isRestoring}
          />
        )}
      </View>
    );
  }

  // Overlay mode - animated slide-in with backdrop
  return (
    <View
      className={`absolute inset-0 z-[1000] ${!isVisible ? 'pointer-events-none' : ''}`}
      pointerEvents={isVisible ? 'auto' : 'none'}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          className="absolute inset-0 bg-black"
          style={{
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          }}
        />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        className="absolute right-0 top-0 border-l border-subtle bg-background"
        style={{
          width: panelWidth,
          height: windowHeight,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          transform: [{ translateX: slideAnim }],
          ...Platform.select({
            web: {
              boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.2)',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: -4, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 16,
            },
          }),
        }}
      >
        <ArtifactHeader
          title={artifact.title}
          kind={artifact.kind}
          status={artifact.status}
          onCopy={handleCopy}
          onClose={handleClose}
          versionProps={versionProps}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <View className="flex-1">
          {showDiff ? (
            <DiffView
              oldContent={previousContent}
              newContent={displayContent}
              kind={artifact.kind}
            />
          ) : (
            <ContentComponent
              content={displayContent}
              status={artifact.status}
              language={artifact.language}
            />
          )}
        </View>

        {/* Show footer when viewing a historical version */}
        {!isCurrentVersion && artifact.status !== 'streaming' && (
          <VersionFooter
            onRestore={handleRestore}
            onBackToLatest={handleBackToLatest}
            isRestoring={isRestoring}
          />
        )}
      </Animated.View>
    </View>
  );
});

