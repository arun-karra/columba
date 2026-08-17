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
import { AppIcon } from '@/components/AppIcon';
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

  const openEmojiKeyboard = () => {
    Haptics.selectionAsync();
    customRef.current?.focus();
  };

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
          onPress={openEmojiKeyboard}
          style={[
            styles.chip,
            styles.plusChip,
            {
              backgroundColor: colors.muted,
              borderColor: colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose any emoji"
        >
          <AppIcon name="plus" size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
      <TextInput
        ref={customRef}
        style={styles.hiddenInput}
        value=""
        onChangeText={(text) => {
          const emoji = firstEmoji(text);
          if (emoji) {
            onChange(emoji);
            customRef.current?.blur();
          }
        }}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
        caretHidden
      />
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
  plusChip: { borderStyle: 'dashed' },
  emoji: { fontSize: 22 },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
