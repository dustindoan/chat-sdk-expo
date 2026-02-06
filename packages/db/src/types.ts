/**
 * @chat-sdk-expo/db - Database Types
 *
 * Core type definitions for chat application persistence.
 * These types are implementation-agnostic and can be used with any database.
 */

// ============================================================================
// USER TYPES
// ============================================================================

export type UserType = 'regular' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  type: UserType;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface Chat {
  id: string;
  userId: string;
  title: string;
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatWithSnippet extends Chat {
  snippet?: string;
  messageCount?: number;
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message part structure for database storage.
 * Matches AI SDK's UIMessage parts format.
 */
export interface MessagePart {
  type: string;
  text?: string;
  toolInvocationId?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  chatId: string;
  role: MessageRole;
  parts: MessagePart[];
  createdAt: Date;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

/**
 * Base document kinds supported by the core package.
 * Apps can extend this with their own kinds using union types.
 *
 * @example
 * // In your app:
 * type MyDocumentKind = DocumentKind | 'training-block' | 'template';
 */
export type DocumentKind = 'text' | 'code';

/**
 * Document interface.
 * The kind field accepts any string to allow apps to use extended kinds.
 */
export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string | null;
  kind: string; // Allows extended kinds like 'training-block'
  language: string | null;
  createdAt: Date;
}

// ============================================================================
// VOTE TYPES
// ============================================================================

export interface Vote {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}

// ============================================================================
// QUERY INPUT TYPES
// ============================================================================

export interface GetChatsOptions {
  userId: string;
  limit?: number;
  cursor?: string;
}

export interface GetChatsResult {
  chats: Chat[];
  hasMore: boolean;
}

export interface SaveChatInput {
  id?: string;
  userId: string;
  title?: string;
  model?: string;
}

export interface SaveMessageInput {
  id?: string;
  chatId: string;
  role: MessageRole;
  parts: MessagePart[];
}

export interface SaveDocumentInput {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: string; // Allows extended kinds like 'training-block'
  language?: string;
}

export interface GetMessageCountOptions {
  userId: string;
  differenceInHours: number;
}

export interface VoteMessageInput {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}

export interface SearchChatsOptions {
  userId: string;
  query: string;
  limit?: number;
  cursor?: string;
}

export interface SearchChatsResult {
  chats: ChatWithSnippet[];
  hasMore: boolean;
}
