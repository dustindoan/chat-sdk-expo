import { auth } from './index';

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      user: null,
      error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { user, error: null };
}
