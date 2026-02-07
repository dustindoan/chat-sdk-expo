/**
 * Auth Context
 *
 * Re-exports from shared packages. The AuthProvider is configured
 * in _layout.tsx with app-specific settings.
 */

export { AuthProvider } from '@chat-sdk-expo/better-auth/context';
export { useAuth } from '@chat-sdk-expo/auth';
export type { AuthContextValue, AuthUser } from '@chat-sdk-expo/auth';
