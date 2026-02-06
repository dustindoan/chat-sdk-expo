import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Animated, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useResolveClassNames } from 'uniwind';
import { Text } from '@/components/ui/text';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

const AUTO_CLOSE_DELAY = 500;

interface ReasoningProps {
  text: string;
  isStreaming?: boolean;
  defaultOpen?: boolean;
}

export const Reasoning = memo(function Reasoning({
  text,
  isStreaming = false,
  defaultOpen = true,
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [duration, setDuration] = useState(0);
  const [hasAutoClosed, setHasAutoClosed] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rotateAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  // Use useResolveClassNames for icon colors
  const tertiaryStyle = useResolveClassNames('text-tertiary');

  // Track duration when streaming
  useEffect(() => {
    if (isStreaming) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
    } else if (startTimeRef.current !== null) {
      setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      startTimeRef.current = null;
    }
  }, [isStreaming]);

  // Auto-close when streaming ends (once only)
  useEffect(() => {
    if (defaultOpen && !isStreaming && isOpen && !hasAutoClosed && duration > 0) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasAutoClosed(true);
      }, AUTO_CLOSE_DELAY);

      return () => clearTimeout(timer);
    }
  }, [isStreaming, isOpen, defaultOpen, hasAutoClosed, duration]);

  // Animate chevron rotation
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const hasContent = text?.trim().length > 0;
  if (!hasContent && !isStreaming) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <CollapsibleTrigger
        className="flex-row items-center gap-1 py-0.5 px-1.5 rounded-md self-start"
        style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : undefined}
      >
        <Feather name="cpu" size={12} color={tertiaryStyle.color as string} />
        <Text className="text-[11px] text-muted-foreground">
          {isStreaming || duration === 0 ? 'Thinking' : `${duration}s`}
        </Text>
        {isStreaming && <ShimmerDots />}
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Feather name="chevron-down" size={10} color={tertiaryStyle.color as string} />
        </Animated.View>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1.5 rounded-md border border-border/50 bg-secondary/30 overflow-hidden">
        <ScrollView
          className="max-h-48"
          contentContainerClassName="p-2.5"
          showsVerticalScrollIndicator={true}
        >
          <Text className="text-[11px] leading-relaxed text-muted-foreground">{text}</Text>
        </ScrollView>
      </CollapsibleContent>
    </Collapsible>
  );
});

// Shimmer dots animation for streaming state
function ShimmerDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 200);
    const anim3 = animateDot(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View className="flex-row -ml-1">
      <Animated.View style={{ opacity: dot1 }}>
        <Text className="text-[11px] text-muted-foreground font-bold">.</Text>
      </Animated.View>
      <Animated.View style={{ opacity: dot2 }}>
        <Text className="text-[11px] text-muted-foreground font-bold">.</Text>
      </Animated.View>
      <Animated.View style={{ opacity: dot3 }}>
        <Text className="text-[11px] text-muted-foreground font-bold">.</Text>
      </Animated.View>
    </View>
  );
}
