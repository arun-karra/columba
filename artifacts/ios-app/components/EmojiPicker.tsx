import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { GROUP_EMOJI_OPTIONS } from '@/utils/groupEmoji';

type Props = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {GROUP_EMOJI_OPTIONS.map((emoji) => {
          const selected = value === emoji;
          return (
            <Pressable
              key={emoji}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(emoji);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.secondary : colors.muted,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    paddingLeft: 2,
  },
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  emoji: { fontSize: 22 },
});
