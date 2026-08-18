import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

export function OnboardingNavButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: colors.card,
          opacity: pressed ? 0.88 : 1,
          shadowColor: colors.foreground,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <AppIcon name="chevron.right" size={18} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: 999,
    paddingHorizontal: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.2,
  },
});
