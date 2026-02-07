/**
 * Better Auth Provider
 *
 * Populates the AuthContext from @chat-sdk-expo/auth with Better Auth session state.
 * Apps wrap their root layout with this provider.
 */

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSWRConfig } from 'swr';
import { AuthContext, isGuestEmail } from '@chat-sdk-expo/auth';
import type { AuthUser } from '@chat-sdk-expo/auth';

export interface AuthProviderProps {
  children: ReactNode;
  /** Better Auth client instance (from createBetterAuthClient) */
  authClient: any;
  /** Storage prefix (should match server/client config) */
  storagePrefix: string;
  /** Platform-aware URL builder for API calls */
  generateAPIUrl: (path: string) => string;
}

// Helper to map Better Auth user data to our AuthUser type
function mapUser(userData: any): AuthUser {
  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    image: userData.image,
    type: userData.type || 'regular',
  };
}

// Credential storage helpers (platform-aware)
function makeCredentialHelpers(storagePrefix: string) {
  const GUEST_CREDENTIALS_KEY = `${storagePrefix}_guest_credentials`;
  const EXPO_COOKIE_STORAGE_KEY = `${storagePrefix}_cookie`;

  async function storeGuestCredentials(email: string, password: string): Promise<void> {
    const data = JSON.stringify({ email, password });
    if (Platform.OS === 'web') {
      localStorage.setItem(GUEST_CREDENTIALS_KEY, data);
    } else {
      await SecureStore.setItemAsync(GUEST_CREDENTIALS_KEY, data);
    }
  }

  async function getStoredGuestCredentials(): Promise<{ email: string; password: string } | null> {
    try {
      let data: string | null;
      if (Platform.OS === 'web') {
        data = localStorage.getItem(GUEST_CREDENTIALS_KEY);
      } else {
        data = await SecureStore.getItemAsync(GUEST_CREDENTIALS_KEY);
      }
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[Auth] Failed to get stored guest credentials:', error);
    }
    return null;
  }

  async function clearGuestCredentials(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(GUEST_CREDENTIALS_KEY);
      } else {
        await SecureStore.deleteItemAsync(GUEST_CREDENTIALS_KEY);
      }
    } catch (error) {
      console.error('[Auth] Failed to clear guest credentials:', error);
    }
  }

  return {
    EXPO_COOKIE_STORAGE_KEY,
    storeGuestCredentials,
    getStoredGuestCredentials,
    clearGuestCredentials,
  };
}

