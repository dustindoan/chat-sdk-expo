/**
 * useTodaySessions - Hook to fetch workout sessions for a given date
 *
 * Reuses the same data source as the getTodaySessions AI tool,
 * allowing the empty state to show sessions without AI involvement.
 *
 * NOTE: This imports from sessions.shared.ts which is client-safe
 * (no server-only imports like database queries).
 */
import { useMemo } from 'react';
import {
  getMockSessions,
  type Session,
  type GetTodaySessionsResult,
} from '../lib/ai/tools/sessions.shared';

/**
 * Format a Date to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Hook to get workout sessions for a specific date
 *
 * @param date - The date to get sessions for
 * @returns Sessions data matching the tool result format
 */
export function useTodaySessions(date: Date): GetTodaySessionsResult {
  return useMemo(() => {
    const dateStr = formatDateString(date);
    const sessions = getMockSessions(dateStr);
    return { date: dateStr, sessions };
  }, [date]);
}

// Re-export types for convenience
export type { Session, GetTodaySessionsResult };
