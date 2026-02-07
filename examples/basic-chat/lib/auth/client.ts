import { createBetterAuthClient } from '@chat-sdk-expo/better-auth/client';
import {
  getAuthCookie as _getAuthCookie,
  createAuthHeaders as _createAuthHeaders,
  authFetch as _authFetch,
  authFetchWithRetry as _authFetchWithRetry,
} from '@chat-sdk-expo/better-auth/client';

const client = createBetterAuthClient({
  storagePrefix: 'ai-chat-app',
});

export const authClient = client.authClient;
export const AUTH_STORAGE_PREFIX = client.storagePrefix;
export const { signIn, signUp, signOut, useSession, getSession } = client;

// Bound auth fetch helpers (pre-configured with this app's authClient)
export const getAuthCookie = () => _getAuthCookie(authClient);
export const createAuthHeaders = () => _createAuthHeaders(authClient);
export const authFetch = (url: string, options?: RequestInit) =>
  _authFetch(authClient, url, options);
export const authFetchWithRetry = (
  url: string,
  options?: RequestInit,
  onUnauthorized?: () => Promise<void>
) => _authFetchWithRetry(authClient, url, options, onUnauthorized);
