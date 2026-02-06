/**
 * useChatHistory - Hook for managing chat history state with SWR
 *
 * Provides:
 * - Simple fetch of recent chats (last 20)
 * - Automatic caching and revalidation
 * - Delete chat functionality with optimistic updates
 * - Grouping by date (Today, Yesterday, Last 7 days, etc.)
 */

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useSWRNativeRevalidate } from '@nandorojo/swr-react-native';
import { authFetcher } from '../lib/swr';
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

export interface ChatHistoryResponse {
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
  /** Number of chats to fetch */
  limit?: number;
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
  /** Whether more pages are being loaded (kept for API compatibility) */
  isLoadingMore: boolean;
  /** Whether there are more chats available (kept for API compatibility) */
  hasMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Load more chats (no-op, kept for API compatibility) */
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
// HOOK
// ============================================================================

const DEFAULT_LIMIT = 20;

export function useChatHistory(
  options: UseChatHistoryOptions = {}
): UseChatHistoryResult {
  const {
    api = '/api',
    limit = DEFAULT_LIMIT,
    onSelectChat,
    onDeleteChat,
    onError,
  } = options;

  // Simple SWR fetch for recent chats
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ChatHistoryResponse>(
    `${api}/history?limit=${limit}`,
    authFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      onError: (err) => {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      },
    }
  );

  // React Native-specific revalidation (screen focus, app foreground, reconnect)
  useSWRNativeRevalidate({
    mutate,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Extract chats from response
  const chats = useMemo(() => data?.chats ?? [], [data]);

  // Memoized grouped chats
  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

  // Check if there are more chats available
  const hasMore = data?.hasMore ?? false;

  // Load more - no-op for simple implementation (kept for API compatibility)
  const loadMore = useCallback(async () => {
    // No pagination in simplified version
  }, []);

  // Refresh the list
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Delete a chat with optimistic update
  const deleteChat = useCallback(
    async (chatId: string) => {
      // Optimistically remove the chat from the cache
      await mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            chats: current.chats.filter((c) => c.id !== chatId),
          };
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
    await mutate({ chats: [], hasMore: false }, { revalidate: false });

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
    isLoadingMore: false, // No pagination
    hasMore,
    error: error || null,
    loadMore,
    refresh,
    deleteChat,
    deleteAllChats,
    selectChat,
  };
}
