/**
 * Guest Sign-In API Route
 *
 * Creates a temporary guest user and establishes a session using Better Auth's
 * internal mechanisms to ensure proper cookie signing.
 */

import { auth } from '../../../lib/auth/index';
import { db } from '../../../lib/db/client';
import { user } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = randomUUID();
    const guestNumber = Math.floor(Math.random() * 100000);
    const guestEmail = `guest-${userId.slice(0, 8)}@guest.local`;
    const guestName = `Guest ${guestNumber}`;
    // Use a fixed password for guests - they can't log in with it anyway since
    // the email domain is fake
    const guestPassword = `guest-${userId}`;

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
          .update(user)
          .set({ type: 'guest' })
          .where(eq(user.id, data.user.id));

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
}
