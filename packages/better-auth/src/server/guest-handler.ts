/**
 * Guest Sign-In Handler Factory
 *
 * Creates a request handler for guest user creation and session establishment.
 * Uses Better Auth's signUpEmail API internally for proper cookie signing.
 */

import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { BetterAuthServer } from './create-auth';

export interface CreateGuestHandlerConfig {
  /** Better Auth server instance */
  auth: BetterAuthServer;
  /** Drizzle database instance */
  db: any;
  /** Drizzle user table reference (e.g., schema.user) */
  userTable: any;
}

export function createGuestHandler(config: CreateGuestHandlerConfig) {
  const { auth, db, userTable } = config;

  return async function handleGuestSignIn(request: Request): Promise<Response> {
    try {
      // Accept email/password from client for session restoration support
      // If not provided, generate random credentials (backwards compatibility)
      let guestEmail: string;
      let guestPassword: string;
      let guestName: string;

      try {
        const body = await request.json();
        if (body.email && body.password) {
          guestEmail = body.email;
          guestPassword = body.password;
          // Extract guest ID from email for name
          const guestId = guestEmail.split('@')[0].replace('guest-', '');
          guestName = `Guest ${guestId.slice(0, 6)}`;
        } else {
          throw new Error('No credentials provided');
        }
      } catch {
        // Fallback: generate random credentials
        const userId = randomUUID();
        const guestNumber = Math.floor(Math.random() * 100000);
        guestEmail = `guest-${userId.slice(0, 8)}@guest.local`;
        guestName = `Guest ${guestNumber}`;
        guestPassword = `guest-${userId}`;
      }

      // Use Better Auth's signUpEmail API to create the user and session
      // This ensures proper cookie signing
      const result = await auth.api.signUpEmail({
        body: {
          name: guestName,
          email: guestEmail,
          password: guestPassword,
        },
        asResponse: true,
      });

      // If signup succeeded, update the user to be a guest type
      if (result.status === 200) {
        // Get the user ID from the response
        const responseClone = result.clone();
        const data = await responseClone.json();

        if (data.user?.id) {
          // Update user type to 'guest'
          await db
            .update(userTable)
            .set({ type: 'guest' })
            .where(eq(userTable.id, data.user.id));

          // Return the response with the updated user type
          const updatedData = {
            ...data,
            user: {
              ...data.user,
              type: 'guest',
            },
          };

          // Get the Set-Cookie header from the original response
          const setCookie = result.headers.get('Set-Cookie');

          return new Response(JSON.stringify(updatedData), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...(setCookie ? { 'Set-Cookie': setCookie } : {}),
            },
          });
        }
      }

      // If we get here, something went wrong
      console.error('Guest sign-up failed:', await result.text());
      return Response.json(
        { error: 'Failed to create guest session' },
        { status: 500 }
      );
    } catch (error) {
      console.error('Guest sign-in error:', error);
      return Response.json(
        { error: 'Failed to create guest session' },
        { status: 500 }
      );
    }
  };
}
