import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TapScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. Defaults to the mockup's 0.94. */
  pressedScale?: number;
}

/**
 * Pressable that scales down on press-in and springs back on release —
 * the "satisfying haptic-style tap feedback" from the mockup's
 * `tapfeedback` keyframe, applied to primary CTAs.
 */
export function TapScale({ style, pressedScale = 0.94, onPressIn, onPressOut, ...rest }: TapScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(pressedScale, { damping: 16, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        onPressOut?.(e);
      }}
      {...rest}
    />
  );
}
