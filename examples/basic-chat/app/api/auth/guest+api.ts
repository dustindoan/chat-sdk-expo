import { createGuestHandler } from '@chat-sdk-expo/better-auth/server';
import { auth } from '../../../lib/auth/index';
import { db } from '../../../lib/db/client';
import { user } from '../../../lib/db/schema';

const handleGuest = createGuestHandler({ auth, db, userTable: user });

export async function POST(request: Request): Promise<Response> {
  return handleGuest(request);
}
