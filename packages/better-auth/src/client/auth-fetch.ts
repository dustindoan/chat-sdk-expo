/**
 * Auth Fetch Utilities
 *
 * Platform-aware fetch helpers that include authentication headers.
 */

import { Platform } from 'react-native';
import type { BetterAuthClient } from './create-client';

/**
 * Get the auth cookie for manual fetch requests.
 * On native, uses authClient.getCookie() as recommended by Better Auth docs.
 * On web, cookies are handled automatically by the browser.
 */
export async function getAuthCookie(
  authClient: BetterAuthClient['authClient']
): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const cookie = await authClient.getCookie();
    return cookie || null;
  } catch {
    return null;
  }
}

/**
 * Create fetch options with auth headers included.
 */
export async function createAuthHeaders(
  authClient: BetterAuthClient['authClient']
): Promise<HeadersInit> {
  const cookie = await getAuthCookie(authClient);
  return cookie ? { Cookie: cookie } : {};
}

/**
 * Wrapper around fetch that includes auth headers.
 */
export async function authFetch(
  authClient: BetterAuthClient['authClient'],
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await createAuthHeaders(authClient);

  return fetch(url, {
    ...options,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });
}

/**
 * Authenticated fetch with automatic retry on 401.
 * Use this for critical requests where session expiration should trigger refresh.
 */
export async function authFetchWithRetry(
  authClient: BetterAuthClient['authClient'],
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => Promise<void>
): Promise<Response> {
  const response = await authFetch(authClient, url, options);

  if (response.status === 401 && onUnauthorized) {
    console.log('Auth expired, refreshing session...');
    await onUnauthorized();
    return authFetch(authClient, url, options);
  }

  return response;
}
