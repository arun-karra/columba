import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppLogo } from '@/components/AppLogo';
import { NotesOnboardingIllustration } from '@/components/onboarding/NotesOnboardingIllustration';

/** Slide 1: app logo plus the original note-card hero illustration. */
export function WelcomeOnboardingIllustration() {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <View style={styles.logoBlock}>
        <AppLogo size={104} />
        <Text style={[styles.wordmark, { color: colors.primary }]}>COLUMBA</Text>
      </View>
      <View style={styles.heroBlock}>
        <NotesOnboardingIllustration />
      </View>
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
