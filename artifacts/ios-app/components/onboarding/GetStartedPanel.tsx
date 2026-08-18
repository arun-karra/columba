import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { AppLogo } from '@/components/AppLogo';

export function GetStartedPanel({ onLogoPress }: { onLogoPress?: () => void }) {
  const colors = useColors();

  const card = (
    <>
      <Text style={[styles.title, { color: colors.foreground }]}>Get Started</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Your thoughts, delivered.
      </Text>
    </>
  );

  return (
    <View style={styles.wrap}>
      <AppLogo size={104} onPress={onLogoPress} style={styles.logo} />
      {Platform.OS === 'ios' ? (
        <BlurView intensity={36} tint="light" style={styles.glass}>
          {card}
        </BlurView>
      ) : (
        <View style={[styles.glass, styles.glassFallback, { backgroundColor: `${colors.card}EE` }]}>
          {card}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  logo: {
    alignSelf: 'center',
  },
  glass: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    alignItems: 'center',
    gap: 8,
  },
  glassFallback: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
});
