/**
 * Database Queries
 *
 * Re-exports query functions from the database adapter.
 * This maintains backward compatibility with existing code
 * that imports individual query functions.
 */

import { dbAdapter } from './client';
import type {
  Chat,
  Message,
  Document,
  Vote,
  MessagePart,
  ChatWithSnippet,
} from '@chat-sdk-expo/db';

// ============================================================================
// CHAT QUERIES
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
// MESSAGE QUERIES
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
// ============================================================================

export async function getDocumentById(
  id: string,
  userId: string
): Promise<Document | undefined> {
  return dbAdapter.getDocumentById(id, userId);
}

export async function saveDocument(data: {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: 'text' | 'code';
  language?: string;
}): Promise<Document> {
  return dbAdapter.saveDocument(data);
}

export async function getDocumentsById(
  id: string,
  userId: string
): Promise<Document[]> {
  return dbAdapter.getDocumentsById(id, userId);
}

export async function getLatestDocumentByKind(
  userId: string,
  kind: 'text' | 'code'
): Promise<Document | undefined> {
  return dbAdapter.getLatestDocumentByKind(userId, kind);
}

export async function deleteDocumentsByIdAfterTimestamp(
  id: string,
  userId: string,
  timestamp: Date
): Promise<Document[]> {
  return dbAdapter.deleteDocumentsByIdAfterTimestamp(id, userId, timestamp);
}

// ============================================================================
// USER QUERIES
// ============================================================================

export async function getUserById(id: string) {
  return dbAdapter.getUserById(id);
}

// ============================================================================
// RATE LIMITING QUERIES
// ============================================================================

export async function getMessageCountByUserId(options: {
  userId: string;
  differenceInHours: number;
}): Promise<number> {
  return dbAdapter.getMessageCountByUserId(options);
}

// ============================================================================
// VOTE QUERIES
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
// SEARCH QUERIES
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
