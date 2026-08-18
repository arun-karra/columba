import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

type OnboardingBackgroundProps = ViewProps & {
  children: React.ReactNode;
  /** Soft wave blobs behind the first slide illustration */
  showWaves?: boolean;
};

export function OnboardingBackground({
  children,
  showWaves = false,
  style,
  ...rest
}: OnboardingBackgroundProps) {
  const colors = useColors();

  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={[colors.gradientEnd, '#FFFFFF', colors.gradientStart]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {showWaves ? (
        <>
          <View
            style={[
              styles.wave,
              styles.waveOne,
              { backgroundColor: `${colors.card}AA` },
            ]}
          />
          <View
            style={[
              styles.wave,
              styles.waveTwo,
              { backgroundColor: `${colors.card}77` },
            ]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wave: {
    position: 'absolute',
    borderRadius: 999,
  },
  waveOne: {
    width: 340,
    height: 340,
    bottom: -80,
    left: -60,
  },
  waveTwo: {
    width: 280,
    height: 280,
    bottom: 40,
    right: -90,
  },
});
