/**
 * Auth Middleware
 *
 * Server-side helpers for requiring authentication in API routes.
 */

import type { BetterAuthServer } from './create-auth';

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(auth: BetterAuthServer, request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

/**
 * Require authentication. Returns 401 if not authenticated.
 *
 * Usage:
 * ```typescript
 * const { user, error } = await requireAuth(auth, request);
 * if (error) return error;
 * // user is guaranteed non-null
 * ```
 */
export async function requireAuth(auth: BetterAuthServer, request: Request) {
  const user = await getAuthenticatedUser(auth, request);
  if (!user) {
    return {
      user: null as null,
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user, error: null as null };
}
