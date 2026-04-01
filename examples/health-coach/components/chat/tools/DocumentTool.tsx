/**
 * DocumentTool Component
 *
 * Tool UI component for createDocument and updateDocument results.
 * Shows a live streaming preview inline in the chat, similar to chat-sdk's pattern.
 */

import React, { memo, useCallback, useState } from 'react';
import { View, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@chat-sdk-expo/ui/primitives';
import { useArtifact } from '../../../contexts/ArtifactContext';
import { CodeContent } from '@chat-sdk-expo/ui/artifacts';
import { TextContent } from '@chat-sdk-expo/ui/artifacts';
import { authFetch } from '../../../lib/auth/client';
import type { ToolUIProps } from './types';
import type { ArtifactKind } from '../../../lib/artifacts/types';

// createDocument args have title and kind
interface CreateDocumentArgs {
  title: string;
  kind: ArtifactKind;
}

// updateDocument args have id and description
interface UpdateDocumentArgs {
  id: string;
  description: string;
}

// Union type for both tool args
type DocumentToolArgs = CreateDocumentArgs | UpdateDocumentArgs;

interface DocumentToolResult {
  id: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  content: string;
}

type DocumentToolProps = ToolUIProps<DocumentToolArgs, DocumentToolResult>;

// Type guards for args
function isCreateDocumentArgs(args: DocumentToolArgs | undefined): args is CreateDocumentArgs {
  return args !== undefined && 'title' in args && 'kind' in args;
}

function isUpdateDocumentArgs(args: DocumentToolArgs | undefined): args is UpdateDocumentArgs {
  return args !== undefined && 'id' in args && 'description' in args;
}

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

  // Use useResolveClassNames for icon colors
  const tertiaryStyle = useResolveClassNames('text-tertiary');
  const primaryStyle = useResolveClassNames('text-primary');

  const isToolLoading = state === 'partial-call' || state === 'call';
  const hasResult = (state === 'result' || state === 'output-available') && result;

  // Get streaming document for THIS specific tool invocation
  // - For updateDocument: look up by ID (args.id)
  // - For createDocument: look up by title (args.title)
  // This ensures each card only shows its own streaming state
  let streamingDoc;
  if (isUpdateDocumentArgs(args)) {
    // updateDocument - look up by the document ID
    streamingDoc = getStreamingDocument(args.id);
  } else if (isCreateDocumentArgs(args)) {
    // createDocument - look up by title
    streamingDoc = getStreamingDocument(args.title);
  }
  const isStreamingThisDocument = streamingDoc?.status === 'streaming';

  // Get the document ID - prefer result (completed), then streaming doc, then args (for update)
  const documentId = result?.id || streamingDoc?.id || (isUpdateDocumentArgs(args) ? args.id : undefined);
  const storedDoc = documentId ? getDocument(documentId) : undefined;

  // For completed cards, use ONLY stored doc or result data (NOT global artifact)
  // For streaming cards, use the per-document streaming state
  const title = result?.title || (isCreateDocumentArgs(args) ? args.title : undefined) || streamingDoc?.title || 'Untitled';
  const kind = result?.kind || (isCreateDocumentArgs(args) ? args.kind : undefined) || streamingDoc?.kind || 'text';

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
        const response = await authFetch(`/api/documents/${documentId}`);
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
  // IMPORTANT: Never show streaming preview if this tool invocation already has a result
  // This prevents completed createDocument cards from showing updateDocument streaming
  if (!hasResult && (isStreamingThisDocument || isToolLoading)) {
    const displayContent = streamingDoc?.content || '';
    const isStreaming = streamingDoc?.status === 'streaming';

    return (
      <View className="my-2 max-w-[450px] overflow-hidden rounded-xl border border-subtle">
        {/* Header */}
        <Pressable
          className="flex-row items-center justify-between border-b border-subtle bg-subtle px-3 py-2"
          style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
          onPress={handleOpenPanel}
        >
          <View className="flex-1 flex-row items-center gap-2">
            {isStreaming ? (
              <ActivityIndicator size="small" color={tertiaryStyle.color as string} />
            ) : kind === 'code' ? (
              <Feather name="code" size={16} color={tertiaryStyle.color as string} />
            ) : (
              <Feather name="file-text" size={16} color={tertiaryStyle.color as string} />
            )}
            <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Feather name="maximize-2" size={16} color={tertiaryStyle.color as string} />
        </Pressable>

        {/* Content preview - same rendering as artifact panel */}
        <View className="max-h-[250px] overflow-hidden">
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
            <View className="flex-row items-center justify-center gap-2 py-4">
              <ActivityIndicator size="small" color={primaryStyle.color as string} />
              <Text className="text-sm text-muted-foreground">
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
      <Pressable
        className={`my-2 max-w-[450px] flex-row items-center gap-3 rounded-xl bg-subtle px-3 py-2 ${isLoading ? 'opacity-70' : ''}`}
        style={Platform.OS === 'web' ? ({ cursor: isLoading ? 'wait' : 'pointer' } as any) : undefined}
        onPress={handleOpenPanel}
        disabled={isLoading}
        accessibilityLabel={`Open ${title} ${kindLabel}`}
      >
        {/* Icon */}
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          {isLoading ? (
            <ActivityIndicator size="small" color={tertiaryStyle.color as string} />
          ) : (
            <Feather name="code" size={20} color={tertiaryStyle.color as string} />
          )}
        </View>

        {/* Content - just title and type */}
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-medium text-foreground" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {isLoading ? 'Loading...' : `${kindLabel}${languageLabel ? ` · ${languageLabel}` : ''}`}
          </Text>
        </View>
      </Pressable>
    );
  }

  // Fallback - shouldn't reach here normally
  return null;
});
