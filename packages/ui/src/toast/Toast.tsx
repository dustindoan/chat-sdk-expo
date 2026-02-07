import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResolveClassNames } from 'uniwind';
import { Text } from '../primitives/text';
import { Button } from '../primitives/button';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
}

const TOAST_ICONS: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
};

// Map toast types to Tailwind color classes
const TOAST_BORDER_CLASS: Record<ToastType, string> = {
  success: 'border-l-success',
  error: 'border-l-destructive',
  info: 'border-l-info',
};

// Map toast types to Tailwind text color classes for icon
const TOAST_ICON_CLASS: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-destructive',
  info: 'text-info',
};

export function Toast({ message, type, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  // Get icon colors using useResolveClassNames
  const iconColorStyle = useResolveClassNames(TOAST_ICON_CLASS[type]);
  const tertiaryStyle = useResolveClassNames('text-tertiary');

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      className="absolute left-4 right-4 z-[9999] items-center"
      style={{
        top: insets.top + 12,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View
        className={`max-w-[400px] flex-row items-center gap-2 rounded-lg border-l-[3px] bg-secondary px-4 py-3 shadow-lg ${TOAST_BORDER_CLASS[type]}`}
        style={Platform.select({
          web: {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
          default: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          },
        })}
      >
        <Feather
          name={TOAST_ICONS[type]}
          size={18}
          color={iconColorStyle.color as string}
        />
        <Text className="flex-1 text-sm font-medium">{message}</Text>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onPress={handleDismiss}
        >
          <Feather name="x" size={16} color={tertiaryStyle.color as string} />
        </Button>
      </View>
    </Animated.View>
  );
}
