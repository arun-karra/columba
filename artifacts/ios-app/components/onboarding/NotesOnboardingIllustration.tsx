import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

type NotesOnboardingIllustrationProps = {
  /** Pop the completion checkmark after the card appears (slide 1). */
  animateCheck?: boolean;
};

export function NotesOnboardingIllustration({ animateCheck = false }: NotesOnboardingIllustrationProps) {
  const colors = useColors();
  const checkScale = useSharedValue(animateCheck ? 0.5 : 1);
  const checkOpacity = useSharedValue(animateCheck ? 0.35 : 1);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animateCheck || hasAnimated.current) return;
    hasAnimated.current = true;
    checkOpacity.value = withDelay(
      320,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
    );
    checkScale.value = withDelay(
      320,
      withSpring(1, { damping: 12, stiffness: 160 }),
    );
  }, [animateCheck, checkOpacity, checkScale]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.halo, { backgroundColor: `${colors.card}88` }]}>
        <View style={[styles.noteCard, { backgroundColor: colors.card }]}>
          <View style={styles.noteTopRow}>
            <AppIcon name="square.and.pencil" size={16} color={colors.mutedForeground} />
            <AppIcon name="doc.text" size={16} color={colors.mutedForeground} />
            <View style={[styles.placeholder, { backgroundColor: colors.muted }]} />
          </View>
          <Text style={[styles.noteTitle, { color: colors.foreground }]}>
            Submit project brief
          </Text>
        </View>

        <Animated.View
          style={[
            styles.checkOuter,
            checkStyle,
            { backgroundColor: `${colors.card}AA` },
          ]}
        >
          <View style={[styles.checkInner, { backgroundColor: colors.primary }]}>
            <AppIcon name="checkmark" size={22} color={colors.primaryForeground} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  halo: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  noteCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  noteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholder: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    maxWidth: 120,
  },
  noteTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Manrope_700Bold',
  },
  checkOuter: {
    position: 'absolute',
    right: 28,
    bottom: 18,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
