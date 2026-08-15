import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

const PIECE_COUNT = 14;
const LIFETIME_MS = 900;

function ConfettiPiece({ color, left, delay }: { color: string; left: number; delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: LIFETIME_MS - delay, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * 140 },
      { rotate: `${progress.value * 220}deg` },
    ],
    opacity: 1 - progress.value,
  }));

  return (
    <Animated.View
      style={[styles.piece, { backgroundColor: color, left, top: 0 }, style]}
    />
  );
}

function Toast() {
  const colors = useColors();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.08, { duration: 240 }),
      withTiming(1, { duration: 160 }),
    );
    opacity.value = withTiming(1, { duration: 240 });
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, { backgroundColor: colors.primary }, style]}>
      <Text style={[styles.toastText, { color: colors.primaryForeground }]}>
        Nice work! 🎉
      </Text>
    </Animated.View>
  );
}

/**
 * Confetti burst + "Nice work!" toast, fired when a note is marked done.
 * Mount once per screen; call `key={fireCount}` remount pattern via the
 * `trigger` prop to re-fire (bump a counter each time a note completes).
 */
export function Confetti({ trigger }: { trigger: number }) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);

  const confettiColors = useMemo(
    () => [colors.primary, colors.accent, colors.groupTertiary],
    [colors],
  );

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        key: `${trigger}-${i}`,
        color: confettiColors[i % confettiColors.length],
        left: (i - PIECE_COUNT / 2) * 14 + (i % 2 === 0 ? 4 : -4),
        delay: (i % 5) * 40,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger],
  );

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), LIFETIME_MS);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.anchor}>
        {pieces.map((p) => (
          <ConfettiPiece key={p.key} color={p.color} left={p.left} delay={p.delay} />
        ))}
        <Toast />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  anchor: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: [{ translateX: -60 }],
    alignItems: 'center',
  },
  piece: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  toastText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
});
