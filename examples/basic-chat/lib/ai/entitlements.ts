/**
 * User entitlements based on user type
 * Following chat-sdk pattern: different limits for guest vs regular users
 *
 * Types imported from @chat-sdk-expo/auth, values defined per-app.
 */

import type { UserType, UserEntitlements } from '@chat-sdk-expo/auth';

export type { UserType, UserEntitlements };

export const entitlementsByUserType: Record<UserType, UserEntitlements> = {
  guest: {
    maxMessagesPerDay: 20,
  },
  regular: {
    maxMessagesPerDay: 100,
  },
};

/**
 * Get entitlements for a user type
 */
export function getEntitlements(userType: UserType): UserEntitlements {
  return entitlementsByUserType[userType];
}
