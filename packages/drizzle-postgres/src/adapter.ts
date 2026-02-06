/**
 * @chat-sdk-expo/drizzle-postgres - Adapter
 *
 * Drizzle + PostgreSQL implementation of DatabaseAdapter.
 */

import { and, asc, desc, eq, lt, gte, gt, count, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type {
  DatabaseAdapter,
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
} from '@chat-sdk-expo/db';
import * as schema from './schema';

/**
 * Configuration for creating the Drizzle PostgreSQL adapter
 */
export interface DrizzlePostgresAdapterConfig {
  /**
   * Drizzle database instance.
   * Create with: drizzle(postgres(connectionString))
   */
  db: PostgresJsDatabase<typeof schema>;
}

/**
 * Create a Drizzle PostgreSQL database adapter
 */
export function createDrizzlePostgresAdapter(
  config: DrizzlePostgresAdapterConfig
): DatabaseAdapter {
  const { db } = config;

  // ============================================================================
  // USER QUERIES
  // ============================================================================

  async function getUserById(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(schema.user).where(eq(schema.user.id, id));
    if (!result) return undefined;
    return {
      ...result,
      type: result.type as 'regular' | 'guest',
    };
  }

  // ============================================================================
  // CHAT QUERIES
  // ============================================================================

  async function getChatById(id: string, userId: string): Promise<Chat | undefined> {
    const [result] = await db
      .select()
      .from(schema.chat)
      .where(and(eq(schema.chat.id, id), eq(schema.chat.userId, userId)));
    return result;
  }

  async function getChats(options: GetChatsOptions): Promise<GetChatsResult> {
    const { userId, limit = 20, cursor } = options;

    let cursorDate: Date | null = null;
    if (cursor) {
      const [cursorChat] = await db
        .select({ createdAt: schema.chat.createdAt })
        .from(schema.chat)
        .where(and(eq(schema.chat.id, cursor), eq(schema.chat.userId, userId)))
        .limit(1);

      if (cursorChat) {
        cursorDate = cursorChat.createdAt;
      }
    }

    const conditions = [eq(schema.chat.userId, userId)];
    if (cursorDate) {
      conditions.push(lt(schema.chat.createdAt, cursorDate));
    }

    const chats = await db
      .select()
      .from(schema.chat)
      .where(and(...conditions))
      .orderBy(desc(schema.chat.createdAt))
      .limit(limit + 1);

    const hasMore = chats.length > limit;
    const resultChats = hasMore ? chats.slice(0, limit) : chats;

    return { chats: resultChats, hasMore };
  }

  async function saveChat(data: SaveChatInput): Promise<Chat> {
    const [result] = await db
      .insert(schema.chat)
      .values({
        id: data.id,
        userId: data.userId,
        title: data.title ?? 'New Chat',
        model: data.model,
      })
      .returning();
    return result;
  }

  async function updateChatTitle(chatId: string, userId: string, title: string): Promise<void> {
    await db
      .update(schema.chat)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(schema.chat.id, chatId), eq(schema.chat.userId, userId)));
  }

  async function deleteChatById(id: string, userId: string): Promise<void> {
    await db.delete(schema.chat).where(and(eq(schema.chat.id, id), eq(schema.chat.userId, userId)));
  }

  async function deleteAllChats(userId: string): Promise<{ deletedCount: number }> {
    const chats = await db
      .select({ id: schema.chat.id })
      .from(schema.chat)
      .where(eq(schema.chat.userId, userId));
    const deletedCount = chats.length;
    if (deletedCount > 0) {
      await db.delete(schema.chat).where(eq(schema.chat.userId, userId));
    }
    return { deletedCount };
  }

  // ============================================================================
  // MESSAGE QUERIES
  // ============================================================================

  async function getMessagesByChatId(chatId: string): Promise<Message[]> {
    const messages = await db
      .select()
      .from(schema.message)
      .where(eq(schema.message.chatId, chatId))
      .orderBy(asc(schema.message.createdAt));

    return messages.map((m) => ({
      ...m,
      role: m.role as 'user' | 'assistant' | 'system',
    }));
  }

  async function getMessageById(id: string): Promise<Message | undefined> {
    const [result] = await db.select().from(schema.message).where(eq(schema.message.id, id));
    if (!result) return undefined;
    return {
      ...result,
      role: result.role as 'user' | 'assistant' | 'system',
    };
  }

  async function saveMessages(messages: SaveMessageInput[]): Promise<Message[]> {
    if (messages.length === 0) return [];

    const results = await db
      .insert(schema.message)
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

    return results.map((m) => ({
      ...m,
      role: m.role as 'user' | 'assistant' | 'system',
    }));
  }

  async function updateMessage(id: string, updates: { parts?: MessagePart[] }): Promise<void> {
    await db.update(schema.message).set(updates).where(eq(schema.message.id, id));
  }

  async function deleteMessagesByChatIdAfterTimestamp(chatId: string, timestamp: Date): Promise<void> {
    await db
      .delete(schema.message)
      .where(and(eq(schema.message.chatId, chatId), gte(schema.message.createdAt, timestamp)));
  }

  // ============================================================================
  // DOCUMENT QUERIES
  // ============================================================================

  async function getDocumentById(id: string, userId: string): Promise<Document | undefined> {
    const [result] = await db
      .select()
      .from(schema.document)
      .where(and(eq(schema.document.id, id), eq(schema.document.userId, userId)))
      .orderBy(desc(schema.document.createdAt))
      .limit(1);

    if (!result) return undefined;
    return {
      ...result,
      kind: result.kind, // Preserve original kind string
    };
  }

  async function getDocumentsById(id: string, userId: string): Promise<Document[]> {
    const documents = await db
      .select()
      .from(schema.document)
      .where(and(eq(schema.document.id, id), eq(schema.document.userId, userId)))
      .orderBy(asc(schema.document.createdAt));

    return documents.map((d) => ({
      ...d,
      kind: d.kind, // Preserve original kind string
    }));
  }

  async function getLatestDocumentByKind(
    userId: string,
    kind: string
  ): Promise<Document | undefined> {
    const [result] = await db
      .select()
      .from(schema.document)
      .where(and(eq(schema.document.userId, userId), eq(schema.document.kind, kind)))
      .orderBy(desc(schema.document.createdAt))
      .limit(1);

    if (!result) return undefined;
    return {
      ...result,
      kind: result.kind, // Preserve original kind string
    };
  }

  async function saveDocument(data: SaveDocumentInput): Promise<Document> {
    const [result] = await db
      .insert(schema.document)
      .values({
        id: data.id,
        userId: data.userId,
        title: data.title,
        content: data.content,
        kind: data.kind,
        language: data.language,
      })
      .returning();

    return {
      ...result,
      kind: result.kind, // Preserve original kind string
    };
  }

  async function deleteDocumentsByIdAfterTimestamp(
    id: string,
    userId: string,
    timestamp: Date
  ): Promise<Document[]> {
    const toDelete = await db
      .select()
      .from(schema.document)
      .where(
        and(
          eq(schema.document.id, id),
          eq(schema.document.userId, userId),
          gt(schema.document.createdAt, timestamp)
        )
      );

    if (toDelete.length > 0) {
      await db
        .delete(schema.document)
        .where(
          and(
            eq(schema.document.id, id),
            eq(schema.document.userId, userId),
            gt(schema.document.createdAt, timestamp)
          )
        );
    }

    return toDelete.map((d) => ({
      ...d,
      kind: d.kind, // Preserve original kind string
    }));
  }

  // ============================================================================
  // VOTE QUERIES
  // ============================================================================

  async function getVotesByChatId(chatId: string): Promise<Vote[]> {
    return db.select().from(schema.vote).where(eq(schema.vote.chatId, chatId));
  }

  async function voteMessage(params: VoteMessageInput): Promise<Vote> {
    const { chatId, messageId, type } = params;
    const isUpvoted = type === 'up';

    const [result] = await db
      .insert(schema.vote)
      .values({ chatId, messageId, isUpvoted })
      .onConflictDoUpdate({
        target: [schema.vote.chatId, schema.vote.messageId],
        set: { isUpvoted },
      })
      .returning();

    return result;
  }

  // ============================================================================
  // RATE LIMITING QUERIES
  // ============================================================================

  async function getMessageCountByUserId(options: GetMessageCountOptions): Promise<number> {
    const { userId, differenceInHours } = options;

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - differenceInHours);

    const result = await db
      .select({ count: count() })
      .from(schema.message)
      .innerJoin(schema.chat, eq(schema.message.chatId, schema.chat.id))
      .where(
        and(
          eq(schema.chat.userId, userId),
          eq(schema.message.role, 'user'),
          gte(schema.message.createdAt, cutoffTime)
        )
      );

    return result[0]?.count ?? 0;
  }

  // ============================================================================
  // SEARCH QUERIES
  // ============================================================================

  async function searchChats(options: SearchChatsOptions): Promise<SearchChatsResult> {
    const { userId, query, limit = 20, cursor } = options;

    const escapedQuery = query.replace(/[%_]/g, '\\$&');
    const searchPattern = `%${escapedQuery}%`;

    let cursorDate: Date | null = null;
    if (cursor) {
      const [cursorChat] = await db
        .select({ updatedAt: schema.chat.updatedAt })
        .from(schema.chat)
        .where(and(eq(schema.chat.id, cursor), eq(schema.chat.userId, userId)))
        .limit(1);

      if (cursorChat) {
        cursorDate = cursorChat.updatedAt;
      }
    }

    const conditions = [eq(schema.chat.userId, userId)];
    if (cursorDate) {
      conditions.push(lt(schema.chat.updatedAt, cursorDate));
    }

    const searchCondition = sql`(
      "Chat".title ILIKE ${searchPattern}
      OR EXISTS (
        SELECT 1 FROM "Message" m,
        json_array_elements(m.parts) AS p
        WHERE m."chatId" = "Chat".id
        AND p->>'text' ILIKE ${searchPattern}
      )
    )`;

    const results = await db
      .select()
      .from(schema.chat)
      .where(and(...conditions, searchCondition))
      .orderBy(desc(schema.chat.updatedAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const chats = hasMore ? results.slice(0, limit) : results;

    const chatsWithSnippets: ChatWithSnippet[] = await Promise.all(
      chats.map(async (c) => {
        let snippet: string | undefined;
        let messageCount = 0;

        try {
          const snippetResult = await db.execute(sql`
            SELECT p->>'text' as snippet
            FROM "Message" m,
            json_array_elements(m.parts) AS p
            WHERE m."chatId" = ${c.id}
            AND p->>'text' ILIKE ${searchPattern}
            LIMIT 1
          `);

          snippet = (snippetResult as unknown as { rows?: { snippet?: string }[] })?.rows?.[0]?.snippet;
        } catch {
          // Ignore snippet errors
        }

        try {
          const countResult = await db
            .select({ count: count() })
            .from(schema.message)
            .where(eq(schema.message.chatId, c.id));

          messageCount = countResult?.[0]?.count ?? 0;
        } catch {
          // Ignore count errors
        }

        return {
          ...c,
          snippet: snippet ? truncateSnippet(snippet, query, 100) : undefined,
          messageCount,
        };
      })
    );

    return { chats: chatsWithSnippets, hasMore };
  }

  async function getChatWithMessages(
    chatId: string,
    userId: string
  ): Promise<{ chat: Chat; messages: Message[] } | null> {
    const chatResult = await getChatById(chatId, userId);
    if (!chatResult) return null;

    const messages = await getMessagesByChatId(chatId);

    return { chat: chatResult, messages };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  function truncateSnippet(text: string, searchTerm: string, maxLength: number): string {
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);

    if (index === -1 || text.length <= maxLength) {
      return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    const halfLength = Math.floor((maxLength - searchTerm.length) / 2);
    let start = Math.max(0, index - halfLength);
    let end = Math.min(text.length, index + searchTerm.length + halfLength);

    if (start === 0) {
      end = Math.min(text.length, maxLength);
    } else if (end === text.length) {
      start = Math.max(0, text.length - maxLength);
    }

    let snippet = text.slice(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet;
  }

  // ============================================================================
  // RETURN ADAPTER
  // ============================================================================

  return {
    getUserById,
    getChatById,
    getChats,
    saveChat,
    updateChatTitle,
    deleteChatById,
    deleteAllChats,
    getMessagesByChatId,
    getMessageById,
    saveMessages,
    updateMessage,
    deleteMessagesByChatIdAfterTimestamp,
    getDocumentById,
    getDocumentsById,
    getLatestDocumentByKind,
    saveDocument,
    deleteDocumentsByIdAfterTimestamp,
    getVotesByChatId,
    voteMessage,
    getMessageCountByUserId,
    searchChats,
    getChatWithMessages,
  };
}
