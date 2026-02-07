/**
 * @chat-sdk-expo/auth - Auth Context
 *
 * Provider-agnostic React context for authentication.
 * The AuthProvider implementation (e.g., from @chat-sdk-expo/better-auth)
 * populates this context. Consumers use useAuth() to access auth state.
 */

import { createContext, useContext } from 'react';
import type { AuthContextValue } from './types';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
