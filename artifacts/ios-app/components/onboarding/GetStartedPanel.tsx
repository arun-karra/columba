import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';

export function GetStartedPanel() {
  const colors = useColors();

  const content = (
    <>
      <Text style={[styles.title, { color: colors.foreground }]}>Get Started</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Your thoughts, delivered.
      </Text>
    </>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={36} tint="light" style={styles.glass}>
        {content}
      </BlurView>
    );
  }

  return (
    <View style={[styles.glass, styles.glassFallback, { backgroundColor: `${colors.card}EE` }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
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
