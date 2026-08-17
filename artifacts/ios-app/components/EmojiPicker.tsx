import React, { useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { GROUP_EMOJI_OPTIONS } from '@/utils/groupEmoji';

type Props = {
  value: string;
  onChange: (emoji: string) => void;
};

function firstEmoji(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return [...trimmed][0] ?? '';
}

export function EmojiPicker({ value, onChange }: Props) {
  const colors = useColors();
  const customRef = useRef<TextInput>(null);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>Icon</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
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
        <Pressable
          onPress={() => customRef.current?.focus()}
          style={[
            styles.chip,
            styles.customChip,
            {
              backgroundColor: colors.muted,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.customChipText, { color: colors.primary }]}>⌨️</Text>
        </Pressable>
      </ScrollView>
      <Pressable
        onPress={() => customRef.current?.focus()}
        style={[
          styles.customField,
          {
            backgroundColor: colors.secondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.customPreview}>{value || '🙂'}</Text>
        <TextInput
          ref={customRef}
          style={[styles.customInput, { color: colors.foreground }]}
          value={value}
          onChangeText={(text) => {
            const emoji = firstEmoji(text);
            if (emoji) onChange(emoji);
          }}
          placeholder="Type any emoji"
          placeholderTextColor={colors.mutedForeground}
          maxLength={8}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
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
  customChip: { borderStyle: 'dashed' },
  customChipText: { fontSize: 18 },
  emoji: { fontSize: 22 },
  customField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  customPreview: { fontSize: 24, lineHeight: 28 },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 0,
  },
});
