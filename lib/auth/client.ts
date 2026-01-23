import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Get base URL for auth client
// Better-auth requires a full URL, not a relative path
function getAuthBaseURL(): string {
  if (Platform.OS === 'web') {
    // On web, use current origin
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/api/auth`;
    }
    // Fallback for SSR or when window is not available
    return 'http://localhost:8081/api/auth';
  }
  // On native, we need full URL to the expo dev server
  return 'http://localhost:8081/api/auth';
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
  plugins: [
    expoClient({
      scheme: 'ai-chat-app',
      storagePrefix: 'ai-chat-app',
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
 * On native, this retrieves the session token from SecureStore.
 * On web, cookies are handled automatically.
 */
export async function getAuthCookie(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // On web, cookies are sent automatically
    return null;
  }

  try {
    // The expoClient stores the session with this key pattern
    const token = await SecureStore.getItemAsync('ai-chat-app.better-auth.session_token');
    if (token) {
      return `better-auth.session_token=${token}`;
    }
    return null;
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
