import {
  requireAuth as _requireAuth,
  getAuthenticatedUser as _getAuthenticatedUser,
} from '@chat-sdk-expo/better-auth/server';
import { auth } from './index';

/**
 * Get the authenticated user from a request.
 * Returns null if not authenticated.
 */
export const getAuthenticatedUser = (request: Request) =>
  _getAuthenticatedUser(auth, request);

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export const requireAuth = (request: Request) =>
  _requireAuth(auth, request);
