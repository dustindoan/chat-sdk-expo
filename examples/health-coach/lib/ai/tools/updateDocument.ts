/**
 * updateDocument Tool
 *
 * AI tool for updating existing documents.
 * Following chat-sdk's updateDocument pattern.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDocumentHandler } from '../../artifacts/handlers';
import { getDocumentById, saveDocument } from '../../db/queries';
import type { ArtifactKind, DataStreamWriter } from '../../artifacts/types';

/**
 * Props for updateDocument tool factory
 */
interface UpdateDocumentToolProps {
  /** Data stream writer for sending artifact data */
  dataStream: DataStreamWriter;
  /** API key for model access */
  apiKey: string;
  /** User ID for document ownership */
  userId: string;
  /**
   * Optional callback that provides pre-built content (e.g., from ASSESS's planDraft).
   * When the LLM doesn't provide explicit `content` and this returns a non-null string,
   * that string is used as the replacement content — bypassing LLM generation without
   * requiring the LLM to echo large payloads in tool call arguments.
   */
  planDraftProvider?: () => string | null;
}

/**
 * Create the updateDocument tool
 * Factory function that takes dataStream context
 */
export function updateDocumentTool({ dataStream, apiKey, userId, planDraftProvider }: UpdateDocumentToolProps) {
  return tool({
    description: `Update an existing document with new content based on user instructions.
Use this tool when the user asks you to:
- Modify, edit, or revise an existing document
- Add, remove, or change content in a document
- Refactor or improve existing code
- Adjust a training plan or workout schedule

You need the document ID from a previous createDocument call.`,
    inputSchema: z.object({
      id: z
        .string()
        .describe('The ID of the document to update'),
      description: z
        .string()
        .describe('What changes to make to the document'),
      content: z
        .string()
        .optional()
        .describe('Pre-built replacement content (e.g., JSON). When provided, replaces document content directly without LLM generation.'),
    }),
    execute: async ({
      id,
      description,
      content: prebuiltContent,
    }: {
      id: string;
      description: string;
      content?: string;
    }) => {
      // Fetch document from database (scoped by userId)
      const existingDoc = await getDocumentById(id, userId);
      if (!existingDoc) {
        return {
          id,
          title: 'Unknown',
          kind: 'text' as ArtifactKind,
          content: `Error: Document with ID ${id} not found.`,
        };
      }

      const { title, kind: rawKind, content, language } = existingDoc;
      const kind = rawKind as ArtifactKind;

      // Wrap dataStream to include docId in compound format for concurrent stream handling
      const wrappedDataStream: DataStreamWriter = {
        write: (data) => {
          if (data.type === 'data-id') {
            // data-id doesn't need transformation - the data IS the docId
            dataStream.write(data);
          } else if (data.type === 'data-clear' || data.type === 'data-finish') {
            // For null-data events, use { docId } format
            dataStream.write({ ...data, data: { docId: id } } as any);
          } else {
            // For value-data events, use { value, docId } format
            const value = typeof data.data === 'object' && 'value' in data.data
              ? data.data.value
              : data.data;
            dataStream.write({ ...data, data: { value, docId: id } } as any);
          }
        },
      };

      // Send metadata - data-id MUST come first to create the streaming entry
      wrappedDataStream.write({
        type: 'data-id',
        data: id,
        transient: true,
      });

      wrappedDataStream.write({
        type: 'data-kind',
        data: kind,
        transient: true,
      });

      wrappedDataStream.write({
        type: 'data-title',
        data: title,
        transient: true,
      });

      if (language) {
        wrappedDataStream.write({
          type: 'data-language',
          data: language,
          transient: true,
        });
      }

      wrappedDataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      let updatedContent: string;

      // Resolve content: explicit content > planDraftProvider > handler LLM
      const resolvedContent = prebuiltContent || (kind === 'training-block' ? planDraftProvider?.() : null);

      if (resolvedContent) {
        // Content bypass: stream pre-built content directly, skip handler LLM
        wrappedDataStream.write({
          type: 'data-codeDelta',
          data: resolvedContent,
          transient: true,
        });
        updatedContent = resolvedContent;
      } else {
        // Fallback: use handler's LLM generation
        const handler = getDocumentHandler(kind);
        if (!handler) {
          throw new Error(`No document handler found for kind: ${kind}`);
        }

        updatedContent = await handler.onUpdateDocument({
          document: { id, title, content },
          description,
          dataStream: wrappedDataStream,
          apiKey,
        });
      }

      // Save updated document to database
      try {
        await saveDocument({
          id,
          userId,
          title,
          content: updatedContent,
          kind,
          language,
        });
      } catch (error) {
        console.error('Failed to save updated document:', error);
      }

      // Signal completion
      wrappedDataStream.write({
        type: 'data-finish',
        data: null,
        transient: true,
      });

      return {
        id,
        title,
        kind,
        language,
        content: 'The document was updated and changes are now visible to the user.',
      };
    },
  });
}

/**
 * Tool result type
 */
export interface UpdateDocumentResult {
  id: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  content: string;
}
