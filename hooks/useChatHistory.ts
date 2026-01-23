/**
 * useChatHistory - Hook for managing chat history state
 *
 * Provides:
 * - Paginated chat list with infinite scroll
 * - Delete chat functionality
 * - Chat selection for loading
 * - Grouping by date (Today, Yesterday, Last 7 days, etc.)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { authFetch } from '../lib/auth/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Chat {
  id: string;
  title: string;
  model?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ChatHistoryPage {
  chats: Chat[];
  hasMore: boolean;
}

export interface GroupedChats {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
}

export interface UseChatHistoryOptions {
  /** API base URL for history endpoints */
  api?: string;
  /** Page size for pagination */
  pageSize?: number;
  /** Called when a chat is selected */
  onSelectChat?: (chat: Chat) => void;
  /** Called when chat is deleted */
  onDeleteChat?: (chatId: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UseChatHistoryResult {
  /** All loaded chats */
  chats: Chat[];
  /** Chats grouped by date */
  groupedChats: GroupedChats;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether more pages are being loaded */
  isLoadingMore: boolean;
  /** Whether there are more pages to load */
  hasMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Load more chats (for infinite scroll) */
  loadMore: () => Promise<void>;
  /** Refresh the chat list */
  refresh: () => Promise<void>;
  /** Delete a chat */
  deleteChat: (chatId: string) => Promise<void>;
  /** Delete all chats */
  deleteAllChats: () => Promise<void>;
  /** Currently selected chat ID */
  selectedChatId: string | null;
  /** Select a chat */
  selectChat: (chatId: string | null) => void;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function isWithinDays(date: Date, days: number): boolean {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date > cutoff;
}

function groupChatsByDate(chats: Chat[]): GroupedChats {
  const groups: GroupedChats = {
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  };

  for (const chat of chats) {
    const date = new Date(chat.createdAt);

    if (isToday(date)) {
      groups.today.push(chat);
    } else if (isYesterday(date)) {
      groups.yesterday.push(chat);
    } else if (isWithinDays(date, 7)) {
      groups.lastWeek.push(chat);
    } else if (isWithinDays(date, 30)) {
      groups.lastMonth.push(chat);
    } else {
      groups.older.push(chat);
    }
  }

  return groups;
}

// ============================================================================
// HOOK
// ============================================================================

export function useChatHistory(
  options: UseChatHistoryOptions = {}
): UseChatHistoryResult {
  const {
    api = '/api',
    pageSize = 20,
    onSelectChat,
    onDeleteChat,
    onError,
  } = options;

  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Memoized grouped chats
  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

  // Fetch a page of chats
  const fetchPage = useCallback(
    async (cursor?: string): Promise<ChatHistoryPage> => {
      const params = new URLSearchParams({ limit: String(pageSize) });
      if (cursor) {
        params.set('ending_before', cursor);
      }

      const response = await authFetch(`${api}/history?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized');
        }
        throw new Error(`Failed to fetch history: ${response.statusText}`);
      }

      return response.json();
    },
    [api, pageSize]
  );

  // Initial load
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const page = await fetchPage();
      setChats(page.chats);
      setHasMore(page.hasMore);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, onError]);

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || chats.length === 0) return;

    setIsLoadingMore(true);

    try {
      const lastChat = chats[chats.length - 1];
      const page = await fetchPage(lastChat.id);
      setChats((prev) => [...prev, ...page.chats]);
      setHasMore(page.hasMore);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chats, fetchPage, hasMore, isLoadingMore, onError]);

  // Delete a chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await authFetch(`${api}/chats/${chatId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete chat: ${response.statusText}`);
        }

        // Remove from local state
        setChats((prev) => prev.filter((c) => c.id !== chatId));

        // Clear selection if deleted chat was selected
        if (selectedChatId === chatId) {
          setSelectedChatId(null);
        }

        onDeleteChat?.(chatId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        throw error;
      }
    },
    [api, onDeleteChat, onError, selectedChatId]
  );

  // Delete all chats
  const deleteAllChats = useCallback(async () => {
    try {
      const response = await authFetch(`${api}/history`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete all chats: ${response.statusText}`);
      }

      // Clear local state
      setChats([]);
      setSelectedChatId(null);
      setHasMore(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [api, onError]);

  // Select a chat
  const selectChat = useCallback(
    (chatId: string | null) => {
      setSelectedChatId(chatId);
      if (chatId) {
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
          onSelectChat?.(chat);
        }
      }
    },
    [chats, onSelectChat]
  );

  // Initial load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    chats,
    groupedChats,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    deleteChat,
    deleteAllChats,
    selectedChatId,
    selectChat,
  };
}
