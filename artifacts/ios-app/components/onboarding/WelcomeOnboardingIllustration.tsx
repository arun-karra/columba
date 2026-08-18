import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { AppLogo } from '@/components/AppLogo';
import { NotesOnboardingIllustration } from '@/components/onboarding/NotesOnboardingIllustration';

/** Slide 1: app logo plus the note-card hero illustration. */
export function WelcomeOnboardingIllustration() {
  const colors = useColors();
  const logoScale = useSharedValue(0.86);
  const logoOpacity = useSharedValue(0.45);
  const heroOpacity = useSharedValue(0.45);
  const heroTranslateY = useSharedValue(22);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    logoOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
    heroOpacity.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
    heroTranslateY.value = withSpring(0, { damping: 16, stiffness: 130 });
  }, [heroOpacity, heroTranslateY, logoOpacity, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.logoBlock, logoStyle]}>
        <AppLogo size={104} />
        <Text style={[styles.wordmark, { color: colors.primary }]}>COLUMBA</Text>
      </Animated.View>
      <Animated.View style={[styles.heroBlock, heroStyle]}>
        <NotesOnboardingIllustration animateCheck />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
  },
  logoBlock: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    paddingBottom: 8,
  },
  wordmark: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 2.4,
  },
  heroBlock: {
    flex: 1,
    minHeight: 240,
    width: '100%',
  },
});
