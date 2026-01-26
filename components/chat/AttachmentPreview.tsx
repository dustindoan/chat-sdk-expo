import React from 'react';
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import type { AttachmentPreviewProps } from './types';

const PREVIEW_SIZE = 64;

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const styles = getStyles();
  const isImage = attachment.mediaType.startsWith('image/');

  return (
    <View style={styles.container}>
      {attachment.isUploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        </View>
      ) : isImage ? (
        <Image
          source={{ uri: attachment.url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fileContainer}>
          <Feather name="file" size={24} color={colors.mutedForeground} />
        </View>
      )}

      {onRemove && !attachment.isUploading && (
        <Pressable
          style={[
            styles.removeButton,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={onRemove}
          accessibilityLabel="Remove attachment"
          accessibilityRole="button"
        >
          <Feather name="x" size={12} color={colors.foreground} />
        </Pressable>
      )}

      <View style={styles.filenameContainer}>
        <Text className="text-center text-xs text-muted-foreground" numberOfLines={1}>
          {attachment.filename}
        </Text>
      </View>
    </View>
  );
}

// Lazy-initialized styles to avoid module evaluation order issues with colors import
let _styles: ReturnType<typeof createStyles> | null = null;

function getStyles() {
  if (!_styles) {
    _styles = createStyles();
  }
  return _styles;
}

function createStyles() {
  return StyleSheet.create({
    container: {
      width: PREVIEW_SIZE,
      position: 'relative',
    },
    image: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      borderRadius: 8,
      backgroundColor: colors.subtle,
    },
    loadingContainer: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      borderRadius: 8,
      backgroundColor: colors.subtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fileContainer: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      borderRadius: 8,
      backgroundColor: colors.subtle,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.subtle,
    },
    removeButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.destructive,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    filenameContainer: {
      marginTop: 4,
      paddingHorizontal: 2,
    },
  });
}
