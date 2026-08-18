import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { AppIcon } from '@/components/AppIcon';

export function OnboardingTopNav({
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  const colors = useColors();

  const hit = (fn: () => void) => {
    Haptics.selectionAsync();
    fn();
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => canGoBack && hit(onBack)}
        disabled={!canGoBack}
        style={[styles.btn, { opacity: canGoBack ? 1 : 0.25 }]}
        accessibilityRole="button"
        accessibilityLabel="Previous slide"
      >
        <AppIcon name="chevron.left" size={22} color={colors.foreground} />
      </Pressable>

      <Pressable
        onPress={() => canGoForward && hit(onForward)}
        disabled={!canGoForward}
        style={[styles.btn, { opacity: canGoForward ? 1 : 0.25 }]}
        accessibilityRole="button"
        accessibilityLabel="Next slide"
      >
        <AppIcon name="chevron.right" size={22} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 4,
  },
  btn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
