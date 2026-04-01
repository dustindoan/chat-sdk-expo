/**
 * getTodaySessions Tool
 *
 * AI tool to fetch workout sessions for a given date.
 * Queries the user's training block if available, falls back to mock data.
 *
 * NOTE: This file contains server-only code (database queries).
 * For client-safe imports, use sessions.shared.ts instead.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getLatestDocumentByKind } from '../../db/queries';
import type { TrainingBlock } from '../../artifacts/handlers/training-block';
import {
  type Session,
  type SessionType,
  type GetTodaySessionsResult,
  type GetTodaySessionsInput,
} from './sessions.shared';

// Re-export shared types for backwards compatibility
export type { Session, SessionType, GetTodaySessionsResult, GetTodaySessionsInput };

/**
 * Get the day of week name from a date string
 */
function getDayOfWeekName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

/**
 * Extract sessions for a specific date from a training block.
 * The new schema uses phases → weeks → days with dayOfWeek instead of dates.
 * Since plans are templates (no dates), we match by day of week.
 * Returns sessions from week 1 as the default (no calendar mapping yet).
 */
function getSessionsFromTrainingBlock(
  trainingBlock: TrainingBlock,
  targetDate: string
): Session[] {
  const targetDayOfWeek = getDayOfWeekName(targetDate);

  // Search through phases → weeks → days
  // For now, use the first week that has a matching day
  for (const phase of trainingBlock.phases || []) {
    for (const week of phase.weeks || []) {
      for (const day of week.days || []) {
        if (day.dayOfWeek === targetDayOfWeek) {
          return (day.sessions || []).map((session) => ({
            id: session.id,
            type: session.type as SessionType,
            title: session.title,
            duration: session.duration,
            distance: session.distance,
            description: session.description,
            completed: session.completed,
          }));
        }
      }
    }
  }
  return [];
}

/**
 * Props for getTodaySessions tool factory
 */
interface GetTodaySessionsToolProps {
  /** User ID to fetch training block for */
  userId: string;
}

/**
 * Create the getTodaySessions tool
 * Factory function that takes userId for database queries
 */
export function getTodaySessionsTool({ userId }: GetTodaySessionsToolProps) {
  return tool({
    description: `Get the workout sessions scheduled for a specific date.
Use this tool when users ask about:
- Today's workouts or training
- What they should do today
- Their training schedule
- Upcoming sessions

Returns the sessions for the requested date (defaults to today).`,
    inputSchema: z.object({
      date: z
        .string()
        .optional()
        .describe('The date to get sessions for in ISO format (YYYY-MM-DD). Defaults to today.'),
    }),
    execute: async ({ date }: GetTodaySessionsInput): Promise<GetTodaySessionsResult> => {
      // Default to today if no date provided
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Try to get sessions from the user's training block
      try {
        const trainingBlockDoc = await getLatestDocumentByKind(userId, 'training-block');

        if (trainingBlockDoc?.content) {
          const trainingBlock: TrainingBlock = JSON.parse(trainingBlockDoc.content);
          const sessions = getSessionsFromTrainingBlock(trainingBlock, targetDate);

          // If we found sessions for this date in the training block, return them
          if (sessions.length > 0) {
            return {
              date: targetDate,
              sessions,
              fromTrainingBlock: true,
              trainingBlockName: trainingBlock.name,
            };
          }

          // Date is outside the training block range - return empty with context
          return {
            date: targetDate,
            sessions: [],
            fromTrainingBlock: true,
            trainingBlockName: trainingBlock.name,
          };
        }
      } catch (error) {
        console.error('Error fetching training block:', error);
        // Fall through to mock data
      }

      // No training block found - return empty sessions
      return {
        date: targetDate,
        sessions: [],
        fromTrainingBlock: false,
      };
    },
  });
}
