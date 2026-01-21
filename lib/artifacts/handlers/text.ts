/**
 * Text Document Handler
 *
 * Server-side handler for creating and updating text documents.
 * Following chat-sdk's textDocumentHandler pattern.
 */

import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { DocumentHandler, CreateDocumentArgs, UpdateDocumentArgs } from '../types';

/**
 * Get the Anthropic model for artifact generation
 * Uses a fast model for document generation
 */
function getArtifactModel(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
    baseURL: 'https://api.anthropic.com/v1',
  });
  // Use Haiku for faster generation
  return anthropic('claude-haiku-4-5-20251001');
}

/**
 * Text document handler
 * Creates markdown documents based on the title/prompt
 */
export const textDocumentHandler: DocumentHandler<'text'> = {
  kind: 'text',

  async onCreateDocument({ id, title, dataStream, apiKey }): Promise<string> {
    if (!apiKey) {
      return 'Error: No API key available for document generation.';
    }

    let draftContent = '';

    try {
      const { fullStream } = streamText({
        model: getArtifactModel(apiKey),
        system: `You are a helpful writing assistant. Write about the given topic.
Use Markdown formatting where appropriate:
- Use headings (##, ###) to organize content
- Use bullet points and numbered lists for clarity
- Use **bold** and *italic* for emphasis
- Use code blocks for technical content

Write comprehensive, well-structured content.`,
        prompt: title,
      });

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          const { text } = delta;
          draftContent += text;

          // Send FULL content on each delta (not incremental) to handle concurrent streams
          // This matches chat-sdk's behavior where each delta contains complete content
          dataStream.write({
            type: 'data-textDelta',
            data: draftContent,
            transient: true,
          });
        }
      }
    } catch (error) {
      console.error('Error streaming text document:', error);
      draftContent = `Error generating content: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return draftContent;
  },

  async onUpdateDocument({ document, description, dataStream, apiKey }): Promise<string> {
    let draftContent = '';

    try {
      const { fullStream } = streamText({
        model: getArtifactModel(apiKey),
        system: `You are a helpful writing assistant. You have been given a document to update.

Current document content:
---
${document.content}
---

Update the document according to the user's instructions. Maintain the same style and format.
Output only the complete updated document, no explanations.`,
        prompt: description,
      });

      for await (const delta of fullStream) {
        if (delta.type === 'text-delta') {
          const { text } = delta;
          draftContent += text;

          // Send FULL content on each delta (not incremental) to handle concurrent streams
          dataStream.write({
            type: 'data-textDelta',
            data: draftContent,
            transient: true,
          });
        }
      }
    } catch (error) {
      console.error('Error updating text document:', error);
      draftContent = `Error updating content: ${error instanceof Error ? error.message : 'Unknown error'}\n\n---\n\n${document.content}`;
    }

    return draftContent;
  },
};
