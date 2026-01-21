/**
 * ArtifactPanel Component
 *
 * Slide-in panel for displaying artifact content.
 * Supports two modes:
 * - 'overlay': Slides in from right with backdrop (mobile)
 * - 'inline': Rendered inline in side-by-side layout (desktop web)
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useArtifact } from '../../contexts/ArtifactContext';
import { ArtifactHeader } from './ArtifactHeader';
import { TextContent } from './TextContent';
import { CodeContent } from './CodeContent';
import { colors } from '../theme';

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
  const { artifact, hideArtifact } = useArtifact();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Calculate panel width based on screen size (for overlay mode)
  const isMobile = windowWidth < 768;
  const panelWidth = isMobile ? windowWidth : Math.min(windowWidth * 0.5, 600);

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
    if (artifact.content) {
      await Clipboard.setStringAsync(artifact.content);
      // Could add a toast notification here
    }
  }, [artifact.content]);

  const handleClose = useCallback(() => {
    hideArtifact();
  }, [hideArtifact]);

  // Render content based on kind
  const ContentComponent = artifact.kind === 'code' ? CodeContent : TextContent;

  // Don't render if no document ID
  if (!artifact.documentId) {
    return null;
  }

  // Inline mode - render directly without overlay/animation
  if (mode === 'inline') {
    return (
      <View style={styles.inlinePanel}>
        <ArtifactHeader
          title={artifact.title}
          kind={artifact.kind}
          status={artifact.status}
          onCopy={handleCopy}
          onClose={handleClose}
        />

        <View style={styles.content}>
          <ContentComponent
            content={artifact.content}
            status={artifact.status}
            language={artifact.language}
          />
        </View>
      </View>
    );
  }

  // Overlay mode - animated slide-in with backdrop
  return (
    <View style={[styles.container, !isVisible && styles.hidden]} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            height: windowHeight,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <ArtifactHeader
          title={artifact.title}
          kind={artifact.kind}
          status={artifact.status}
          onCopy={handleCopy}
          onClose={handleClose}
        />

        <View style={styles.content}>
          <ContentComponent
            content={artifact.content}
            status={artifact.status}
            language={artifact.language}
          />
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  hidden: {
    pointerEvents: 'none',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: colors.background.primary,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
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
  },
  // Inline mode styles (for side-by-side layout on desktop)
  inlinePanel: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
});
