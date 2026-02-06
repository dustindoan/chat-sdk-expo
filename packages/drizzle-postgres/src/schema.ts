/**
 * @chat-sdk-expo/drizzle-postgres - Schema
 *
 * Drizzle ORM schema for PostgreSQL.
 * Defines tables for users, chats, messages, documents, and votes.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  json,
  primaryKey,
  boolean,
} from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';
import type { MessagePart } from '@chat-sdk-expo/db';

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  // User type: 'regular' for email/password users, 'guest' for anonymous users
  type: varchar('type', { length: 20 }).notNull().default('regular'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

// ============================================================================
// CHAT
// ============================================================================

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Chat'),
  model: varchar('model', { length: 100 }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

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
  parts: json('parts').notNull().$type<MessagePart[]>(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

// ============================================================================
// DOCUMENT
// ============================================================================

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    title: text('title').notNull(),
    content: text('content'),
    // Using varchar without enum to allow extended kinds (e.g., 'training-block')
    kind: varchar('kind', { length: 50 })
      .notNull()
      .default('text'),
    language: varchar('language', { length: 50 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

// ============================================================================
// VOTE
// ============================================================================

export const vote = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' }),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

// ============================================================================
// INFERRED TYPES
// ============================================================================

export type UserRow = InferSelectModel<typeof user>;
export type SessionRow = InferSelectModel<typeof session>;
export type ChatRow = InferSelectModel<typeof chat>;
export type MessageRow = InferSelectModel<typeof message>;
export type DocumentRow = InferSelectModel<typeof document>;
export type VoteRow = InferSelectModel<typeof vote>;
