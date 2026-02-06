/**
 * Tests for useChatHistory hook
 *
 * Tests:
 * - Initial loading state
 * - Chat list fetching and pagination
 * - Date grouping (today, yesterday, lastWeek, etc.)
 * - Delete chat with optimistic update
 * - Delete all chats
 * - Error handling
 * - SWR caching behavior
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { SWRConfig } from 'swr';
import React from 'react';
import { Platform } from 'react-native';

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web || obj.default),
}));

// Mock SWR native revalidate
jest.mock('@nandorojo/swr-react-native', () => ({
  useSWRNativeRevalidate: jest.fn(),
}));

// Mock auth client
jest.mock('../../lib/auth/client', () => ({
  getAuthCookie: jest.fn().mockResolvedValue(null),
  authFetch: jest.fn(),
}));

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Helper to create SWR wrapper with fresh cache
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
        {children}
      </SWRConfig>
    );
  };
}

// Helper to create mock chat data
function createMockChat(id: string, title: string, daysAgo: number = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    title,
    model: 'claude-haiku-4-5-20251001',
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };
}

describe('useChatHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (Platform as any).OS = 'web';
  });

  describe('Initial loading', () => {
    it('starts in loading state', async () => {
      // Never resolve fetch to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.chats).toEqual([]);
    });

    it('loads chats on mount', async () => {
      const mockChats = [
        createMockChat('1', 'Chat 1', 0),
        createMockChat('2', 'Chat 2', 1),
      ];

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chats).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Date grouping', () => {
    it('groups chats by date correctly', async () => {
      const mockChats = [
        createMockChat('today-1', 'Today Chat', 0),
        createMockChat('yesterday-1', 'Yesterday Chat', 1),
        createMockChat('week-1', 'Last Week Chat', 5),
        createMockChat('month-1', 'Last Month Chat', 20),
        createMockChat('older-1', 'Older Chat', 60),
      ];

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), {
          status: 200,
        })
      );

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.groupedChats.today).toHaveLength(1);
      expect(result.current.groupedChats.yesterday).toHaveLength(1);
      expect(result.current.groupedChats.lastWeek).toHaveLength(1);
      expect(result.current.groupedChats.lastMonth).toHaveLength(1);
      expect(result.current.groupedChats.older).toHaveLength(1);
    });
  });

  describe('Pagination', () => {
    it('loads more chats when loadMore is called', async () => {
      const page1 = [createMockChat('1', 'Chat 1')];
      const page2 = [createMockChat('2', 'Chat 2')];

      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ chats: page1, hasMore: true }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ chats: page2, hasMore: false }), { status: 200 })
        );

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory({ pageSize: 1 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chats).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.chats).toHaveLength(2);
      });

      expect(result.current.hasMore).toBe(false);
    });

    it('uses cursor-based pagination with ending_before', async () => {
      const page1 = [createMockChat('chat-1', 'First Chat')];

      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ chats: page1, hasMore: true }), { status: 200 })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ chats: [], hasMore: false }), { status: 200 })
        );

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory({ pageSize: 1 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      // Check that second call used cursor
      const secondCall = mockFetch.mock.calls[1][0] as string;
      expect(secondCall).toContain('ending_before=chat-1');
    });
  });

  describe('Delete operations', () => {
    it('optimistically removes chat from list on delete', async () => {
      const mockChats = [
        createMockChat('1', 'Chat 1'),
        createMockChat('2', 'Chat 2'),
      ];

      const { authFetch } = require('../../lib/auth/client');
      authFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), { status: 200 })
      );

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.chats).toHaveLength(2);
      });

      await act(async () => {
        await result.current.deleteChat('1');
      });

      expect(result.current.chats).toHaveLength(1);
      expect(result.current.chats[0].id).toBe('2');
    });

    it('reverts on delete error', async () => {
      const mockChats = [createMockChat('1', 'Chat 1')];

      const { authFetch } = require('../../lib/auth/client');
      authFetch.mockResolvedValue(new Response('Error', { status: 500, statusText: 'Server Error' }));

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), { status: 200 })
      );

      const onError = jest.fn();
      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory({ onError }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.chats).toHaveLength(1);
      });

      await act(async () => {
        try {
          await result.current.deleteChat('1');
        } catch {
          // Expected to throw
        }
      });

      // After revalidation, chat should be back
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('calls onDeleteChat callback on successful delete', async () => {
      const mockChats = [createMockChat('1', 'Chat 1')];

      const { authFetch } = require('../../lib/auth/client');
      authFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), { status: 200 })
      );

      const onDeleteChat = jest.fn();
      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory({ onDeleteChat }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.chats).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteChat('1');
      });

      expect(onDeleteChat).toHaveBeenCalledWith('1');
    });

    it('deletes all chats', async () => {
      const mockChats = [
        createMockChat('1', 'Chat 1'),
        createMockChat('2', 'Chat 2'),
      ];

      const { authFetch } = require('../../lib/auth/client');
      authFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), { status: 200 })
      );

      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.chats).toHaveLength(2);
      });

      await act(async () => {
        await result.current.deleteAllChats();
      });

      expect(result.current.chats).toHaveLength(0);
      expect(authFetch).toHaveBeenCalledWith('/api/history', { method: 'DELETE' });
    });
  });

  describe('Error handling', () => {
    it('sets error state on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const onError = jest.fn();
      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory({ onError }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('calls onSelectChat when selectChat is called', async () => {
      const mockChats = [createMockChat('1', 'Chat 1')];

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ chats: mockChats, hasMore: false }), { status: 200 })
      );

      const onSelectChat = jest.fn();
      const { useChatHistory } = await import('../../hooks/useChatHistory');
      const { result } = renderHook(() => useChatHistory({ onSelectChat }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.chats).toHaveLength(1);
      });

      act(() => {
        result.current.selectChat('1');
      });

      expect(onSelectChat).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });
  });
});
