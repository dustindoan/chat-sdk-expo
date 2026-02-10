/**
 * getDocument Tool
 *
 * AI tool for reading existing documents.
 * Gives the agent visibility into artifact content — the equivalent
 * of a "Read" tool for documents. Without this, the agent can write
 * to artifacts but can't verify or reference what they contain.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDocumentById } from '../../db/queries';

/**
 * Props for getDocument tool factory
 */
interface GetDocumentToolProps {
  /** User ID for document ownership scoping */
  userId: string;
}

/**
 * Create the getDocument tool
 * Factory function that takes userId for DB scoping
 */
export function getDocumentTool({ userId }: GetDocumentToolProps) {
  return tool({
    description: `Read the current content of a document by its ID.
Use this when you need to:
- Verify what a document actually contains after creating or updating it
- Reference specific details from a document when responding to user feedback
- Check if a previous update was applied correctly

You need the document ID from a previous createDocument or updateDocument call.`,
    inputSchema: z.object({
      id: z
        .string()
        .describe('The ID of the document to read'),
    }),
    execute: async ({ id }: { id: string }) => {
      const doc = await getDocumentById(id, userId);
      if (!doc) {
        return {
          id,
          error: `Document with ID ${id} not found.`,
        };
      }

      return {
        id: doc.id,
        title: doc.title,
        kind: doc.kind,
        content: doc.content,
      };
    },
  });
}

/**
 * Tool result type
 */
export interface GetDocumentResult {
  id: string;
  title?: string;
  kind?: string;
  content?: string;
  error?: string;
}
