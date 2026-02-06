/**
 * Tests for auth client utilities
 *
 * Tests:
 * - getAuthCookie on web vs native platforms
 * - authFetch header handling
 * - authFetchWithRetry 401 handling
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Mock Platform before importing the module
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'web',
  select: jest.fn((obj) => obj.web || obj.default),
}));

// We need to use dynamic import to test with different Platform values
describe('Auth Client', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getAuthCookie', () => {
    it('returns null on web platform (cookies handled automatically)', async () => {
      // Set Platform to web
      (Platform as any).OS = 'web';

      const { getAuthCookie } = await import('../../lib/auth/client');
      const cookie = await getAuthCookie();

      expect(cookie).toBeNull();
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('retrieves token from SecureStore on native platform', async () => {
      // Set Platform to iOS
      (Platform as any).OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token-123');

      // Need to re-import to pick up Platform change
      jest.resetModules();
      const { getAuthCookie } = await import('../../lib/auth/client');
      const cookie = await getAuthCookie();

      expect(cookie).toBe('better-auth.session_token=test-token-123');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('ai-chat-app.better-auth.session_token');
    });

    it('returns null when no token stored on native', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      jest.resetModules();
      const { getAuthCookie } = await import('../../lib/auth/client');
      const cookie = await getAuthCookie();

      expect(cookie).toBeNull();
    });

    it('handles SecureStore errors gracefully', async () => {
      (Platform as any).OS = 'ios';
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Storage error'));

      jest.resetModules();
      const { getAuthCookie } = await import('../../lib/auth/client');
      const cookie = await getAuthCookie();

      expect(cookie).toBeNull();
    });
  });

  describe('authFetch', () => {
    beforeEach(() => {
      (Platform as any).OS = 'web';
      jest.resetModules();
    });

    it('includes credentials on web', async () => {
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      const { authFetch } = await import('../../lib/auth/client');
      await authFetch('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        credentials: 'include',
      }));
    });

    it('passes custom options through', async () => {
      mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));

      const { authFetch } = await import('../../lib/auth/client');
      await authFetch('/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }));
    });
  });

  describe('authFetchWithRetry', () => {
    beforeEach(() => {
      (Platform as any).OS = 'web';
      jest.resetModules();
    });

    it('returns response directly on success', async () => {
      const successResponse = new Response('{"success": true}', { status: 200 });
      mockFetch.mockResolvedValue(successResponse);

      const { authFetchWithRetry } = await import('../../lib/auth/client');
      const onUnauthorized = jest.fn();

      const response = await authFetchWithRetry('/api/test', {}, onUnauthorized);

      expect(response.status).toBe(200);
      expect(onUnauthorized).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 401 when onUnauthorized is provided', async () => {
      const unauthorizedResponse = new Response('Unauthorized', { status: 401 });
      const successResponse = new Response('{"success": true}', { status: 200 });

      mockFetch
        .mockResolvedValueOnce(unauthorizedResponse)
        .mockResolvedValueOnce(successResponse);

      const { authFetchWithRetry } = await import('../../lib/auth/client');
      const onUnauthorized = jest.fn().mockResolvedValue(undefined);

      const response = await authFetchWithRetry('/api/test', {}, onUnauthorized);

      expect(response.status).toBe(200);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('returns 401 when no onUnauthorized callback provided', async () => {
      const unauthorizedResponse = new Response('Unauthorized', { status: 401 });
      mockFetch.mockResolvedValue(unauthorizedResponse);

      const { authFetchWithRetry } = await import('../../lib/auth/client');

      const response = await authFetchWithRetry('/api/test');

      expect(response.status).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
