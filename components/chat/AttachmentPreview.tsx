import React from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { AttachmentPreviewProps } from './types';

const PREVIEW_SIZE = 64;

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const isImage = attachment.mediaType.startsWith('image/');

  return (
    <View style={styles.container}>
      {attachment.isUploading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text.secondary} />
        </View>
      ) : isImage ? (
        <Image
          source={{ uri: attachment.url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.fileContainer}>
          <Feather name="file" size={24} color={colors.text.secondary} />
        </View>
      )}

      {onRemove && !attachment.isUploading && (
        <TouchableOpacity
          style={[
            styles.removeButton,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          onPress={onRemove}
          accessibilityLabel="Remove attachment"
          accessibilityRole="button"
        >
          <Feather name="x" size={12} color={colors.text.primary} />
        </TouchableOpacity>
      )}

      <View style={styles.filenameContainer}>
        <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
          {attachment.filename}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: PREVIEW_SIZE,
    position: 'relative',
  },
  image: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
  },
  loadingContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  filenameContainer: {
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  filename: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
