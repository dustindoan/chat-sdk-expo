import { and, asc, desc, eq, lt, gte, count, sql } from 'drizzle-orm';
import { db } from './client';
import {
  chat,
  message,
  document,
  vote,
  type Chat,
  type DBMessage,
  type MessagePartDB,
  type Document,
  type Vote,
} from './schema';

// ============================================================================
// CHAT QUERIES
// ============================================================================

export async function getChatById(
  id: string,
  userId: string
): Promise<Chat | undefined> {
  const [result] = await db
    .select()
    .from(chat)
    .where(and(eq(chat.id, id), eq(chat.userId, userId)));
  return result;
}

export async function getChats(options: {
  userId: string;
  limit?: number;
  cursor?: string;
}): Promise<{ chats: Chat[]; hasMore: boolean }> {
  const { userId, limit = 20, cursor } = options;

  // If we have a cursor, get the createdAt of that chat
  let cursorDate: Date | null = null;
  if (cursor) {
    const [cursorChat] = await db
      .select({ createdAt: chat.createdAt })
      .from(chat)
      .where(and(eq(chat.id, cursor), eq(chat.userId, userId)))
      .limit(1);

    if (cursorChat) {
      cursorDate = cursorChat.createdAt;
    }
  }

  // Build query with cursor-based pagination - always filter by userId
  const conditions = [eq(chat.userId, userId)];
  if (cursorDate) {
    conditions.push(lt(chat.createdAt, cursorDate));
  }

  // Fetch one extra to determine hasMore
  const chats = await db
    .select()
    .from(chat)
    .where(and(...conditions))
    .orderBy(desc(chat.createdAt))
    .limit(limit + 1);

  const hasMore = chats.length > limit;
  const resultChats = hasMore ? chats.slice(0, limit) : chats;

  return { chats: resultChats, hasMore };
}

export async function saveChat(data: {
  id?: string;
  userId: string;
  title?: string;
  model?: string;
}): Promise<Chat> {
  const [result] = await db
    .insert(chat)
    .values({
      id: data.id,
      userId: data.userId,
      title: data.title ?? 'New Chat',
      model: data.model,
    })
    .returning();
  return result;
}

export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
): Promise<void> {
  await db
    .update(chat)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)));
}

export async function deleteChatById(id: string, userId: string): Promise<void> {
  // Messages will cascade delete due to foreign key constraint
  await db.delete(chat).where(and(eq(chat.id, id), eq(chat.userId, userId)));
}

export async function deleteAllChats(
  userId: string
): Promise<{ deletedCount: number }> {
  const chats = await db
    .select({ id: chat.id })
    .from(chat)
    .where(eq(chat.userId, userId));
  const deletedCount = chats.length;
  if (deletedCount > 0) {
    await db.delete(chat).where(eq(chat.userId, userId));
  }
  return { deletedCount };
}

// ============================================================================
// MESSAGE QUERIES
// ============================================================================

export async function getMessagesByChatId(chatId: string): Promise<DBMessage[]> {
  return db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(asc(message.createdAt));
}

export async function saveMessages(
  messages: Array<{
    id?: string;
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    parts: MessagePartDB[];
  }>
): Promise<DBMessage[]> {
  if (messages.length === 0) return [];

  return db
    .insert(message)
    .values(
      messages.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        role: m.role,
        parts: m.parts,
      }))
    )
    .onConflictDoNothing()
    .returning();
}

export async function updateMessage(
  id: string,
  updates: {
    parts?: MessagePartDB[];
  }
): Promise<void> {
  await db.update(message).set(updates).where(eq(message.id, id));
}

export async function deleteMessagesByChatIdAfterTimestamp(
  chatId: string,
  timestamp: Date
): Promise<void> {
  const { gte } = await import('drizzle-orm');
  await db
    .delete(message)
    .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
}

export async function getMessageById(id: string): Promise<DBMessage | undefined> {
  const [result] = await db.select().from(message).where(eq(message.id, id));
  return result;
}

// ============================================================================
// DOCUMENT QUERIES
// ============================================================================

export async function getDocumentById(
  id: string,
  userId: string
): Promise<Document | undefined> {
  // Get the most recent version of the document
  const [result] = await db
    .select()
    .from(document)
    .where(and(eq(document.id, id), eq(document.userId, userId)))
    .orderBy(desc(document.createdAt))
    .limit(1);
  return result;
}

export async function saveDocument(data: {
  id: string;
  userId: string;
  title: string;
  content: string;
  kind: 'text' | 'code';
  language?: string;
}): Promise<Document> {
  const [result] = await db
    .insert(document)
    .values({
      id: data.id,
      userId: data.userId,
      title: data.title,
      content: data.content,
      kind: data.kind,
      language: data.language,
    })
    .returning();
  return result;
}

export async function getDocumentsById(
  id: string,
  userId: string
): Promise<Document[]> {
  // Get all versions of a document, sorted by creation date ascending
  return db
    .select()
    .from(document)
    .where(and(eq(document.id, id), eq(document.userId, userId)))
    .orderBy(asc(document.createdAt));
}

export async function deleteDocumentsByIdAfterTimestamp(
  id: string,
  userId: string,
  timestamp: Date
): Promise<Document[]> {
  const { gt } = await import('drizzle-orm');
  // Delete all versions created after the given timestamp
  // Returns the deleted documents
  const toDelete = await db
    .select()
    .from(document)
    .where(
      and(
        eq(document.id, id),
        eq(document.userId, userId),
        gt(document.createdAt, timestamp)
      )
    );

  if (toDelete.length > 0) {
    await db
      .delete(document)
      .where(
        and(
          eq(document.id, id),
          eq(document.userId, userId),
          gt(document.createdAt, timestamp)
        )
      );
  }

  return toDelete;
}

// ============================================================================
// USER QUERIES
// ============================================================================

export async function getUserById(id: string) {
  const { user } = await import('./schema');
  const [result] = await db.select().from(user).where(eq(user.id, id));
  return result;
}

// ============================================================================
// RATE LIMITING QUERIES
// ============================================================================

/**
 * Get count of user messages in the last N hours
 * Used for rate limiting
 */
export async function getMessageCountByUserId(options: {
  userId: string;
  differenceInHours: number;
}): Promise<number> {
  const { userId, differenceInHours } = options;

  // Calculate the cutoff time
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - differenceInHours);

  // Count user messages from their chats in the time window
  // We need to join message -> chat to filter by userId
  const result = await db
    .select({ count: count() })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(
      and(
        eq(chat.userId, userId),
        eq(message.role, 'user'),
        gte(message.createdAt, cutoffTime)
      )
    );

  return result[0]?.count ?? 0;
}

// ============================================================================
// VOTE QUERIES
// ============================================================================

/**
 * Get all votes for a chat
 */
export async function getVotesByChatId(chatId: string): Promise<Vote[]> {
  return db.select().from(vote).where(eq(vote.chatId, chatId));
}

/**
 * Create or update a vote on a message
 */
export async function voteMessage(params: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}): Promise<Vote> {
  const { chatId, messageId, type } = params;
  const isUpvoted = type === 'up';

  const [result] = await db
    .insert(vote)
    .values({ chatId, messageId, isUpvoted })
    .onConflictDoUpdate({
      target: [vote.chatId, vote.messageId],
      set: { isUpvoted },
    })
    .returning();

  return result;
}
