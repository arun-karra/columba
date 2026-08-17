import React, { useCallback } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

const THUMB_SIZE = 44;
const TRACK_HEIGHT = 52;
const COMPLETE_RATIO = 0.82;

type Props = {
  label?: string;
  disabled?: boolean;
  onComplete: () => void;
};

export function SlideToComplete({
  label = 'Slide to complete',
  disabled = false,
  onComplete,
}: Props) {
  const colors = useColors();
  const trackWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const completed = useSharedValue(false);

  const fireComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [onComplete]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      if (completed.value) return;
      const max = Math.max(trackWidth.value - THUMB_SIZE - 8, 0);
      translateX.value = Math.min(Math.max(0, e.translationX), max);
    })
    .onEnd(() => {
      if (completed.value) return;
      const max = Math.max(trackWidth.value - THUMB_SIZE - 8, 0);
      if (max > 0 && translateX.value >= max * COMPLETE_RATIO) {
        completed.value = true;
        translateX.value = withSpring(max, { damping: 18, stiffness: 220 });
        runOnJS(fireComplete)();
        return;
      }
      translateX.value = withSpring(0, { damping: 16, stiffness: 180 });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const hintStyle = useAnimatedStyle(() => {
    const max = Math.max(trackWidth.value - THUMB_SIZE - 8, 1);
    return {
      opacity: 1 - Math.min(translateX.value / max, 1) * 0.65,
    };
  });

  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
      onLayout={onTrackLayout}
    >
      <Animated.Text
        style={[styles.hint, { color: colors.mutedForeground }, hintStyle]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: colors.card, borderColor: colors.border },
            thumbStyle,
          ]}
        >
          <View style={styles.chevrons}>
            <AppIcon name="chevron.right" size={15} color={colors.primary} />
            <AppIcon name="chevron.right" size={15} color={colors.primary} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hint: {
    alignSelf: 'center',
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    paddingHorizontal: THUMB_SIZE + 12,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  chevrons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 28,
    justifyContent: 'center',
  },
});