export function AuthProvider({
  children,
  authClient,
  storagePrefix,
  generateAPIUrl,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  const {
    EXPO_COOKIE_STORAGE_KEY,
    storeGuestCredentials,
    getStoredGuestCredentials,
    clearGuestCredentials,
  } = React.useMemo(() => makeCredentialHelpers(storagePrefix), [storagePrefix]);

  // SWR cache mutate for invalidating chat history on auth changes
  const { mutate: globalMutate } = useSWRConfig();

  // Use Better Auth's useSession hook for automatic refresh
  const { data: sessionData, isPending: sessionPending, refetch: refetchSession } = authClient.useSession();

  // On React Native, useSession's isServer() check may incorrectly return true
  // because `window` is undefined. We need to manually trigger a fetch on native.
  // See: https://github.com/better-auth/better-auth/issues/4570
  useEffect(() => {
    if (Platform.OS !== 'web' && !hasInitialized.current) {
      const fetchNativeSession = async () => {
        try {
          const session = await authClient.getSession();
          if (session?.data?.user) {
            setUser(mapUser(session.data.user));
            hasInitialized.current = true;
            setIsLoading(false);
          }
        } catch (error) {
          console.error('[Auth] Session fetch error:', error);
        }
      };
      fetchNativeSession();
    }
  }, [authClient]);

  // Wait for useSession to finish loading before deciding on guest creation
  useEffect(() => {
    if (hasInitialized.current || sessionPending) return;

    const initFromSession = async () => {
      hasInitialized.current = true;

      if (sessionData?.user) {
        setUser(mapUser(sessionData.user));
      } else {
        try {
          const restored = await tryRestoreGuestSession();
          if (!restored) {
            await createGuestSession();
          }
        } catch (guestError) {
          console.error('[Auth] Guest session failed:', guestError);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initFromSession();
  }, [sessionPending, sessionData]);

  // Sync useSession updates to user state
  useEffect(() => {
    if (!hasInitialized.current) return;
    if (sessionData?.user) {
      setUser(mapUser(sessionData.user));
    }
  }, [sessionData]);

  // Try to restore a previous guest session using stored credentials
  const tryRestoreGuestSession = async (): Promise<boolean> => {
    const credentials = await getStoredGuestCredentials();
    if (!credentials) return false;

    try {
      console.log('[Auth] Attempting to restore guest session...');
      const result = await authClient.signIn.email({
        email: credentials.email,
        password: credentials.password,
      });

      if (result.error) {
        console.log('[Auth] Guest restoration failed:', result.error.message);
        await clearGuestCredentials();
        return false;
      }

      if (result.data?.user) {
        setUser(mapUser({ ...result.data.user, type: result.data.user.type || 'guest' }));
        console.log('[Auth] Guest session restored successfully');
        return true;
      }
    } catch (error) {
      console.error('[Auth] Guest restoration error:', error);
      await clearGuestCredentials();
    }

    return false;
  };

  // Create a guest session
  const createGuestSession = async () => {
    const guestId = Math.random().toString(36).substring(2, 10);
    const guestEmail = `guest-${guestId}@guest.local`;
    const guestPassword = `guest-${guestId}-${Date.now()}`;

    const response = await fetch(generateAPIUrl('/api/auth/guest'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: guestEmail, password: guestPassword }),
    });

    if (!response.ok) {
      throw new Error('Failed to create guest session');
    }

    const data = await response.json();

    // Store credentials for future restoration
    await storeGuestCredentials(guestEmail, guestPassword);

    // Store session token on native platforms in expo plugin format
    if (Platform.OS !== 'web') {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        const cookieStore: Record<string, { value: string; expires: string | null }> = {};
        const cookies = setCookieHeader.split(/,(?=\s*[^;=]+=[^;]*(?:;|$))/);
        for (const cookie of cookies) {
          const [nameValue, ...attrs] = cookie.split(';').map(s => s.trim());
          const [name, ...valueParts] = (nameValue || '').split('=');
          const value = valueParts.join('=');

          if (name && value) {
            let expires: string | null = null;
            for (const attr of attrs) {
              const [attrName, ...attrValueParts] = attr.split('=');
              const attrValue = attrValueParts.join('=');
              const normalizedName = attrName?.trim().toLowerCase();

              if (normalizedName === 'expires') {
                expires = new Date(attrValue).toISOString();
              } else if (normalizedName === 'max-age') {
                expires = new Date(Date.now() + Number(attrValue) * 1000).toISOString();
              }
            }

            const normalizedCookieName = name.replace(/:/g, '_');
            cookieStore[normalizedCookieName] = {
              value: decodeURIComponent(value),
              expires,
            };
          }
        }

        await SecureStore.setItemAsync(
          EXPO_COOKIE_STORAGE_KEY,
          JSON.stringify(cookieStore)
        );
      }
    }

    setUser({
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      type: 'guest',
    });
  };

  const handleSignIn = useCallback(async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      throw new Error(result.error.message || 'Sign in failed');
    }
    if (result.data?.user) {
      setUser(mapUser(result.data.user));
      await clearGuestCredentials();
    }

    await new Promise(resolve => setTimeout(resolve, 50));
    await globalMutate(() => true, undefined, { revalidate: true });
  }, [authClient, globalMutate, clearGuestCredentials]);

  const handleSignUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed');
      }
      if (result.data?.user) {
        setUser(mapUser(result.data.user));
        await clearGuestCredentials();
      }

      await new Promise(resolve => setTimeout(resolve, 50));
      await globalMutate(() => true, undefined, { revalidate: true });
    },
    [authClient, globalMutate, clearGuestCredentials]
  );

  const handleSignInAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      await createGuestSession();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await authClient.signOut();
    await createGuestSession();
    await new Promise(resolve => setTimeout(resolve, 50));
    await globalMutate(() => true, undefined, { revalidate: true });
  }, [authClient, globalMutate]);

  const refreshSession = useCallback(async () => {
    try {
      await refetchSession();
    } catch (error) {
      console.error('[Auth] Refresh failed:', error);
    }
  }, [refetchSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isGuest: isGuestEmail(user?.email),
        signIn: handleSignIn,
        signUp: handleSignUp,
        signInAsGuest: handleSignInAsGuest,
        signOut: handleSignOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
