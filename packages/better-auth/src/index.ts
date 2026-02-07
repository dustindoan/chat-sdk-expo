/**
 * @chat-sdk-expo/better-auth
 *
 * Better Auth implementation for @chat-sdk-expo/auth.
 *
 * This package provides:
 * - Server: createBetterAuthServer(), requireAuth(), createGuestHandler()
 * - Client: createBetterAuthClient(), authFetch helpers
 * - Context: AuthProvider (populates AuthContext from @chat-sdk-expo/auth)
 *
 * Import from subpaths for tree-shaking:
 * - '@chat-sdk-expo/better-auth/server' (server-only code)
 * - '@chat-sdk-expo/better-auth/client' (client-only code)
 * - '@chat-sdk-expo/better-auth/context' (React provider)
 */

// Re-export everything for convenience
export * from './server/index';
export * from './client/index';
export * from './context/index';
