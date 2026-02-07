/**
 * @chat-sdk-expo/auth - Auth Types
 *
 * Provider-agnostic type definitions for authentication.
 * Any auth implementation (Better Auth, Clerk, Auth.js) must satisfy these contracts.
 */

export type { UserType } from '@chat-sdk-expo/db';

// ============================================================================
// AUTH CONTEXT TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  type: 'regular' | 'guest';
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// ============================================================================
// ENTITLEMENTS
// ============================================================================

export interface UserEntitlements {
  maxMessagesPerDay: number;
}

export const defaultEntitlementsByUserType: Record<'guest' | 'regular', UserEntitlements> = {
  guest: {
    maxMessagesPerDay: 20,
  },
  regular: {
    maxMessagesPerDay: 100,
  },
};
