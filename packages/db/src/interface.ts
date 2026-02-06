/**
 * @chat-sdk-expo/db - Database Interface
 *
 * Abstract interface for database operations.
 * Implementations provide concrete database adapters.
 */

import type {
  User,
  Chat,
  Message,
  Document,
  Vote,
  GetChatsOptions,
  GetChatsResult,
  SaveChatInput,
  SaveMessageInput,
  SaveDocumentInput,
  GetMessageCountOptions,
  VoteMessageInput,
  SearchChatsOptions,
  SearchChatsResult,
  ChatWithSnippet,
  MessagePart,
} from './types';

/**
 * Database adapter interface.
 * Implementations must provide all methods for a complete persistence layer.
 */
export interface DatabaseAdapter {
  // ============================================================================
  // USER QUERIES
  // ============================================================================

  /**
   * Get user by ID
   */
  getUserById(id: string): Promise<User | undefined>;

  // ============================================================================
  // CHAT QUERIES
  // ============================================================================

  /**
   * Get chat by ID, scoped to user
   */
  getChatById(id: string, userId: string): Promise<Chat | undefined>;

  /**
   * Get paginated list of chats for a user
   */
  getChats(options: GetChatsOptions): Promise<GetChatsResult>;

  /**
   * Create a new chat
   */
  saveChat(data: SaveChatInput): Promise<Chat>;

  /**
   * Update chat title
   */
  updateChatTitle(chatId: string, userId: string, title: string): Promise<void>;

  /**
   * Delete chat and all associated data
   */
  deleteChatById(id: string, userId: string): Promise<void>;

  /**
   * Delete all chats for a user
   */
  deleteAllChats(userId: string): Promise<{ deletedCount: number }>;

  // ============================================================================
  // MESSAGE QUERIES
  // ============================================================================

  /**
   * Get all messages for a chat, ordered by creation time
   */
  getMessagesByChatId(chatId: string): Promise<Message[]>;

  /**
   * Get single message by ID
   */
  getMessageById(id: string): Promise<Message | undefined>;

  /**
   * Save one or more messages
   */
  saveMessages(messages: SaveMessageInput[]): Promise<Message[]>;

  /**
   * Update message parts
   */
  updateMessage(id: string, updates: { parts?: MessagePart[] }): Promise<void>;

  /**
   * Delete messages created at or after a timestamp
   */
  deleteMessagesByChatIdAfterTimestamp(chatId: string, timestamp: Date): Promise<void>;

  // ============================================================================
  // DOCUMENT QUERIES
  // ============================================================================

  /**
   * Get latest version of a document
   */
  getDocumentById(id: string, userId: string): Promise<Document | undefined>;

  /**
   * Get all versions of a document
   */
  getDocumentsById(id: string, userId: string): Promise<Document[]>;

  /**
   * Get the most recent document of a specific kind for a user.
   * Accepts any string to support app-defined extended kinds.
   */
  getLatestDocumentByKind(
    userId: string,
    kind: string
  ): Promise<Document | undefined>;

  /**
   * Save a document (creates a new version)
   */
  saveDocument(data: SaveDocumentInput): Promise<Document>;

  /**
   * Delete document versions created after a timestamp
   */
  deleteDocumentsByIdAfterTimestamp(
    id: string,
    userId: string,
    timestamp: Date
  ): Promise<Document[]>;

  // ============================================================================
  // VOTE QUERIES
  // ============================================================================

  /**
   * Get all votes for a chat
   */
  getVotesByChatId(chatId: string): Promise<Vote[]>;

  /**
   * Create or update a vote on a message
   */
  voteMessage(params: VoteMessageInput): Promise<Vote>;

  // ============================================================================
  // RATE LIMITING QUERIES
  // ============================================================================

  /**
   * Get count of user messages in the last N hours
   */
  getMessageCountByUserId(options: GetMessageCountOptions): Promise<number>;

  // ============================================================================
  // SEARCH QUERIES
  // ============================================================================

  /**
   * Search chats by title and message content
   */
  searchChats(options: SearchChatsOptions): Promise<SearchChatsResult>;

  /**
   * Get chat with all messages for export
   */
  getChatWithMessages(
    chatId: string,
    userId: string
  ): Promise<{ chat: Chat; messages: Message[] } | null>;
}

/**
 * Type for a database adapter factory function.
 * Implementations export a function that creates an adapter.
 */
export type CreateDatabaseAdapter<TConfig = unknown> = (
  config: TConfig
) => DatabaseAdapter;
