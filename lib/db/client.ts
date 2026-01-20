import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Read database URL from environment
// For local dev: postgres://postgres:postgres@localhost:5432/chat
function getDatabaseUrl(): string {
  // Try environment variable first
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

export type Database = typeof db;
