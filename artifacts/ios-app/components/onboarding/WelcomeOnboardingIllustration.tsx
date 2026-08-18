import React, { useEffect } from 'react';
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

export function WelcomeOnboardingIllustration() {
  const colors = useColors();
  const logoScale = useSharedValue(0.82);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, [logoOpacity, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <AppLogo size={112} />
        <Text style={[styles.wordmark, { color: colors.primary }]}>COLUMBA</Text>
      </Animated.View>
      <View style={styles.previewWrap}>
        <NotesOnboardingIllustration compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 2.4,
  },
  previewWrap: {
    width: '100%',
    maxHeight: 220,
    transform: [{ scale: 0.88 }],
  },
});
