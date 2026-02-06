import { Platform } from 'react-native';

/**
 * Generate a unique ID for attachments
 */
export function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert a file URI to a base64 data URL
 * Works on both web (File/Blob) and native (file URI)
 */
export async function fileToBase64(
  fileUri: string,
  mimeType: string
): Promise<string> {
  if (Platform.OS === 'web') {
    // On web, fileUri might be a blob URL or we receive a File object
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return blobToBase64(blob);
  } else {
    // On native, use expo-file-system to read the file
    const FileSystem = require('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${mimeType};base64,${base64}`;
  }
}

/**
 * Convert a Blob to base64 data URL (web only)
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get file extension from filename or mime type
 */
export function getFileExtension(filename: string, mimeType?: string): string {
  // Try to get from filename first
  const extFromName = filename.split('.').pop()?.toLowerCase();
  if (extFromName && extFromName.length <= 5) {
    return extFromName;
  }

  // Fall back to mime type
  if (mimeType) {
    const mimeExtensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
    };
    return mimeExtensions[mimeType] || 'bin';
  }

  return 'bin';
}

/**
 * Check if a mime type is a supported image type
 */
export function isSupportedImageType(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  return supportedTypes.includes(mimeType);
}

/**
 * Get a human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Maximum file size for attachments (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
