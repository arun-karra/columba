import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

type ScreenGradientProps = ViewProps & {
  children: React.ReactNode;
};

/** Full-screen vertical gradient using the brand sky blue. */
export function ScreenGradient({ children, style, ...rest }: ScreenGradientProps) {
  const colors = useColors();

  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
