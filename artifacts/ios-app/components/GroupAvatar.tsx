import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

type Props = {
  emoji?: string | null;
  fallbackInitials: string;
  size?: number;
  backgroundColor?: string | null;
};

export function GroupAvatar({ emoji, fallbackInitials, size = 44, backgroundColor }: Props) {
  const colors = useColors();
  const fontSize = size >= 56 ? 28 : size >= 44 ? 22 : 16;
  const fill = emoji
    ? (backgroundColor ?? colors.secondary)
    : colors.primary;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
        },
      ]}
    >
      {emoji ? (
        <Text style={[styles.emoji, { fontSize: fontSize + 2 }]}>{emoji}</Text>
      ) : (
        <Text
          style={[
            styles.initials,
            { color: colors.primaryForeground, fontSize },
          ]}
        >
          {fallbackInitials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { lineHeight: 28 },
  initials: { fontFamily: 'Manrope_700Bold' },
});
