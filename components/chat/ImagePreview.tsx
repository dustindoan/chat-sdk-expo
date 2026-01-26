import React, { useState } from 'react';
import { View, Image, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { colors } from '@/lib/theme';
import type { ImagePreviewProps } from './types';

const THUMBNAIL_SIZE = 200;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImagePreview({ url, filename }: ImagePreviewProps) {
  const styles = getStyles();
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="image" size={24} color={colors.tertiary} />
        <Text className="mt-1 text-xs text-muted-foreground">Failed to load image</Text>
      </View>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Pressable
          style={[
            styles.container,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
          accessibilityLabel={`View ${filename || 'image'} full size`}
          accessibilityRole="button"
        >
          <Image
            source={{ uri: url }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
          {filename && (
            <View style={styles.filenameContainer}>
              <Text className="text-xs text-foreground" numberOfLines={1}>
                {filename}
              </Text>
            </View>
          )}
        </Pressable>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] bg-black/95 border-none p-0 sm:max-w-[90vw]">
        <View style={styles.modalContent}>
          <Image
            source={{ uri: url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </DialogContent>
    </Dialog>
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
      marginVertical: 4,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.subtle,
    },
    thumbnail: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: 12,
    },
    filenameContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    errorContainer: {
      width: THUMBNAIL_SIZE,
      height: 100,
      borderRadius: 12,
      backgroundColor: colors.subtle,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.subtle,
      marginVertical: 4,
    },
    modalContent: {
      width: '100%',
      minHeight: 300,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    fullImage: {
      width: SCREEN_WIDTH * 0.85,
      height: SCREEN_HEIGHT * 0.7,
    },
  });
}
