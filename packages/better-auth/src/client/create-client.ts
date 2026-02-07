/**
 * Better Auth Client Factory
 *
 * Creates a configured Better Auth client instance with Expo support.
 * Handles platform-aware base URL detection (web vs native).
 */

import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface CreateBetterAuthClientConfig {
  /** Storage prefix for cookies and credentials (should match server config) */
  storagePrefix?: string;
  /** Override base URL (default: auto-detected from platform) */
  baseURL?: string;
  /** Session refetch interval in seconds (default: 240 = 4 minutes) */
  refetchInterval?: number;
}

/**
 * Detect the auth base URL based on the current platform.
 * - Web: Uses window.location.origin
 * - Native: Parses exp:// URL from Constants.experienceUrl
 */
function getAuthBaseURL(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/api/auth`;
    }
    return 'http://localhost:8081/api/auth';
  }

  // On native, use the Expo dev server URL
  const experienceUrl = Constants.experienceUrl;
  if (experienceUrl) {
    const match = experienceUrl.match(/exp:\/\/([^:]+):(\d+)/);
    if (match) {
      const [, host, port] = match;
      return `http://${host}:${port}/api/auth`;
    }
    const origin = experienceUrl.replace('exp://', 'http://');
    return `${origin}/api/auth`;
  }

  return 'http://localhost:8081/api/auth';
}

export function createBetterAuthClient(config: CreateBetterAuthClientConfig = {}) {
  const {
    storagePrefix = 'chat-sdk-expo',
    baseURL,
    refetchInterval = 240,
  } = config;

  const authClient = createAuthClient({
    baseURL: baseURL ?? getAuthBaseURL(),
    plugins: [
      expoClient({
        scheme: storagePrefix,
        storagePrefix,
        storage: SecureStore,
      }),
    ],
    sessionOptions: {
      refetchOnWindowFocus: true,
      refetchInterval,
    },
  });

  return {
    authClient,
    storagePrefix,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
    useSession: authClient.useSession,
    getSession: authClient.getSession,
  };
}

export type BetterAuthClient = ReturnType<typeof createBetterAuthClient>;
