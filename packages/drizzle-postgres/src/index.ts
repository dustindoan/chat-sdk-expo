/**
 * @chat-sdk-expo/drizzle-postgres
 *
 * Drizzle + PostgreSQL adapter for @chat-sdk-expo/db.
 *
 * Usage:
 * ```ts
 * import { drizzle } from 'drizzle-orm/postgres-js';
 * import postgres from 'postgres';
 * import { createDrizzlePostgresAdapter } from '@chat-sdk-expo/drizzle-postgres';
 * import * as schema from '@chat-sdk-expo/drizzle-postgres/schema';
 *
 * const client = postgres(process.env.DATABASE_URL!);
 * const db = drizzle(client, { schema });
 * const adapter = createDrizzlePostgresAdapter({ db });
 *
 * // Now use the adapter
 * const chat = await adapter.getChatById(chatId, userId);
 * ```
 */

export { createDrizzlePostgresAdapter } from './adapter';
export type { DrizzlePostgresAdapterConfig } from './adapter';

// Re-export schema for convenience
export * as schema from './schema';
export type {
  UserRow,
  SessionRow,
  ChatRow,
  MessageRow,
  DocumentRow,
  VoteRow,
} from './schema';
