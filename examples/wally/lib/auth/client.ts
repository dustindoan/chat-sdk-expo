import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Storage prefix for Better Auth expo client
// Used to construct storage keys: `${AUTH_STORAGE_PREFIX}_cookie`, etc.
export const AUTH_STORAGE_PREFIX = 'ai-chat-app';

// Get base URL for auth client
// Better-auth requires a full URL, not a relative path
function getAuthBaseURL(): string {
  if (Platform.OS === 'web') {
    // On web, use current origin
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/api/auth`;
    }
    // Fallback for SSR or when window is not available
    // Wally runs on port 8082 to avoid conflict with chat-sdk-expo
    return 'http://localhost:8082/api/auth';
  }

  // On native, use the Expo dev server URL
  // Constants.experienceUrl looks like: exp://192.168.4.127:8082
  const experienceUrl = Constants.experienceUrl;
  if (experienceUrl) {
    // Extract host and port, convert to http URL
    const match = experienceUrl.match(/exp:\/\/([^:]+):(\d+)/);
    if (match) {
      const [, host, port] = match;
      return `http://${host}:8082/api/auth`;
    }
    // Try simpler replacement
    const origin = experienceUrl.replace('exp://', 'http://');
    return `${origin.replace(/:\d+$/, ':8082')}/api/auth`;
  }

  // Fallback for production or when experienceUrl is not available
  // Use localhost - this works when running on same machine
  return 'http://localhost:8082/api/auth';
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  plugins: [
    expoClient({
      scheme: AUTH_STORAGE_PREFIX,
      storagePrefix: AUTH_STORAGE_PREFIX,
      storage: SecureStore,
    }),
  ],
  // Session refresh options
  sessionOptions: {
    // Refresh session when window regains focus (default: true)
    refetchOnWindowFocus: true,
    // Proactively refresh session every 4 minutes to stay ahead of 5-minute cookie cache
    refetchInterval: 240,
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

/**
 * Get the auth cookie for manual fetch requests.
 * On native, uses authClient.getCookie() as recommended by Better Auth docs.
 * On web, cookies are handled automatically by the browser.
 */
export async function getAuthCookie(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // On web, cookies are sent automatically
    return null;
  }

  try {
    // Use the official Better Auth method to get cookies
    // This handles the internal storage key format correctly
    const cookie = await authClient.getCookie();
    return cookie || null;
  } catch {
    return null;
  }
}

/**
 * Create fetch options with auth headers included.
 */
export async function createAuthHeaders(): Promise<HeadersInit> {
  const cookie = await getAuthCookie();
  return cookie ? { Cookie: cookie } : {};
}

/**
 * Wrapper around fetch that includes auth headers.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await createAuthHeaders();

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
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param onUnauthorized - Optional callback to refresh session before retry
 */
export async function authFetchWithRetry(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => Promise<void>
): Promise<Response> {
  const response = await authFetch(url, options);

  // If unauthorized and we have a refresh callback, retry once
  if (response.status === 401 && onUnauthorized) {
    console.log('Auth expired, refreshing session...');
    await onUnauthorized();
    return authFetch(url, options);
  }

  return response;
}
