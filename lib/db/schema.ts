import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

// ============================================================================
// CHAT
// ============================================================================

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  title: text('title').notNull().default('New Chat'),
  model: varchar('model', { length: 100 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type Chat = InferSelectModel<typeof chat>;

// ============================================================================
// MESSAGE
// ============================================================================

export const message = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id, { onDelete: 'cascade' }),
  role: varchar('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  // Parts array stores the message content structure
  // Matches AI SDK's UIMessage parts format
  parts: json('parts').notNull().$type<MessagePartDB[]>(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

export type DBMessage = InferSelectModel<typeof message>;

// Types for JSON columns
export interface MessagePartDB {
  type: string;
  text?: string;
  toolInvocationId?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
  [key: string]: unknown;
}
