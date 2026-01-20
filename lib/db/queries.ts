import { and, asc, desc, eq, lt } from 'drizzle-orm';
import { db } from './client';
import {
  chat,
  message,
  type Chat,
  type DBMessage,
  type MessagePartDB,
} from './schema';

// ============================================================================
// CHAT QUERIES
// ============================================================================

export async function getChatById(id: string): Promise<Chat | undefined> {
  const [result] = await db.select().from(chat).where(eq(chat.id, id));
  return result;
}

export async function getChats(options?: {
  limit?: number;
  cursor?: string;
}): Promise<{ chats: Chat[]; hasMore: boolean }> {
  const { limit = 20, cursor } = options ?? {};

  // If we have a cursor, get the createdAt of that chat
  let cursorDate: Date | null = null;
  if (cursor) {
    const [cursorChat] = await db
      .select({ createdAt: chat.createdAt })
      .from(chat)
      .where(eq(chat.id, cursor))
      .limit(1);

    if (cursorChat) {
      cursorDate = cursorChat.createdAt;
    }
  }

  // Build query with cursor-based pagination
  const conditions = cursorDate ? [lt(chat.createdAt, cursorDate)] : [];

  // Fetch one extra to determine hasMore
  const chats = await db
    .select()
    .from(chat)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(chat.createdAt))
    .limit(limit + 1);

  const hasMore = chats.length > limit;
  const resultChats = hasMore ? chats.slice(0, limit) : chats;

  return { chats: resultChats, hasMore };
}

export async function saveChat(data: {
  id?: string;
  title?: string;
  model?: string;
}): Promise<Chat> {
  const [result] = await db
    .insert(chat)
    .values({
      id: data.id,
      title: data.title ?? 'New Chat',
      model: data.model,
    })
    .returning();
  return result;
}

export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<void> {
  await db
    .update(chat)
    .set({ title, updatedAt: new Date() })
    .where(eq(chat.id, chatId));
}

export async function deleteChatById(id: string): Promise<void> {
  // Messages will cascade delete due to foreign key constraint
  await db.delete(chat).where(eq(chat.id, id));
}

export async function deleteAllChats(): Promise<{ deletedCount: number }> {
  const chats = await db.select({ id: chat.id }).from(chat);
  const deletedCount = chats.length;
  await db.delete(chat);
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
  const { gt } = await import('drizzle-orm');
  await db
    .delete(message)
    .where(and(eq(message.chatId, chatId), gt(message.createdAt, timestamp)));
}
