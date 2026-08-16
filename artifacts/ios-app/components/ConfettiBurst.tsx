/**
 * ConfettiBurst
 * A lightweight confetti particle burst built with react-native-reanimated.
 * Renders 14 particles from the origin point, flying outward + fading.
 * Controlled by the `trigger` prop — increment it to fire a new burst.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// 14 deterministic angles (radians) spread around a circle
const ANGLES = Array.from({ length: 14 }, (_, i) => (i / 14) * 2 * Math.PI);

// Playful palette
const COLORS = [
  '#34C88A', // done green
  '#F5A623', // accent orange
  '#FF6B5B', // warm coral
  '#5BB8F5', // sky blue
  '#9B8FE8', // lavender
  '#FFCC44', // sunny yellow
  '#FF85A1', // pink
];

// Distance & size per particle
const DISTANCES = [72, 58, 80, 65, 78, 55, 70, 85, 60, 74, 52, 82, 68, 76];
const SIZES = [7, 5, 6, 8, 5, 7, 6, 5, 8, 6, 7, 5, 6, 7];

interface ConfettiBurstProps {
  trigger: number;          // increment to fire
  onDone?: () => void;
  size?: number;            // container size (default 200)
}

function Particle({
  angle,
  dist,
  size,
  color,
  delayMs,
  trigger,
}: {
  angle: number;
  dist: number;
  size: number;
  color: string;
  delayMs: number;
  trigger: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (trigger === 0) return;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const duration = 620;

    tx.value = 0;
    ty.value = 0;
    opacity.value = 0;
    scale.value = 0.3;

    const fadeInMs = 80;
    // Hold at full opacity after fade-in, then fade out — all in one withSequence so
    // the second assignment never cancels the first.
    const holdMs = Math.max(0, Math.round(duration * 0.45) - fadeInMs);
    const fadeOutMs = Math.round(duration * 0.55);
    opacity.value = withDelay(
      delayMs,
      withSequence(
        withTiming(1, { duration: fadeInMs, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: holdMs }),         // hold
        withTiming(0, { duration: fadeOutMs, easing: Easing.in(Easing.quad) }),
      ),
    );

    scale.value = withDelay(delayMs, withTiming(1, { duration: 160, easing: Easing.out(Easing.back(1.5)) }));
    tx.value = withDelay(delayMs, withTiming(dx, { duration, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(delayMs, withTiming(dy, { duration, easing: Easing.out(Easing.cubic) }));
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          // start at center
          marginLeft: -(size / 2),
          marginTop: -(size / 2),
        },
        style,
      ]}
    />
  );
}

export function ConfettiBurst({ trigger, onDone, size = 200 }: ConfettiBurstProps) {
  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      pointerEvents="none"
    >
      {ANGLES.map((angle, i) => (
        <Particle
          key={i}
          angle={angle}
          dist={DISTANCES[i]}
          size={SIZES[i]}
          color={COLORS[i % COLORS.length]}
          delayMs={i * 18}
          trigger={trigger}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
  },
});
