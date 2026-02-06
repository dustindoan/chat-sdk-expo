/**
 * SWR utilities and authenticated fetcher for the app.
 *
 * This module provides:
 * - An authenticated fetcher that works on both web and native platforms
 * - Handles auth headers for native platforms (web uses cookies automatically)
 *
 * Usage:
 *   import { authFetcher } from '@/lib/swr';
 *   const { data, error } = useSWR('/api/history', authFetcher);
 */

import { Platform } from 'react-native';
import { getAuthCookie } from '../auth/client';

// ============================================================================
// API ERROR
// ============================================================================

/**
 * Custom error class for API errors with structured data.
 */
export class APIError extends Error {
  code: string;
  status: number;
  cause?: string;

  constructor(code: string, status: number, cause?: string) {
    super(cause || code);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

// ============================================================================
// AUTHENTICATED FETCHER
// ============================================================================

/**
 * Authenticated fetcher for SWR.
 *
 * - On web: Uses credentials: 'include' to send cookies
 * - On native: Manually attaches auth token from SecureStore
 * - Handles JSON responses and throws APIError for non-ok responses
 */
export async function authFetcher<T = unknown>(url: string): Promise<T> {
  const cookie = await getAuthCookie();

  const response = await fetch(url, {
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
    headers: cookie ? { Cookie: cookie } : {},
  });

  if (!response.ok) {
    // Try to parse error details from response
    try {
      const errorData = await response.json();
      throw new APIError(
        errorData.code || `HTTP_${response.status}`,
        response.status,
        errorData.cause || errorData.message || response.statusText
      );
    } catch (parseError) {
      // If response isn't JSON, throw generic error
      if (parseError instanceof APIError) throw parseError;
      throw new APIError(`HTTP_${response.status}`, response.status, response.statusText);
    }
  }

  return response.json();
}
