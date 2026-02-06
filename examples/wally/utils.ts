import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function generateAPIUrl(relativePath: string) {
  let origin = '';

  if (Platform.OS === 'web') {
    origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8082';
  } else {
    // On native, use experienceUrl or fallback to localhost
    const expUrl = Constants.experienceUrl;
    if (expUrl) {
      origin = expUrl.replace('exp://', 'http://');
    } else {
      // Fallback - try to get from manifest
      const hostUri = Constants.expoConfig?.hostUri;
      if (hostUri) {
        origin = `http://${hostUri}`;
      } else {
        origin = 'http://localhost:8082';
      }
    }
  }

  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === 'development') {
    // In development on web, use the current window location (Expo serves API on same port)
    // On native, replace port with 8082 (Wally's configured port)
    if (Platform.OS === 'web') {
      return origin + path;
    }
    return origin.replace(/:\d+/, ':8082') + path;
  }

  return origin + path;
}
