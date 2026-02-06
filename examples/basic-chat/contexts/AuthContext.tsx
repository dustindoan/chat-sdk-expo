import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSWRConfig } from 'swr';
import { authClient, useSession, AUTH_STORAGE_PREFIX } from '../lib/auth/client';
import { generateAPIUrl } from '../utils';
import { isGuestEmail } from '../lib/constants';

// Storage key for persisting guest credentials across session loss
const GUEST_CREDENTIALS_KEY = `${AUTH_STORAGE_PREFIX}_guest_credentials`;

export type UserType = 'regular' | 'guest';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  type: UserType;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Storage key matching expo plugin format: {storagePrefix}_cookie
// The expo plugin stores cookies in JSON format: { "cookie-name": { value, expires } }
const EXPO_COOKIE_STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_cookie`;

// Helper to store guest credentials for restoration after session loss
async function storeGuestCredentials(email: string, password: string): Promise<void> {
  const data = JSON.stringify({ email, password });
  if (Platform.OS === 'web') {
    localStorage.setItem(GUEST_CREDENTIALS_KEY, data);
  } else {
    await SecureStore.setItemAsync(GUEST_CREDENTIALS_KEY, data);
  }
}

// Helper to retrieve stored guest credentials
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

// Helper to clear stored guest credentials
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // SWR cache mutate for invalidating chat history on auth changes
  const { mutate: globalMutate } = useSWRConfig();

  // Use Better Auth's useSession hook for automatic refresh
  const { data: sessionData, isPending: sessionPending, refetch: refetchSession } = useSession();

  // On React Native, useSession's isServer() check may incorrectly return true
  // because `window` is undefined. We need to manually trigger a fetch on native.
  // See: https://github.com/better-auth/better-auth/issues/4570
  useEffect(() => {
    // On native platforms, useSession may not auto-fetch due to window check
    // Force a session fetch to ensure we get the initial state
    if (Platform.OS !== 'web' && !hasInitialized.current) {
      const fetchNativeSession = async () => {
        try {
          const session = await authClient.getSession();
          if (session?.data?.user) {
            const userData = session.data.user as any;
            setUser({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              image: userData.image,
              type: userData.type || 'regular',
            });
            hasInitialized.current = true;
            setIsLoading(false);
          }
        } catch (error) {
          console.error('[Auth] Session fetch error:', error);
        }
      };
      fetchNativeSession();
    }
  }, []);

  // Wait for useSession to finish loading before deciding on guest creation
  // This prevents race conditions where we create a new guest while session is still loading
  useEffect(() => {
    // Skip if already initialized (native path) or still pending
    if (hasInitialized.current || sessionPending) return;

    const initFromSession = async () => {
      hasInitialized.current = true;

      if (sessionData?.user) {
        // Existing session found - use it
        const userData = sessionData.user as any;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          image: userData.image,
          type: userData.type || 'regular',
        });
      } else {
        // No session - try to restore previous guest or create new one
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

  // Sync useSession updates to user state (for web and after sign-in/sign-out)
  useEffect(() => {
    if (!hasInitialized.current) return;

    if (sessionData?.user) {
      const userData = sessionData.user as any;
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        type: userData.type || 'regular',
      });
    }
  }, [sessionData]);

  // Legacy checkSession for backward compatibility
  const checkSession = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      if (session?.data?.user) {
        // Map the user data including type
        const userData = session.data.user as any;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          image: userData.image,
          type: userData.type || 'regular',
        });
      } else {
        // No session - auto-create guest user
        await createGuestSession();
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // On error, try to create guest session
      try {
        await createGuestSession();
      } catch (guestError) {
        console.error('Guest session creation failed:', guestError);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Try to restore a previous guest session using stored credentials
  const tryRestoreGuestSession = async (): Promise<boolean> => {
    const credentials = await getStoredGuestCredentials();
    if (!credentials) {
      return false;
    }

    try {
      console.log('[Auth] Attempting to restore guest session...');
      const result = await authClient.signIn.email({
        email: credentials.email,
        password: credentials.password,
      });

      if (result.error) {
        console.log('[Auth] Guest restoration failed:', result.error.message);
        // Clear invalid credentials
        await clearGuestCredentials();
        return false;
      }

      if (result.data?.user) {
        const userData = result.data.user as any;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          image: userData.image,
          type: userData.type || 'guest',
        });
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
    // Generate credentials for the new guest
    const guestId = Math.random().toString(36).substring(2, 10);
    const guestEmail = `guest-${guestId}@guest.local`;
    const guestPassword = `guest-${guestId}-${Date.now()}`;

    const response = await fetch(generateAPIUrl('/api/auth/guest'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: guestEmail, password: guestPassword }),
    });

    if (!response.ok) {
      throw new Error('Failed to create guest session');
    }

    const data = await response.json();

    // Store credentials for future restoration
    await storeGuestCredentials(guestEmail, guestPassword);

    // Store session token on native platforms in expo plugin format
    // The expo plugin expects: { "cookie-name": { value: "...", expires: "..." } }
    if (Platform.OS !== 'web') {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Parse cookies from Set-Cookie header and store in expo plugin format
        const cookieStore: Record<string, { value: string; expires: string | null }> = {};

        // Split multiple cookies (may be comma-separated)
        const cookies = setCookieHeader.split(/,(?=\s*[^;=]+=[^;]*(?:;|$))/);
        for (const cookie of cookies) {
          const [nameValue, ...attrs] = cookie.split(';').map(s => s.trim());
          const [name, ...valueParts] = (nameValue || '').split('=');
          const value = valueParts.join('=');

          if (name && value) {
            // Find expires or max-age attribute
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

            // Normalize cookie name (expo plugin replaces : with _)
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

  // Note: useSession hook now handles automatic session checking and refresh
  // The old useEffect that called checkSession is no longer needed

  const handleSignIn = useCallback(async (email: string, password: string) => {
    // Use Better Auth client - it handles token storage via expo plugin
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      throw new Error(result.error.message || 'Sign in failed');
    }
    if (result.data?.user) {
      const userData = result.data.user as any;
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        type: userData.type || 'regular',
      });
      // Clear guest credentials when signing in as regular user
      await clearGuestCredentials();
    }

    // Small delay to ensure token is stored before SWR revalidation
    await new Promise(resolve => setTimeout(resolve, 50));
    // Invalidate all SWR cache to refresh data for new user
    await globalMutate(() => true, undefined, { revalidate: true });
  }, [globalMutate]);

  const handleSignUp = useCallback(
    async (name: string, email: string, password: string) => {
      // Use Better Auth client - it handles token storage via expo plugin
      const result = await authClient.signUp.email({ name, email, password });
      if (result.error) {
        throw new Error(result.error.message || 'Sign up failed');
      }
      if (result.data?.user) {
        const userData = result.data.user as any;
        setUser({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          image: userData.image,
          type: userData.type || 'regular',
        });
        // Clear guest credentials when signing up as regular user
        await clearGuestCredentials();
      }

      // Small delay to ensure token is stored before SWR revalidation
      await new Promise(resolve => setTimeout(resolve, 50));
      // Invalidate all SWR cache to refresh data for new user
      await globalMutate(() => true, undefined, { revalidate: true });
    },
    [globalMutate]
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
    // Note: authClient.signOut() clears the cookie storage via expo plugin
    // After sign out, create a new guest session immediately
    // This ensures the UI updates right away without waiting for useEffect
    await createGuestSession();
    // Small delay to ensure the new guest session token is stored
    await new Promise(resolve => setTimeout(resolve, 50));
    // Invalidate all SWR cache to refresh data for new user
    await globalMutate(() => true, undefined, { revalidate: true });
  }, [globalMutate]);

  const refreshSession = useCallback(async () => {
    // Use Better Auth's refetch to trigger the session refresh manager
    // This also updates the useSession hook's state
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
        // Use email pattern to detect guest (following chat-sdk pattern)
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
