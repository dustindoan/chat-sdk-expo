import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import type { ImagePreviewProps } from './types';

const THUMBNAIL_SIZE = 200;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ImagePreview({ url, filename }: ImagePreviewProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="image" size={24} color={colors.text.tertiary} />
        <Text style={styles.errorText}>Failed to load image</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsModalVisible(true)}
        style={[
          styles.container,
          Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
        ]}
        activeOpacity={0.8}
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
            <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
              {filename}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Image
              source={{ uri: url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={[
                styles.closeButton,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close image"
              accessibilityRole="button"
            >
              <Feather name="x" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background.tertiary,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: borderRadius.lg,
  },
  filenameContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  filename: {
    fontSize: fontSize.xs,
    color: colors.text.primary,
  },
  errorContainer: {
    width: THUMBNAIL_SIZE,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
