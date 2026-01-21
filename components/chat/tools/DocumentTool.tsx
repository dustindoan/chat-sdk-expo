/**
 * DocumentTool Component
 *
 * Tool UI component for createDocument and updateDocument results.
 * Shows a live streaming preview inline in the chat, similar to chat-sdk's pattern.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useArtifact } from '../../../contexts/ArtifactContext';
import { CodeContent } from '../../artifacts/CodeContent';
import { TextContent } from '../../artifacts/TextContent';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../theme';
import type { ToolUIProps } from './types';
import type { ArtifactKind } from '../../../lib/artifacts/types';

interface DocumentToolArgs {
  title: string;
  kind: ArtifactKind;
}

interface DocumentToolResult {
  id: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  content: string;
}

type DocumentToolProps = ToolUIProps<DocumentToolArgs, DocumentToolResult>;

/**
 * DocumentTool component
 * Shows live streaming preview during generation, then compact card when done
 */
export const DocumentTool = memo(function DocumentTool({
  toolName,
  state,
  args,
  result,
}: DocumentToolProps) {
  const { artifact, setArtifact, getDocument, getStreamingDocument } = useArtifact();

  const isToolLoading = state === 'partial-call' || state === 'call';
  const hasResult = (state === 'result' || state === 'output-available') && result;

  // Get streaming document for THIS specific tool invocation (by title or ID)
  // This enables each card to track its own streaming state independently
  const streamingDoc = args?.title ? getStreamingDocument(args.title) : undefined;
  const isStreamingThisDocument = streamingDoc?.status === 'streaming';

  // Get the document ID - prefer result (completed), then streaming doc, then stored
  const documentId = result?.id || streamingDoc?.id;
  const storedDoc = documentId ? getDocument(documentId) : undefined;

  // For completed cards, use ONLY stored doc or result data (NOT global artifact)
  // For streaming cards, use the per-document streaming state
  const title = result?.title || args?.title || streamingDoc?.title || 'Untitled';
  const kind = result?.kind || args?.kind || streamingDoc?.kind || 'text';

  // Language: use result first (for historical chats), then streaming doc, then stored doc
  const language = result?.language || streamingDoc?.language || storedDoc?.language;

  // Content: result content is just a placeholder string, so prefer stored/streaming
  const content =
    storedDoc?.content ??
    streamingDoc?.content;

  const [isLoading, setIsLoading] = useState(false);

  // Handle opening the full artifact panel
  const handleOpenPanel = useCallback(async () => {
    // If we already have content, open panel directly
    if (content) {
      setArtifact({
        documentId: documentId || '',
        title,
        kind,
        content,
        language,
        status: 'idle',
        isVisible: true,
      });
      return;
    }

    // Otherwise, fetch from API
    if (documentId) {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (response.ok) {
          const doc = await response.json();
          setArtifact({
            documentId: doc.id,
            title: doc.title,
            kind: doc.kind,
            content: doc.content || '',
            language: doc.language,
            status: 'idle',
            isVisible: true,
          });
        } else {
          console.error('Failed to fetch document');
          // Still open panel with whatever we have
          setArtifact({
            documentId: documentId || '',
            title,
            kind,
            content: '',
            language,
            status: 'idle',
            isVisible: true,
          });
        }
      } catch (error) {
        console.error('Error fetching document:', error);
        setArtifact({
          documentId: documentId || '',
          title,
          kind,
          content: '',
          language,
          status: 'idle',
          isVisible: true,
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [documentId, title, kind, content, language, setArtifact]);

  // Show streaming preview when generating
  if (isStreamingThisDocument || (isToolLoading && !hasResult)) {
    const displayContent = streamingDoc?.content || '';
    const isStreaming = streamingDoc?.status === 'streaming';

    return (
      <View style={styles.previewContainer}>
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={handleOpenPanel}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            {isStreaming ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : kind === 'code' ? (
              <Feather name="code" size={16} color={colors.text.secondary} />
            ) : (
              <Feather name="file-text" size={16} color={colors.text.secondary} />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Feather name="maximize-2" size={16} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Content preview - same rendering as artifact panel */}
        <View style={styles.contentWrapper}>
          {displayContent ? (
            kind === 'code' ? (
              <CodeContent
                content={displayContent}
                status={isStreaming ? 'streaming' : 'idle'}
                language={language || 'javascript'}
              />
            ) : (
              <TextContent
                content={displayContent}
                status={isStreaming ? 'streaming' : 'idle'}
              />
            )
          ) : (
            <View style={styles.loadingContent}>
              <ActivityIndicator size="small" color={colors.accent.primary} />
              <Text style={styles.loadingText}>
                {toolName === 'createDocument' ? 'Creating' : 'Updating'}{' '}
                {kind === 'code' ? 'code' : 'document'}...
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Show compact card when done (Claude web style - minimal, 2 lines)
  if (hasResult) {
    const kindLabel = kind === 'code' ? 'Code' : 'Document';
    // Detect language for code documents (lowercase to match artifact panel)
    const languageLabel = kind === 'code' && language ? language : null;

    return (
      <TouchableOpacity
        style={[styles.cardContainer, isLoading && styles.cardContainerLoading]}
        onPress={handleOpenPanel}
        activeOpacity={0.7}
        disabled={isLoading}
        accessibilityLabel={`Open ${title} ${kindLabel}`}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.text.secondary} />
          ) : (
            <Feather name="code" size={20} color={colors.text.secondary} />
          )}
        </View>

        {/* Content - just title and type */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.cardSubtitle}>
            {isLoading ? 'Loading...' : `${kindLabel}${languageLabel ? ` · ${languageLabel}` : ''}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Fallback - shouldn't reach here normally
  return null;
});

const styles = StyleSheet.create({
  // Streaming preview styles
  previewContainer: {
    maxWidth: 450,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    ...(Platform.OS === 'web' && ({ cursor: 'pointer' } as any)),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  contentWrapper: {
    maxHeight: 250,
    overflow: 'hidden',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },

  // Card styles (compact after completion - Claude web style)
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
    gap: spacing.md,
    maxWidth: 450,
    ...(Platform.OS === 'web' && ({ cursor: 'pointer' } as any)),
  },
  cardContainerLoading: {
    opacity: 0.7,
    ...(Platform.OS === 'web' && ({ cursor: 'wait' } as any)),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
});
