import React, { useEffect, useRef } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type OnboardingSlideTransitionProps = ViewProps & {
  children: React.ReactNode;
  slideKey: string | number;
  direction: 1 | -1;
};

/** Subtle horizontal slide — always visible; animates only when the slide changes. */
export function OnboardingSlideTransition({
  children,
  slideKey,
  direction,
  style,
  ...rest
}: OnboardingSlideTransitionProps) {
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const seenKeys = useRef(new Set<string | number>());

  useEffect(() => {
    const firstPaint = !seenKeys.current.has(slideKey);
    seenKeys.current.add(slideKey);

    if (firstPaint) {
      opacity.value = 1;
      translateX.value = 0;
      return;
    }

    opacity.value = 0.35;
    translateX.value = direction * 40;
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    translateX.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
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

/** Get-started screen entrance — starts visible so content is never blank. */
export function OnboardingSignInTransition({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewProps['style'];
}) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    opacity.value = 0.4;
    translateY.value = 20;
    opacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.signIn, animatedStyle, style]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  signIn: { width: '100%' },
});
