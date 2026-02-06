/**
 * User entitlements based on user type
 * Following chat-sdk pattern: different limits for guest vs regular users
 */

export type UserType = 'guest' | 'regular';

export interface UserEntitlements {
  maxMessagesPerDay: number;
}

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
