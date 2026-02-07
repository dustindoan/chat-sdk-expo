import { createBetterAuthServer } from '@chat-sdk-expo/better-auth/server';
import { db } from '../db/client';
import * as schema from '../db/schema';

export const auth = createBetterAuthServer({
  db,
  schema,
  trustedOrigins: [
    'ai-chat-app://',
    'http://localhost:*',
    'exp://localhost:*',
  ],
  storagePrefix: 'better-auth',
});

export type Auth = typeof auth;
