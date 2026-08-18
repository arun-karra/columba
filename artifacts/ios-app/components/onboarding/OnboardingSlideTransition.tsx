import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type OnboardingSlideTransitionProps = ViewProps & {
  children: React.ReactNode;
  /** Unique key per slide — triggers enter animation */
  slideKey: string | number;
  /** 1 = forward, -1 = back */
  direction: 1 | -1;
};

export function OnboardingSlideTransition({
  children,
  slideKey,
  direction,
  style,
  ...rest
}: OnboardingSlideTransitionProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(direction * 48);

  useEffect(() => {
    opacity.value = 0;
    translateX.value = direction * 48;
    opacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    translateX.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [slideKey, direction, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.fill, animatedStyle, style]} {...rest}>
      {children}
    </Animated.View>
  );
}

/** Fade + rise for the get-started screen */
export function OnboardingSignInTransition({
  children,
  visible,
  style,
}: {
  children: React.ReactNode;
  visible: boolean;
  style?: ViewProps['style'];
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    if (!visible) return;
    opacity.value = 0;
    translateY.value = 24;
    opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [visible, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.fill, animatedStyle, style]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
