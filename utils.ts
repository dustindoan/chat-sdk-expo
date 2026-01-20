import Constants from 'expo-constants';

export function generateAPIUrl(relativePath: string) {
  const origin =
    Constants.experienceUrl?.replace('exp://', 'http://') ??
    (typeof window !== 'undefined' ? window.location.origin : '');

  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  if (process.env.NODE_ENV === 'development') {
    // In development, use the Expo dev server
    return origin.replace(/:\d+/, ':8081') + path;
  }

  return origin + path;
}
