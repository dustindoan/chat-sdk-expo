/**
 * TextContent Component
 *
 * Renders text artifact content with markdown formatting.
 * Used inside the artifact panel for text documents.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SimpleMarkdown } from '../chat/SimpleMarkdown';
import { colors, spacing } from '../theme';
import type { ArtifactContentProps } from '../../lib/artifacts/types';

/**
 * TextContent component
 * Renders markdown-formatted text with streaming cursor
 */
export const TextContent = memo(function TextContent({
  content,
  status,
}: ArtifactContentProps) {
  const isStreaming = status === 'streaming';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.content}>
        <SimpleMarkdown text={content + (isStreaming ? '\u258C' : '')} />
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  content: {
    minHeight: 200,
  },
});
