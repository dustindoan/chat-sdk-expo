/**
 * Training Block Document Handler
 *
 * Server-side handler for creating and updating training blocks.
 * Schema defines the agent's vocabulary for training cognition —
 * phases contain weeks, weeks contain days, days contain sessions
 * with intensity, intervals, and category metadata.
 *
 * The handler's LLM generation is a fallback. The primary path is
 * content bypass: the coaching agent builds planDraft in its scratchpad
 * and passes pre-built JSON via the `content` field on createDocument/
 * updateDocument. When content is provided, the handler is not called.
 */

import { streamObject } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { DocumentHandler, CreateDocumentArgs, UpdateDocumentArgs } from '../types';

/**
 * Get the Anthropic model for training block generation (fallback path)
 */
function getArtifactModel(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
    baseURL: 'https://api.anthropic.com/v1',
  });
  return anthropic('claude-haiku-4-5-20251001');
}

// =============================================================================
// SCHEMA — The agent's vocabulary for training cognition
// =============================================================================

/**
 * Session type enum
 */
export const sessionTypeSchema = z.enum(['run', 'strength', 'rest', 'cross-training']);

/**
 * Session category — what kind of run/workout
 */
export const sessionCategorySchema = z.enum([
  'easy', 'tempo', 'interval', 'long', 'recovery',
  'race-pace', 'fartlek',
]);

/**
 * Interval definition — structured speed work
 */
export const intervalSchema = z.object({
  reps: z.number().describe('Number of repetitions'),
  distance: z.string().describe('Distance per rep (e.g., "400m", "1km")'),
  pace: z.string().describe('Target pace per rep (e.g., "3:45/km", "75s")'),
  recovery: z.string().describe('Recovery between reps (e.g., "90s jog", "200m walk")'),
});

/**
 * Intensity specification
 */
export const intensitySchema = z.object({
  target: z.string().describe('Target pace or effort (e.g., "5:00/km", "conversational")'),
  zone: z.string().optional().describe('Heart rate or effort zone (e.g., "Zone 2", "aerobic")'),
  rpe: z.number().optional().describe('Rate of perceived exertion (1-10 scale)'),
});

/**
 * Individual workout session
 */
export const sessionSchema = z.object({
  id: z.string().describe('Unique session ID (e.g., "w1-d1-run-1")'),
  type: sessionTypeSchema.describe('Type of workout session'),
  category: sessionCategorySchema.optional().describe('Specific category for runs'),
  title: z.string().describe('Short title (e.g., "Easy Run", "VO2max Intervals")'),
  distance: z.string().optional().describe('Total distance (e.g., "8 km")'),
  duration: z.string().optional().describe('Duration (e.g., "45 min")'),
  intensity: intensitySchema.optional().describe('Intensity target'),
  intervals: intervalSchema.optional().describe('Interval structure for speed work'),
  warmup: z.string().optional().describe('Warmup description (e.g., "2km easy + dynamic stretches")'),
  cooldown: z.string().optional().describe('Cooldown description (e.g., "1km easy jog")'),
  description: z.string().optional().describe('Additional notes or instructions'),
  completed: z.boolean().optional().describe('Whether the session has been completed'),
});

/**
 * Day of week enum
 */
