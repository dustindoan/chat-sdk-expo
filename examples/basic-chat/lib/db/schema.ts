/**
 * Database Schema
 *
 * Re-exports schema tables from @chat-sdk-expo/drizzle-postgres
 * and types from @chat-sdk-expo/db
 *
 * This allows the app to use the shared schema while keeping
 * the existing import paths working.
 */

// Import schema namespace from the package
import { schema } from '@chat-sdk-expo/drizzle-postgres';

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

// Alias for backward compatibility with existing code
// DBMessage was the old name for Message
export type { Message as DBMessage } from '@chat-sdk-expo/db';

// Alias for backward compatibility
// MessagePartDB was the old name for MessagePart
export type { MessagePart as MessagePartDB } from '@chat-sdk-expo/db';
