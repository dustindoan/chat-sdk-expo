/**
 * Database Client
 *
 * Creates and exports:
 * - db: Raw Drizzle database instance (for advanced queries)
 * - dbAdapter: DatabaseAdapter instance (for standard operations)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createDrizzlePostgresAdapter, schema } from '@chat-sdk-expo/drizzle-postgres';
import type { DatabaseAdapter } from '@chat-sdk-expo/db';

// Read database URL from environment
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  // Default to local Docker postgres
  return 'postgres://postgres:postgres@localhost:5432/chat';
}

// Create postgres client
const client = postgres(getDatabaseUrl());

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Create database adapter
export const dbAdapter: DatabaseAdapter = createDrizzlePostgresAdapter({ db });

export type Database = typeof db;
