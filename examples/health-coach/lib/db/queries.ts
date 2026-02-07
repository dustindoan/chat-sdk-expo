/**
 * Database Queries
 *
 * Delegates to the database adapter.
 * Wally extends document kinds with 'training-block'.
 */

import { dbAdapter } from './client';
import type {
  Chat,
  Message,
  Vote,
  MessagePart,
  ChatWithSnippet,
} from '@chat-sdk-expo/db';
import type { Document, WallyDocumentKind } from './schema';

// ============================================================================
// CHAT QUERIES (delegated to adapter)
// ============================================================================

export async function getChatById(
  id: string,
  userId: string
): Promise<Chat | undefined> {
  return dbAdapter.getChatById(id, userId);
}

export async function getChats(options: {
  userId: string;
  limit?: number;
  cursor?: string;
}): Promise<{ chats: Chat[]; hasMore: boolean }> {
  return dbAdapter.getChats(options);
}

export async function saveChat(data: {
  id?: string;
  userId: string;
  title?: string;
  model?: string;
}): Promise<Chat> {
  return dbAdapter.saveChat(data);
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
): Promise<void> {
  return dbAdapter.updateChatTitle(chatId, userId, title);
}

export async function deleteChatById(id: string, userId: string): Promise<void> {
  return dbAdapter.deleteChatById(id, userId);
}

export async function deleteAllChats(
  userId: string
): Promise<{ deletedCount: number }> {
  return dbAdapter.deleteAllChats(userId);
}

// ============================================================================
// MESSAGE QUERIES (delegated to adapter)
// ============================================================================

export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
  return dbAdapter.getMessagesByChatId(chatId);
}

export async function saveMessages(
  messages: Array<{
    id?: string;
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    parts: MessagePart[];
  }>
): Promise<Message[]> {
  return dbAdapter.saveMessages(messages);
}

export async function updateMessage(
  id: string,
  updates: {
    parts?: MessagePart[];
  }
): Promise<void> {
  return dbAdapter.updateMessage(id, updates);
}

export async function deleteMessagesByChatIdAfterTimestamp(
  chatId: string,
  timestamp: Date
): Promise<void> {
  return dbAdapter.deleteMessagesByChatIdAfterTimestamp(chatId, timestamp);
}

export async function getMessageById(id: string): Promise<Message | undefined> {
  return dbAdapter.getMessageById(id);
}

// ============================================================================
// DOCUMENT QUERIES
// Adapter now supports extended kinds like 'training-block'
// ============================================================================

export async function getDocumentById(
  id: string,
  userId: string
): Promise<Document | undefined> {
  const result = await dbAdapter.getDocumentById(id, userId);
  return result as Document | undefined;
}

export async function saveDocument(data: {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: WallyDocumentKind;
  language?: string;
}): Promise<Document> {
  const result = await dbAdapter.saveDocument(data);
  return result as Document;
}

export async function getDocumentsById(
  id: string,
  userId: string
): Promise<Document[]> {
  const results = await dbAdapter.getDocumentsById(id, userId);
  return results as Document[];
}

/**
 * Get the most recent document of a specific kind for a user.
 * Supports extended kinds like 'training-block'.
 */
export async function getLatestDocumentByKind(
  userId: string,
  kind: WallyDocumentKind
): Promise<Document | undefined> {
  // Adapter now accepts any string kind
  const result = await dbAdapter.getLatestDocumentByKind(userId, kind);
  return result as Document | undefined;
}

export async function deleteDocumentsByIdAfterTimestamp(
  id: string,
  userId: string,
  timestamp: Date
): Promise<Document[]> {
  const results = await dbAdapter.deleteDocumentsByIdAfterTimestamp(id, userId, timestamp);
  return results as Document[];
}

// ============================================================================
// USER QUERIES (delegated to adapter)
// ============================================================================

export async function getUserById(id: string) {
  return dbAdapter.getUserById(id);
}

// ============================================================================
// RATE LIMITING QUERIES (delegated to adapter)
// ============================================================================

export async function getMessageCountByUserId(options: {
  userId: string;
  differenceInHours: number;
}): Promise<number> {
  return dbAdapter.getMessageCountByUserId(options);
}

// ============================================================================
// VOTE QUERIES (delegated to adapter)
// ============================================================================

export async function getVotesByChatId(chatId: string): Promise<Vote[]> {
  return dbAdapter.getVotesByChatId(chatId);
}

export async function voteMessage(params: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}): Promise<Vote> {
  return dbAdapter.voteMessage(params);
}

// ============================================================================
// SEARCH QUERIES (delegated to adapter)
// ============================================================================

export async function searchChats(options: {
  userId: string;
  query: string;
  limit?: number;
  cursor?: string;
}): Promise<{ chats: ChatWithSnippet[]; hasMore: boolean }> {
  return dbAdapter.searchChats(options);
}

export async function getChatWithMessages(
  chatId: string,
  userId: string
): Promise<{ chat: Chat; messages: Message[] } | null> {
  return dbAdapter.getChatWithMessages(chatId, userId);
}
