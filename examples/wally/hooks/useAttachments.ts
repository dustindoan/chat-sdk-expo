import { useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Attachment, FilePart } from '../components/chat/types';
import {
  fileToBase64,
  generateAttachmentId,
  isSupportedImageType,
  MAX_FILE_SIZE,
  formatFileSize,
} from '../lib/files';

export interface UseAttachmentsResult {
  attachments: Attachment[];
  addAttachment: () => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  toFileParts: () => FilePart[];
}

export function useAttachments(): UseAttachmentsResult {
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to attach images.'
        );
        return false;
      }
    }
    return true;
  }, []);

  const addAttachment = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: Platform.OS === 'web', // Get base64 directly on web
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      for (const asset of result.assets) {
        const id = generateAttachmentId();
        const filename = asset.fileName || `image-${id}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        // Check file type
        if (!isSupportedImageType(mimeType)) {
          Alert.alert(
            'Unsupported File Type',
            `${filename} is not a supported image type. Please use JPEG, PNG, GIF, or WebP.`
          );
          continue;
        }

        // Check file size (if available)
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
          Alert.alert(
            'File Too Large',
            `${filename} is ${formatFileSize(asset.fileSize)}. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
          );
          continue;
        }

        // Add placeholder while loading
        setAttachments((prev) => [
          ...prev,
          {
            id,
            filename,
            mediaType: mimeType,
            url: '',
            isUploading: true,
          },
        ]);

        try {
          // Convert to base64
          let dataUrl: string;
          if (Platform.OS === 'web' && asset.base64) {
            dataUrl = `data:${mimeType};base64,${asset.base64}`;
          } else {
            dataUrl = await fileToBase64(asset.uri, mimeType);
          }

          // Update with actual data
          setAttachments((prev) =>
            prev.map((att) =>
              att.id === id
                ? { ...att, url: dataUrl, isUploading: false }
                : att
            )
          );
        } catch (error) {
          console.error('Failed to convert image to base64:', error);
          // Remove failed attachment
          setAttachments((prev) => prev.filter((att) => att.id !== id));
          Alert.alert('Error', `Failed to load ${filename}`);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  }, [requestPermissions]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  const toFileParts = useCallback((): FilePart[] => {
    return attachments
      .filter((att) => !att.isUploading && att.url)
      .map((att) => ({
        type: 'file' as const,
        mediaType: att.mediaType,
        filename: att.filename,
        url: att.url,
      }));
  }, [attachments]);

  return {
    attachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    toFileParts,
  };
}
