import React, { useState } from 'react';
import { View, Image, Pressable, Dimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text } from '../primitives/text';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '../primitives/dialog';
import type { ImagePreviewProps } from './types';

const THUMBNAIL_SIZE = 200;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImagePreview({ url, filename }: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);

  // Use useResolveClassNames for icon colors
  const tertiaryStyle = useResolveClassNames('text-tertiary');

  if (imageError) {
    return (
      <View
        className="my-1 items-center justify-center rounded-xl border border-subtle bg-subtle"
        style={{ width: THUMBNAIL_SIZE, height: 100 }}
      >
        <Feather name="image" size={24} color={tertiaryStyle.color as string} />
        <Text className="mt-1 text-xs text-muted-foreground">Failed to load image</Text>
      </View>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Pressable
          className="my-1 overflow-hidden rounded-xl bg-subtle"
          style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
          accessibilityLabel={`View ${filename || 'image'} full size`}
          accessibilityRole="button"
        >
          <Image
            source={{ uri: url }}
            className="rounded-xl"
            style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
          {filename && (
            <View
              className="absolute bottom-0 left-0 right-0 px-2 py-1"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            >
              <Text className="text-xs text-foreground" numberOfLines={1}>
                {filename}
              </Text>
            </View>
          )}
        </Pressable>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] border-none bg-black/95 p-0 sm:max-w-[90vw]">
        <View
          className="w-full items-center justify-center p-4"
          style={{ minHeight: 300 }}
        >
          <Image
            source={{ uri: url }}
            style={{ width: SCREEN_WIDTH * 0.85, height: SCREEN_HEIGHT * 0.7 }}
            resizeMode="contain"
          />
        </View>
      </DialogContent>
    </Dialog>
  );
}
