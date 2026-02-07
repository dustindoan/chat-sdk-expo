/**
 * @chat-sdk-expo/auth
 *
 * Provider-agnostic auth types, context, and helpers for chat applications.
 *
 * This package provides:
 * - AuthContextValue interface (the contract any auth provider must satisfy)
 * - AuthContext + useAuth() hook
 * - Guest detection helpers
 * - Entitlement types and defaults
 *
 * Use with a concrete provider like @chat-sdk-expo/better-auth
 */

// Types
export type {
  AuthUser,
  AuthContextValue,
  UserEntitlements,
  UserType,
} from './types';

export { defaultEntitlementsByUserType } from './types';

// Context
export { AuthContext, useAuth } from './context';

// Helpers
export { guestRegex, isGuestEmail } from './helpers';
