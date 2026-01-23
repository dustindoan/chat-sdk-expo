/**
 * Guest Sign-In API Route
 *
 * Creates a temporary guest user and establishes a session.
 * Guest users can use the app without signing up, and their data
 * is still scoped to their temporary account.
 */

import { db } from '../../../lib/db/client';
import { user, session, account } from '../../../lib/db/schema';
import { randomUUID } from 'crypto';

// Generate a random string for session token
function generateToken(): string {
  return randomUUID() + randomUUID();
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const sessionToken = generateToken();
    const accountId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Generate a unique guest identifier
    const guestNumber = Math.floor(Math.random() * 100000);
    const guestEmail = `guest-${userId.slice(0, 8)}@guest.local`;
    const guestName = `Guest ${guestNumber}`;

    // Create guest user
    await db.insert(user).values({
      id: userId,
      name: guestName,
      email: guestEmail,
      emailVerified: false,
      type: 'guest',
      createdAt: now,
      updatedAt: now,
    });

    // Create account (required by better-auth schema)
    await db.insert(account).values({
      id: accountId,
      accountId: userId,
      providerId: 'guest',
      userId: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Create session
    await db.insert(session).values({
      id: sessionId,
      token: sessionToken,
      userId: userId,
      expiresAt: expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Build response with session cookie
    const response = Response.json({
      user: {
        id: userId,
        name: guestName,
        email: guestEmail,
        type: 'guest',
      },
      session: {
        id: sessionId,
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
      },
    });

    // Set session cookie for web clients
    const cookieValue = `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieValue,
      },
    });
  } catch (error) {
    console.error('Guest sign-in error:', error);
    return Response.json(
      { error: 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
