/**
 * useChatHistory - Hook for managing chat history state with SWR
 *
 * Provides:
 * - Paginated chat list with infinite scroll via useSWRInfinite
 * - Automatic caching and revalidation
 * - Delete chat functionality with optimistic updates
 * - Grouping by date (Today, Yesterday, Last 7 days, etc.)
 */

import { useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useSWRConfig } from 'swr';
import { useSWRNativeRevalidate } from '@nandorojo/swr-react-native';
import { authFetcher, APIError } from '../lib/swr';
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
  /** Select a chat (for callbacks) */
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
// SWR KEY GENERATOR
// ============================================================================

const PAGE_SIZE = 20;

/**
 * Generates the SWR key for pagination.
 * Returns null when there's no more data to fetch.
 */
function getChatHistoryKey(api: string, pageSize: number) {
  return (pageIndex: number, previousPageData: ChatHistoryPage | null) => {
    // No more pages
    if (previousPageData && !previousPageData.hasMore) {
      return null;
    }

    // First page
    if (pageIndex === 0) {
      return `${api}/history?limit=${pageSize}`;
    }

    // Get cursor from last item of previous page
    const lastChat = previousPageData?.chats.at(-1);
    if (!lastChat) {
      return null;
    }

    return `${api}/history?ending_before=${lastChat.id}&limit=${pageSize}`;
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useChatHistory(
  options: UseChatHistoryOptions = {}
): UseChatHistoryResult {
  const {
    api = '/api',
    pageSize = PAGE_SIZE,
    onSelectChat,
    onDeleteChat,
    onError,
  } = options;

  const { mutate: globalMutate } = useSWRConfig();

  // SWR Infinite for paginated data
  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite<ChatHistoryPage>(
    getChatHistoryKey(api, pageSize),
    authFetcher,
    {
      revalidateFirstPage: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      },
    }
  );

  // React Native-specific revalidation (screen focus, app foreground, reconnect)
  // Cast to any because useSWRInfinite's mutate type is slightly different
  useSWRNativeRevalidate({
    mutate: mutate as any,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Flatten all pages into a single chats array
  const chats = useMemo(() => {
    if (!pages) return [];
    return pages.flatMap((page) => page.chats);
  }, [pages]);

  // Memoized grouped chats
  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

  // Check if there are more pages to load
  const hasMore = useMemo(() => {
    if (!pages || pages.length === 0) return true;
    return pages[pages.length - 1]?.hasMore ?? false;
  }, [pages]);

  // Loading more = we've set size but validation is still in progress
  const isLoadingMore = isValidating && size > 1 && pages && pages.length < size;

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isValidating || !hasMore) return;
    await setSize(size + 1);
  }, [hasMore, isValidating, setSize, size]);

  // Refresh the entire list
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Delete a chat with optimistic update
  const deleteChat = useCallback(
    async (chatId: string) => {
      // Optimistically remove the chat from the cache
      await mutate(
        (currentPages) => {
          if (!currentPages) return currentPages;
          return currentPages.map((page) => ({
            ...page,
            chats: page.chats.filter((c) => c.id !== chatId),
          }));
        },
        { revalidate: false }
      );

      try {
        const response = await authFetch(`${api}/chats/${chatId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete chat: ${response.statusText}`);
        }

        onDeleteChat?.(chatId);
      } catch (err) {
        // Revert on error
        await mutate();
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        throw error;
      }
    },
    [api, mutate, onDeleteChat, onError]
  );

  // Delete all chats
  const deleteAllChats = useCallback(async () => {
    // Optimistically clear all
    await mutate([], { revalidate: false });

    try {
      const response = await authFetch(`${api}/history`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete all chats: ${response.statusText}`);
      }
    } catch (err) {
      // Revert on error
      await mutate();
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      throw error;
    }
  }, [api, mutate, onError]);

  // Select a chat (just triggers callback)
  const selectChat = useCallback(
    (chatId: string | null) => {
      if (chatId) {
        const chat = chats.find((c) => c.id === chatId);
        if (chat) {
          onSelectChat?.(chat);
        }
      }
    },
    [chats, onSelectChat]
  );

  return {
    chats,
    groupedChats,
    isLoading,
    isLoadingMore: isLoadingMore ?? false,
    hasMore,
    error: error || null,
    loadMore,
    refresh,
    deleteChat,
    deleteAllChats,
    selectChat,
  };
}
