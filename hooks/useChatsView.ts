/**
 * useChatsView - Hook for the dedicated Chats view with search and pagination
 *
 * Provides:
 * - Full-text search across all message content
 * - Paginated chat list with "Show more"
 * - Delete chat functionality
 * - Export chat functionality
 */

import { useCallback, useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { useSWRNativeRevalidate } from '@nandorojo/swr-react-native';
import { authFetcher } from '../lib/swr';
import { authFetch } from '../lib/auth/client';
import { Platform } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatWithSnippet {
  id: string;
  title: string;
  model?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  snippet?: string;
  messageCount?: number;
}

export interface ChatsViewResponse {
  chats: ChatWithSnippet[];
  hasMore: boolean;
}

export interface UseChatsViewOptions {
  /** API base URL */
  api?: string;
  /** Number of chats per page */
  limit?: number;
  /** Debounce delay for search (ms) */
  debounceMs?: number;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UseChatsViewResult {
  /** Search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Whether search is active */
  isSearching: boolean;
  /** All loaded chats */
  chats: ChatWithSnippet[];
  /** Total count (approximate) */
  totalCount: number | null;
  /** Whether initial load is in progress */
  isLoading: boolean;
  /** Whether more pages are being loaded */
  isLoadingMore: boolean;
  /** Whether there are more chats available */
  hasMore: boolean;
  /** Error if any */
  error: Error | null;
  /** Load more chats */
  loadMore: () => Promise<void>;
  /** Refresh the chat list */
  refresh: () => Promise<void>;
  /** Delete a chat */
  deleteChat: (chatId: string) => Promise<void>;
  /** Export a chat as JSON (triggers download) */
  exportChat: (chatId: string) => Promise<void>;
}

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// HOOK
// ============================================================================

const DEFAULT_LIMIT = 20;
const DEFAULT_DEBOUNCE_MS = 300;

export function useChatsView(
  options: UseChatsViewOptions = {}
): UseChatsViewResult {
  const {
    api = '/api',
    limit = DEFAULT_LIMIT,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    onError,
  } = options;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, debounceMs);
  const isSearching = debouncedQuery.trim().length > 0;

  // Pagination state
  const [allChats, setAllChats] = useState<ChatWithSnippet[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build the API URL based on search state
  const apiUrl = useMemo(() => {
    if (isSearching) {
      return `${api}/search?q=${encodeURIComponent(debouncedQuery)}&limit=${limit}`;
    }
    return `${api}/history?limit=${limit}`;
  }, [api, debouncedQuery, isSearching, limit]);

  // Fetch chats
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ChatsViewResponse>(apiUrl, authFetcher, {
    revalidateOnFocus: false, // Don't revalidate on focus for this view
    onError: (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    },
  });

  // React Native-specific revalidation
  useSWRNativeRevalidate({
    mutate,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Reset pagination when search changes
  useEffect(() => {
    setAllChats([]);
    setCursor(null);
  }, [debouncedQuery]);

  // Update allChats when data changes
  useEffect(() => {
    if (data) {
      setAllChats(data.chats);
      setHasMore(data.hasMore);
      // Set cursor to last chat ID for pagination
      if (data.chats.length > 0) {
        setCursor(data.chats[data.chats.length - 1].id);
      }
    }
  }, [data]);

  // Load more chats
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;

    setIsLoadingMore(true);
    try {
      const url = isSearching
        ? `${api}/search?q=${encodeURIComponent(debouncedQuery)}&limit=${limit}&cursor=${cursor}`
        : `${api}/history?limit=${limit}&ending_before=${cursor}`;

      const response = await authFetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load more: ${response.statusText}`);
      }

      const moreData: ChatsViewResponse = await response.json();

      setAllChats((prev) => [...prev, ...moreData.chats]);
      setHasMore(moreData.hasMore);
      if (moreData.chats.length > 0) {
        setCursor(moreData.chats[moreData.chats.length - 1].id);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [api, cursor, debouncedQuery, hasMore, isLoadingMore, isSearching, limit, onError]);

  // Refresh the list
  const refresh = useCallback(async () => {
    setCursor(null);
    setAllChats([]);
    await mutate();
  }, [mutate]);

  // Delete a chat
  const deleteChat = useCallback(
    async (chatId: string) => {
      // Optimistically remove from local state
      setAllChats((prev) => prev.filter((c) => c.id !== chatId));

      try {
        const response = await authFetch(`${api}/chats/${chatId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete chat: ${response.statusText}`);
        }

        // Also update SWR cache
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
      } catch (err) {
        // Revert on error - refetch
        await refresh();
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        throw error;
      }
    },
    [api, mutate, onError, refresh]
  );

  // Export a chat as JSON
  const exportChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await authFetch(`${api}/chats/${chatId}/export`);

        if (!response.ok) {
          throw new Error(`Failed to export chat: ${response.statusText}`);
        }

        const blob = await response.blob();
        const chat = allChats.find((c) => c.id === chatId);
        const filename = `chat-${chat?.title?.slice(0, 30) || chatId}.json`;

        // Trigger download
        if (Platform.OS === 'web') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // For native platforms, we'd need expo-file-system and expo-sharing
          // For now, just log a message
          console.log('Export on native requires expo-file-system');
          onError?.(new Error('Export is only supported on web for now'));
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        throw error;
      }
    },
    [api, allChats, onError]
  );

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    chats: allChats,
    totalCount: null, // Would need a separate count query
    isLoading,
    isLoadingMore,
    hasMore,
    error: error || null,
    loadMore,
    refresh,
    deleteChat,
    exportChat,
  };
}
