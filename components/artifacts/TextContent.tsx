/**
 * TextContent Component
 *
 * Renders text artifact content with markdown formatting.
 * Used inside the artifact panel for text documents.
 */

import React, { memo } from 'react';
import { View, ScrollView } from 'react-native';
import { SimpleMarkdown } from '../chat/SimpleMarkdown';
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
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={true}
    >
      <View className="min-h-[200px]">
        <SimpleMarkdown text={content + (isStreaming ? '\u258C' : '')} />
      </View>
    </ScrollView>
  );
});
