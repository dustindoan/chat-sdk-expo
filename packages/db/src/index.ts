/**
 * @chat-sdk-expo/db
 *
 * Database types and interfaces for chat applications.
 *
 * This package provides:
 * - Type definitions for chat, message, document, vote entities
 * - DatabaseAdapter interface for implementing persistence layers
 *
 * Use with a concrete adapter like @chat-sdk-expo/db-drizzle-postgres
 */

// Types
export type {
  User,
  UserType,
  Session,
  Chat,
  ChatWithSnippet,
  Message,
  MessageRole,
  MessagePart,
  Document,
  DocumentKind,
  Vote,
  // Input types
  GetChatsOptions,
  GetChatsResult,
  SaveChatInput,
  SaveMessageInput,
  SaveDocumentInput,
  GetMessageCountOptions,
  VoteMessageInput,
  SearchChatsOptions,
  SearchChatsResult,
} from './types';

// Interface
export type { DatabaseAdapter, CreateDatabaseAdapter } from './interface';
