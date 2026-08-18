import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function OnboardingPageIndicator({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  const colors = useColors();

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, index) => {
        const active = index === activeIndex;
        return (
          <View
            key={index}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              active ? styles.active : styles.dot,
              {
                backgroundColor: active ? colors.foreground : colors.secondary,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.85,
  },
  active: {
    width: 28,
    height: 8,
    borderRadius: 4,
  },
});
