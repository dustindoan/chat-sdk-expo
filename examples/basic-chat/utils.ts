import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function generateAPIUrl(relativePath: string) {
  let origin = '';

  if (Platform.OS === 'web') {
    origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
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
        origin = 'http://localhost:8081';
      }
    }
  }

  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  return origin + path;
}
