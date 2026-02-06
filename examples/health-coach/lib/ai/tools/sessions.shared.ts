/**
 * Shared Session Types and Mock Data
 *
 * This file contains types and mock data that can be safely imported
 * on both client and server. Keep this file free of server-only imports
 * like database queries.
 */

/** Session types */
export type SessionType = 'run' | 'strength' | 'rest' | 'cross-training';

/** Session data structure */
export interface Session {
  id: string;
  type: SessionType;
  title: string;
  duration?: string;
  distance?: string;
  description?: string;
  completed?: boolean;
}

/** Tool result */
export interface GetTodaySessionsResult {
  date: string;
  sessions: Session[];
  fromTrainingBlock?: boolean;
  trainingBlockName?: string;
}

/** Tool input */
export interface GetTodaySessionsInput {
  date?: string;
}

/**
 * Generate mock sessions for demo purposes
 * Used when no training block exists
 * Safe to use on both client and server
 */
export function getMockSessions(date: string): Session[] {
  // Parse date string as local time (not UTC) to avoid timezone shift
  // "2026-01-31" -> parse as local Jan 31, not UTC which shifts to Jan 30 in PST
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day); // month is 0-indexed
  const dayOfWeek = dateObj.getDay();

  // Different workouts for different days of the week
  switch (dayOfWeek) {
    case 0: // Sunday - Rest
      return [
        {
          id: `${date}-rest`,
          type: 'rest',
          title: 'Rest Day',
          description: 'Recovery and regeneration. Light stretching if desired.',
        },
      ];

    case 1: // Monday - Easy run + strength
      return [
        {
          id: `${date}-run-1`,
          type: 'run',
          title: 'Easy Run',
          duration: '45 min',
          distance: '6 km',
          description: 'Zone 2 pace. Keep it conversational.',
        },
        {
          id: `${date}-strength-1`,
          type: 'strength',
          title: 'Core & Glutes',
          duration: '20 min',
          description: 'Planks, bridges, clamshells. 3 sets each.',
        },
      ];

    case 2: // Tuesday - Intervals
      return [
        {
          id: `${date}-run-2`,
          type: 'run',
          title: 'Interval Training',
          duration: '50 min',
          distance: '8 km',
          description: 'Warm up 10 min, then 6x800m @ 5K pace with 400m recovery jogs.',
        },
      ];

    case 3: // Wednesday - Cross training
      return [
        {
          id: `${date}-cross-1`,
          type: 'cross-training',
          title: 'Cycling',
          duration: '60 min',
          description: 'Low intensity spin. Active recovery day.',
        },
      ];

    case 4: // Thursday - Tempo run
      return [
        {
          id: `${date}-run-3`,
          type: 'run',
          title: 'Tempo Run',
          duration: '40 min',
          distance: '7 km',
          description: 'Warm up 10 min, 20 min @ tempo pace, cool down 10 min.',
        },
      ];

    case 5: // Friday - Easy + strength
      return [
        {
          id: `${date}-run-4`,
          type: 'run',
          title: 'Recovery Run',
          duration: '30 min',
          distance: '4 km',
          description: 'Very easy pace. Shake out the legs.',
        },
        {
          id: `${date}-strength-2`,
          type: 'strength',
          title: 'Full Body Strength',
          duration: '30 min',
          description: 'Squats, lunges, deadlifts, push-ups. Focus on form.',
        },
      ];

    case 6: // Saturday - Long run
      return [
        {
          id: `${date}-run-5`,
          type: 'run',
          title: 'Long Run',
          duration: '90 min',
          distance: '16 km',
          description: 'Easy pace with last 20 min at marathon pace.',
        },
      ];

    default:
      return [];
  }
}