export const dayOfWeekSchema = z.enum([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

/**
 * Day in the training plan — identified by day of week, not date
 */
export const daySchema = z.object({
  dayOfWeek: dayOfWeekSchema.optional().describe('Day of the week'),
  sessions: z.array(sessionSchema).describe('Workout sessions for this day'),
});

/**
 * Week in the training plan
 */
export const weekSchema = z.object({
  weekNumber: z.number().describe('Week number in the training block (1-indexed)'),
  targetVolume: z.string().describe('Target weekly volume (e.g., "55 km")'),
  focus: z.string().optional().describe('Training focus (e.g., "Base building", "VO2max development")'),
  days: z.array(daySchema).describe('Days in this week with their sessions'),
});

/**
 * Phase-level volume progression
 */
export const volumeProgressionSchema = z.object({
  start: z.string().describe('Starting weekly volume (e.g., "45 km")'),
  end: z.string().describe('Ending weekly volume (e.g., "60 km")'),
  progression: z.string().describe('How volume progresses (e.g., "10% increase per week with deload every 4th week")'),
});

/**
 * Quality session specification at phase level
 */
export const qualitySessionsSchema = z.object({
  perWeek: z.number().describe('Number of quality/hard sessions per week'),
  types: z.array(z.string()).describe('Types of quality work (e.g., ["tempo", "interval", "long run"])'),
});

/**
 * Training phase — a mesocycle within the block
 */
export const phaseSchema = z.object({
  name: z.string().describe('Phase name (e.g., "Base Building", "VO2max Development", "Race Specific")'),
  focus: z.string().describe('Primary training focus for this phase'),
  durationWeeks: z.number().describe('Number of weeks in this phase'),
  weeklyVolume: volumeProgressionSchema.describe('Volume progression through the phase'),
  qualitySessions: qualitySessionsSchema.describe('Quality session prescription'),
  weeks: z.array(weekSchema).describe('Individual weeks in this phase'),
});

/**
 * Athlete profile embedded in the plan
 */
export const athleteProfileSchema = z.object({
  currentLevel: z.string().describe('Current fitness summary (e.g., "4:47 1500m, 55km/week")'),
  goalEvent: z.string().describe('Target event (e.g., "1500m")'),
  gap: z.string().describe('Gap to close (e.g., "27 seconds from 4:47 to 4:20")'),
  constraints: z.string().optional().describe('Training constraints (e.g., "5 days/week, shin splint history")'),
  notes: z.string().optional().describe('Additional coaching notes'),
});

/**
 * Complete training block schema — the full plan
 */
export const trainingBlockSchema = z.object({
  name: z.string().describe('Name of the training block (e.g., "1500m Race Preparation")'),
  athleteProfile: athleteProfileSchema.describe('Athlete profile and goal context'),
  totalWeeks: z.number().describe('Total weeks in the training block'),
  phases: z.array(phaseSchema).describe('Training phases (mesocycles)'),
});

// =============================================================================
// EXPORTED TYPES
// =============================================================================

export type TrainingBlock = z.infer<typeof trainingBlockSchema>;
export type TrainingPhase = z.infer<typeof phaseSchema>;
export type TrainingWeek = z.infer<typeof weekSchema>;
export type TrainingDay = z.infer<typeof daySchema>;
export type TrainingSession = z.infer<typeof sessionSchema>;
export type SessionType = z.infer<typeof sessionTypeSchema>;
export type SessionCategory = z.infer<typeof sessionCategorySchema>;
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;
export type Interval = z.infer<typeof intervalSchema>;
export type Intensity = z.infer<typeof intensitySchema>;
export type AthleteProfile = z.infer<typeof athleteProfileSchema>;
export type VolumeProgression = z.infer<typeof volumeProgressionSchema>;
export type QualitySessions = z.infer<typeof qualitySessionsSchema>;

// =============================================================================
// HANDLER (LLM fallback — primary path is content bypass)
// =============================================================================

/**
 * Training block document handler
 * Creates structured training plans based on user goals.
 *
 * Note: The primary path for training-block documents is content bypass —
 * the coaching agent passes pre-built JSON via createDocument/updateDocument's
 * `content` field. This handler is the fallback for when content is not provided.
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

Based on the user's request, create a structured training block with phases.

Guidelines:
- Create a realistic, progressive training plan organized into phases
- Each phase should have a clear focus (e.g., base building, VO2max, race specific)
- Include a mix of easy runs, tempo runs, intervals, and rest days
- Add strength and cross-training sessions as appropriate
- Each week should have 1-2 rest days
- Progress weekly volume by ~10% max with deload weeks
- Include specific paces, distances, and durations
- Session IDs should follow the format: w{week}-d{day}-{type}-{number}
- Days use dayOfWeek (monday-sunday), not dates
- All sessions start with completed: false
- Include warmup and cooldown for quality sessions
- Set intensity targets for non-easy sessions`,
        prompt: title,
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
Only modify what the user requests.`,
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
