/**
 * Better Auth Server Factory
 *
 * Creates a configured Better Auth server instance.
 * Apps provide their database instance and schema.
 */

import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

export interface CreateBetterAuthServerConfig {
  /** Drizzle database instance */
  db: any;
  /** Drizzle schema object containing auth tables */
  schema: any;
  /** Trusted origins for CORS (defaults include localhost patterns) */
  trustedOrigins?: string[];
  /** Cookie/storage prefix (default: 'chat-sdk-expo') */
  storagePrefix?: string;
  /** Base path for auth routes (default: '/api/auth') */
  basePath?: string;
}

const DEFAULT_TRUSTED_ORIGINS = [
  'http://localhost:*',
  'exp://localhost:*',
];

export function createBetterAuthServer(config: CreateBetterAuthServerConfig) {
  const {
    db,
    schema,
    trustedOrigins = DEFAULT_TRUSTED_ORIGINS,
    storagePrefix = 'chat-sdk-expo',
    basePath = '/api/auth',
  } = config;

  return betterAuth({
    basePath,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [expo()],
    trustedOrigins,
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // 1 day - refresh session daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes - cache to avoid DB lookups
      },
      cookie: {
        maxAge: 60 * 60 * 24 * 30, // 30 days - persists across browser restarts
      },
    },
    advanced: {
      cookiePrefix: storagePrefix,
      useSecureCookies: false, // Allow cookies on localhost (http)
    },
  });
}

export type BetterAuthServer = ReturnType<typeof createBetterAuthServer>;
