/**
 * Tests for SWR utilities
 *
 * Tests:
 * - authFetcher success and error handling
 * - APIError class
 */

import { Platform } from 'react-native';

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web || obj.default),
}));

describe('SWR Utilities', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (Platform as any).OS = 'web';
  });

  describe('APIError', () => {
    it('creates error with code, status, and cause', async () => {
      const { APIError } = await import('../../lib/swr');

      const error = new APIError('INVALID_INPUT', 400, 'Email is required');

      expect(error.code).toBe('INVALID_INPUT');
      expect(error.status).toBe(400);
      expect(error.cause).toBe('Email is required');
      expect(error.message).toBe('Email is required');
      expect(error.name).toBe('APIError');
    });

    it('uses code as message when cause not provided', async () => {
      const { APIError } = await import('../../lib/swr');

      const error = new APIError('NOT_FOUND', 404);

      expect(error.message).toBe('NOT_FOUND');
      expect(error.cause).toBeUndefined();
    });
  });

  describe('authFetcher', () => {
    it('returns JSON data on success', async () => {
      const mockData = { chats: [], hasMore: false };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const { authFetcher } = await import('../../lib/swr');
      const result = await authFetcher('/api/history');

      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith('/api/history', expect.objectContaining({
        credentials: 'include',
      }));
    });

    it('throws APIError on non-ok response with JSON error body', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'Not logged in' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const { authFetcher, APIError } = await import('../../lib/swr');

      await expect(authFetcher('/api/history')).rejects.toThrow(APIError);

      try {
        await authFetcher('/api/history');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as any).code).toBe('UNAUTHORIZED');
        expect((error as any).status).toBe(401);
        expect((error as any).cause).toBe('Not logged in');
      }
    });

    it('throws APIError with HTTP status code when response is not JSON', async () => {
      mockFetch.mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        })
      );

      const { authFetcher, APIError } = await import('../../lib/swr');

      await expect(authFetcher('/api/history')).rejects.toThrow(APIError);

      try {
        await authFetcher('/api/history');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as any).code).toBe('HTTP_500');
        expect((error as any).status).toBe(500);
      }
    });

    it('includes cookie header on native platforms', async () => {
      (Platform as any).OS = 'ios';

      // Mock SecureStore
      const SecureStore = require('expo-secure-store');
      SecureStore.getItemAsync.mockResolvedValue('test-token');

      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      );

      jest.resetModules();
      const { authFetcher } = await import('../../lib/swr');
      await authFetcher('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        credentials: 'omit',
        headers: expect.objectContaining({
          Cookie: 'better-auth.session_token=test-token',
        }),
      }));
    });
  });
});
