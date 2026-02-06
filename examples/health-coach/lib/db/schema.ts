/**
 * Database Schema
 *
 * Re-exports schema tables from @chat-sdk-expo/db-drizzle-postgres
 * and types from @chat-sdk-expo/db
 *
 * Wally extends document kinds with 'training-block'.
 */

// Import schema namespace from the package
import { schema } from '@chat-sdk-expo/db-drizzle-postgres';

// Re-export schema tables
export const user = schema.user;
export const session = schema.session;
export const account = schema.account;
export const verification = schema.verification;
export const chat = schema.chat;
export const message = schema.message;
export const document = schema.document;
export const vote = schema.vote;

// Re-export types from the db package
export type {
  User,
  Session,
  Chat,
  Message,
  MessagePart,
  MessageRole,
  Document,
  DocumentKind,
  Vote,
  ChatWithSnippet,
} from '@chat-sdk-expo/db';

// Wally-specific document kinds (extends base 'text' | 'code')
export type WallyDocumentKind = 'text' | 'code' | 'training-block';

// Alias for backward compatibility with existing code
export type { Message as DBMessage } from '@chat-sdk-expo/db';
export type { MessagePart as MessagePartDB } from '@chat-sdk-expo/db';
