import React from 'react';
import { View, Image, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text } from '../primitives/text';
import type { AttachmentPreviewProps } from './types';

const PREVIEW_SIZE = 64;

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  // Use useResolveClassNames for icon colors
  const mutedForegroundStyle = useResolveClassNames('text-muted-foreground');
  const foregroundStyle = useResolveClassNames('text-foreground');

  const isImage = attachment.mediaType.startsWith('image/');

  return (
    <View style={{ width: PREVIEW_SIZE }} className="relative">
      {attachment.isUploading ? (
        <View
          className="items-center justify-center rounded-lg bg-subtle"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          <ActivityIndicator size="small" color={mutedForegroundStyle.color as string} />
        </View>
      ) : isImage ? (
        <Image
          source={{ uri: attachment.url }}
          className="rounded-lg bg-subtle"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="items-center justify-center rounded-lg border border-subtle bg-subtle"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          <Feather name="file" size={24} color={mutedForegroundStyle.color as string} />
        </View>
      )}

      {onRemove && !attachment.isUploading && (
        <Pressable
          className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-destructive"
          style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
          onPress={onRemove}
          accessibilityLabel="Remove attachment"
          accessibilityRole="button"
        >
          <Feather name="x" size={12} color={foregroundStyle.color as string} />
        </Pressable>
      )}

      <View className="mt-1 px-0.5">
        <Text className="text-center text-xs text-muted-foreground" numberOfLines={1}>
          {attachment.filename}
        </Text>
      </View>
    </View>
  );
}
