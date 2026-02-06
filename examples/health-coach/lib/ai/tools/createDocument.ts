/**
 * createDocument Tool
 *
 * AI tool for creating new documents (text or code).
 * Following chat-sdk's createDocument pattern.
 */

import { tool, type UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { getDocumentHandler } from '../../artifacts/handlers';
import { saveDocument } from '../../db/queries';
import type { ArtifactKind, DataStreamWriter } from '../../artifacts/types';

/**
 * Supported artifact kinds
 */
export const artifactKinds: [ArtifactKind, ...ArtifactKind[]] = ['text', 'code', 'training-block'];

/**
 * Generate a random UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Props for createDocument tool factory
 */
interface CreateDocumentToolProps {
  /** Data stream writer for sending artifact data */
  dataStream: DataStreamWriter;
  /** API key for model access */
  apiKey: string;
  /** User ID for document ownership */
  userId: string;
}

/**
 * Create the createDocument tool
 * Factory function that takes dataStream context
 */
export function createDocumentTool({ dataStream, apiKey, userId }: CreateDocumentToolProps) {
  return tool({
    description: `Create a document with auto-generated content based on the title.
IMPORTANT: Call this tool only ONCE per request. The content is automatically generated - do not call again to "add" content.

Use when users ask for:
- Essays, stories, poems, articles, documentation
- Code, scripts, or programs
- Training plans, workout schedules, running programs

The document displays in a dedicated panel. After calling, briefly describe what was created.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe('The title or topic of the document to create'),
      kind: z
        .enum(artifactKinds)
        .describe('The type of document: "text" for written content, "code" for programming, "training-block" for workout training plans'),
    }),
    execute: async ({ title, kind }: { title: string; kind: ArtifactKind }) => {
      const id = generateUUID();
      let capturedLanguage: string | undefined;

      // Wrap dataStream to:
      // 1. Capture language for database persistence
      // 2. Transform events to include docId in compound data format for concurrent stream handling
      const wrappedDataStream: DataStreamWriter = {
        write: (data) => {
          // Capture language when it's sent
          if (data.type === 'data-language') {
            const langValue = typeof data.data === 'object' ? data.data.value : data.data;
            capturedLanguage = langValue;
          }

          // Transform data to compound format with docId (except for data-id which establishes the docId)
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

      // Send metadata first - data-id MUST come first to create the streaming entry
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

      wrappedDataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      // Get the appropriate handler and generate content
      const handler = getDocumentHandler(kind);
      if (!handler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      const content = await handler.onCreateDocument({
        id,
        title,
        dataStream: wrappedDataStream,
        apiKey,
      });

      // Save document to database
      try {
        await saveDocument({
          id,
          userId,
          title,
          content,
          kind,
          language: capturedLanguage,
        });
      } catch (error) {
        console.error('Failed to save document:', error);
        // Continue even if save fails - document is still in memory
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
        language: capturedLanguage,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });
}

/**
 * Tool result type
 */
export interface CreateDocumentResult {
  id: string;
  title: string;
  kind: ArtifactKind;
  language?: string;
  content: string;
}
