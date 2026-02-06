/**
 * Code Document Handler
 *
 * Server-side handler for creating and updating code documents.
 * Following chat-sdk's codeDocumentHandler pattern with streamObject.
 */

import { streamObject } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { DocumentHandler, CreateDocumentArgs, UpdateDocumentArgs } from '../types';

/**
 * Get the Anthropic model for code generation
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
 * Detect programming language from title
 * Order matters - more specific patterns checked first to avoid false matches
 * (e.g., 'css' before 'c' so '.css' doesn't match 'c')
 */
export function detectLanguage(title: string): string {
  const titleLower = title.toLowerCase();

  // Ordered array to control matching priority
  const languagePatterns: [string, string[]][] = [
    ['typescript', ['typescript', '.ts', '.tsx', 'tsx']],
    ['javascript', ['javascript', '.js', '.jsx', 'jsx', 'node']],
    ['python', ['python', '.py', 'django', 'flask']],
    ['rust', ['rust', '.rs', 'cargo']],
    ['go', ['golang', '.go']],
    ['java', ['.java']], // Be specific to avoid matching 'javascript'
    ['cpp', ['c++', 'cpp', '.cpp', '.cc']],
    ['ruby', ['ruby', '.rb', 'rails']],
    ['php', ['php', '.php']],
    ['swift', ['swift', '.swift']],
    ['kotlin', ['kotlin', '.kt', 'android']],
    ['sql', ['sql', 'query', 'database']],
    ['html', ['html', '.html', 'webpage']],
    ['css', ['css', '.css', 'styles', 'stylesheet']], // Must be before 'c'
    ['shell', ['bash', 'shell', '.sh', 'terminal']],
    ['json', ['json', '.json']],
    ['yaml', ['yaml', 'yml', '.yaml']],
    ['c', [' c ', '.c ']], // Only match with surrounding spaces to avoid false positives
  ];

  for (const [language, patterns] of languagePatterns) {
    if (patterns.some((pattern) => titleLower.includes(pattern))) {
      return language;
    }
  }

  // Default to typescript for generic code requests
  return 'typescript';
}

/**
 * Code document handler
 * Creates code files based on the title/prompt
 */
export const codeDocumentHandler: DocumentHandler<'code'> = {
  kind: 'code',

  async onCreateDocument({ id, title, dataStream, apiKey }): Promise<string> {
    const detectedLanguage = detectLanguage(title);

    // Send language info first
    dataStream.write({
      type: 'data-language',
      data: detectedLanguage,
      transient: true,
    });

    let draftContent = '';

    try {
      const { fullStream } = streamObject({
        model: getArtifactModel(apiKey),
        system: `You are an expert programmer. Write code based on the user's request.

Language: ${detectedLanguage}

Guidelines:
- Write clean, well-documented code
- Include helpful comments explaining key sections
- Follow best practices for the language
- Handle edge cases appropriately`,
        prompt: title,
        schema: z.object({
          code: z.string().describe('The complete code implementation'),
        }),
      });

      for await (const delta of fullStream) {
        if (delta.type === 'object') {
          const { object } = delta;
          const { code } = object;

          if (code) {
            dataStream.write({
              type: 'data-codeDelta',
              data: code,
              transient: true,
            });

            draftContent = code;
          }
        }
      }
    } catch (error) {
      console.error('Error streaming code document:', error);
      // Return error message as content if streaming fails
      draftContent = `// Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return draftContent;
  },

  async onUpdateDocument({ document, description, dataStream, apiKey }): Promise<string> {
    let draftContent = '';

    try {
      const { fullStream } = streamObject({
        model: getArtifactModel(apiKey),
        system: `You are an expert programmer. You have been given code to update.

Current code:
---
${document.content}
---

Update the code according to the user's instructions. Maintain the same style and format.`,
        prompt: description,
        schema: z.object({
          code: z.string().describe('The complete updated code'),
        }),
      });

      for await (const delta of fullStream) {
        if (delta.type === 'object') {
          const { object } = delta;
          const { code } = object;

          if (code) {
            dataStream.write({
              type: 'data-codeDelta',
              data: code,
              transient: true,
            });

            draftContent = code;
          }
        }
      }
    } catch (error) {
      console.error('Error updating code document:', error);
      // Return original content with error comment if update fails
      draftContent = `// Error updating code: ${error instanceof Error ? error.message : 'Unknown error'}\n\n${document.content}`;
    }

    return draftContent;
  },
};
