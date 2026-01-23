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
import { authClient, useSession } from '../lib/auth/client';
import { generateAPIUrl } from '../utils';

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

// Storage key for session token on native
const SESSION_TOKEN_KEY = 'ai-chat-app.better-auth.session_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Use Better Auth's useSession hook for automatic refresh
  // This handles refetchOnWindowFocus and refetchInterval automatically
  const { data: sessionData, isPending: sessionPending, refetch: refetchSession } = useSession();

  // Sync session data to user state
  useEffect(() => {
    if (sessionPending) return;

    if (sessionData?.user) {
      const userData = sessionData.user as any;
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        type: userData.type || 'regular',
      });
      setIsLoading(false);
      hasInitialized.current = true;
    } else if (hasInitialized.current) {
      // Session was lost (expired/cleared) - create new guest session
      createGuestSession().catch(console.error);
    } else {
      // Initial load with no session - create guest
      hasInitialized.current = true;
      createGuestSession().catch(console.error);
    }
  }, [sessionData, sessionPending]);

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

  // Create a guest session
  const createGuestSession = async () => {
    const response = await fetch(generateAPIUrl('/api/auth/guest'), {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to create guest session');
    }

    const data = await response.json();

    // Store session token on native platforms
    if (Platform.OS !== 'web' && data.session?.token) {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, data.session.token);
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
    }
  }, []);

  const handleSignUp = useCallback(
    async (name: string, email: string, password: string) => {
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
      }
    },
    []
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
    // Clear native session token
    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
      } catch {
        // Ignore errors when clearing token
      }
    }
    // After sign out, create a new guest session
    await createGuestSession();
  }, []);

  const refreshSession = useCallback(async () => {
    // Use Better Auth's refetch which triggers the session refresh manager
    await refetchSession();
  }, [refetchSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isGuest: user?.type === 'guest',
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
