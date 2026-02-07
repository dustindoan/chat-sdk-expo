/**
 * @chat-sdk-expo/auth - Auth Helpers
 *
 * Utility functions for authentication.
 */

/**
 * Guest user detection regex - matches emails like "guest-abc12345@guest.local"
 * Following chat-sdk pattern of detecting guests by email pattern.
 */
export const guestRegex = /^guest-[a-z0-9]+@guest\.local$/;

/**
 * Check if an email belongs to a guest user.
 */
export function isGuestEmail(email: string | null | undefined): boolean {
  return guestRegex.test(email ?? '');
}
