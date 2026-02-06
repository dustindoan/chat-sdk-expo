/**
 * Training Block Document Handler
 *
 * Server-side handler for creating and updating training blocks.
 * Uses streamObject to generate structured JSON training plans.
 */

import { streamObject } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { DocumentHandler, CreateDocumentArgs, UpdateDocumentArgs } from '../types';

/**
 * Get the Anthropic model for training block generation
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
 * Session type enum
 */
const sessionTypeSchema = z.enum(['run', 'strength', 'rest', 'cross-training']);

/**
 * Time of day for scheduling sessions
 */
const timeOfDaySchema = z.enum(['morning', 'afternoon', 'evening', 'any']);

/**
 * Individual workout session schema
 */
const sessionSchema = z.object({
  id: z.string().describe('Unique session ID (e.g., "2026-01-27-run-1")'),
  type: sessionTypeSchema.describe('Type of workout session'),
  title: z.string().describe('Short title for the session (e.g., "Easy Run", "Interval Training")'),
  timeOfDay: timeOfDaySchema.optional().describe('Recommended time of day for this session'),
  duration: z.string().optional().describe('Duration in human-readable format (e.g., "45 min")'),
  distance: z.string().optional().describe('Distance if applicable (e.g., "6 km")'),
  description: z.string().optional().describe('Detailed description of the workout'),
  completed: z.boolean().optional().describe('Whether the session has been completed'),
});

/**
 * Day in the training plan
 */
const daySchema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format'),
  sessions: z.array(sessionSchema).describe('Workout sessions for this day'),
});

/**
 * Week in the training plan
 */
const weekSchema = z.object({
  weekNumber: z.number().describe('Week number in the training block (1-indexed)'),
  startDate: z.string().describe('Start date of the week (YYYY-MM-DD)'),
  endDate: z.string().describe('End date of the week (YYYY-MM-DD)'),
  focus: z.string().optional().describe('Training focus for this week (e.g., "Base building", "Speed work")'),
  days: z.array(daySchema).describe('Days in this week with their sessions'),
});

/**
 * Complete training block schema
 */
const trainingBlockSchema = z.object({
  name: z.string().describe('Name of the training block (e.g., "Marathon Prep - Base Phase")'),
  goal: z.string().describe('Primary goal for this training block'),
  startDate: z.string().describe('Start date of the training block (YYYY-MM-DD)'),
  endDate: z.string().describe('End date of the training block (YYYY-MM-DD)'),
  weeks: z.array(weekSchema).describe('Weeks in the training block'),
});

export type TrainingBlock = z.infer<typeof trainingBlockSchema>;
export type TrainingWeek = z.infer<typeof weekSchema>;
export type TrainingDay = z.infer<typeof daySchema>;
export type TrainingSession = z.infer<typeof sessionSchema>;
export type SessionType = z.infer<typeof sessionTypeSchema>;
export type TimeOfDay = z.infer<typeof timeOfDaySchema>;

/**
 * Training block document handler
 * Creates structured training plans based on user goals
 */
export const trainingBlockDocumentHandler: DocumentHandler<'training-block'> = {
  kind: 'training-block',

  async onCreateDocument({ id, title, dataStream, apiKey }): Promise<string> {
    // Send language info for JSON display
    dataStream.write({
      type: 'data-language',
      data: 'json',
      transient: true,
    });

    let draftContent = '';

    try {
      const { fullStream } = streamObject({
        model: getArtifactModel(apiKey),
        system: `You are an expert running coach creating personalized training plans.

Based on the user's request, create a structured training block.

Guidelines:
- Create a realistic, progressive training plan
- Include a mix of easy runs, tempo runs, intervals, and rest days
- Add strength and cross-training sessions as appropriate
- Each week should have 1-2 rest days
- Progress weekly volume by ~10% max
- Include specific paces, distances, and durations
- Session IDs should follow the format: YYYY-MM-DD-type-number (e.g., "2026-01-27-run-1")
- Dates should be in YYYY-MM-DD format
- Start from today's date unless specified otherwise
- Set timeOfDay based on workout type: morning for easy/long runs, afternoon/evening for speed work or strength, any for flexibility
- All sessions start with completed: false

Today's date is ${new Date().toISOString().split('T')[0]}.`,
        prompt: title,
        schema: trainingBlockSchema,
      });

      for await (const delta of fullStream) {
        if (delta.type === 'object') {
          const { object } = delta;

          if (object) {
            // Serialize the partial object to JSON
            const jsonContent = JSON.stringify(object, null, 2);

            // Send the full JSON as delta (replaces previous content)
            dataStream.write({
              type: 'data-codeDelta',
              data: jsonContent,
              transient: true,
            });

            draftContent = jsonContent;
          }
        }
      }
    } catch (error) {
      console.error('Error streaming training block:', error);
      draftContent = JSON.stringify(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        null,
        2
      );
    }

    return draftContent;
  },

  async onUpdateDocument({ document, description, dataStream, apiKey }): Promise<string> {
    // Send language info for JSON display
    dataStream.write({
      type: 'data-language',
      data: 'json',
      transient: true,
    });

    let draftContent = '';

    try {
      const { fullStream } = streamObject({
        model: getArtifactModel(apiKey),
        system: `You are an expert running coach updating a training plan.

Current training block:
---
${document.content}
---

Update the training block according to the user's instructions.
Maintain the same structure and format.
Only modify what the user requests.

Today's date is ${new Date().toISOString().split('T')[0]}.`,
        prompt: description,
        schema: trainingBlockSchema,
      });

      for await (const delta of fullStream) {
        if (delta.type === 'object') {
          const { object } = delta;

          if (object) {
            const jsonContent = JSON.stringify(object, null, 2);

            dataStream.write({
              type: 'data-codeDelta',
              data: jsonContent,
              transient: true,
            });

            draftContent = jsonContent;
          }
        }
      }
    } catch (error) {
      console.error('Error updating training block:', error);
      draftContent = JSON.stringify(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          originalContent: document.content,
        },
        null,
        2
      );
    }

    return draftContent;
  },
};
